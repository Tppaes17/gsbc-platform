import "server-only";
import { formatCurrencyBRL, formatDateBR } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarDecisaoPolicy } from "@/lib/policies/log";
import type { WorkItemTipo } from "@/types/database.types";
import { criarWorkItemSeNaoExiste } from "./work-items";

type AdminClient = ReturnType<typeof createAdminClient>;

const STATUS_COBRANCA_NAO_GERA_PENDENCIA = new Set([
  "paid",
  "agreement_reached",
  "cancelled",
  "closed",
  "legal_escalation",
  "suspended",
  "contestada",
]);

const DIAS_NEGOCIACAO_PARADA = 7;

export interface SyncResultado {
  pagamentosVencidosAbertos: number;
  pagamentosVencidosResolvidos: number;
  negociacoesParadasAbertas: number;
  negociacoesParadasResolvidas: number;
  contestacoesPendentesAbertas: number;
  contestacoesPendentesResolvidas: number;
  acordosInadimplentesAbertos: number;
  acordosInadimplentesResolvidos: number;
}

/**
 * Work items "state-derived" (STG-03): computados a partir do estado
 * atual de cobrancas/negociacoes, não de um evento pontual. Diferente
 * dos event-driven (criados direto em collection/engine.ts), esses
 * precisam ser fechados sozinhos quando a condição deixa de valer — um
 * pagamento vencido não é mais um pagamento vencido depois de pago, sem
 * precisar de uma ação humana pra "descartar" o item.
 */
export async function syncWorkItemsFromState(): Promise<SyncResultado> {
  const supabase = createAdminClient();
  const resultado: SyncResultado = {
    pagamentosVencidosAbertos: 0,
    pagamentosVencidosResolvidos: 0,
    negociacoesParadasAbertas: 0,
    negociacoesParadasResolvidas: 0,
    contestacoesPendentesAbertas: 0,
    contestacoesPendentesResolvidas: 0,
    acordosInadimplentesAbertos: 0,
    acordosInadimplentesResolvidos: 0,
  };

  await syncPagamentosVencidos(supabase, resultado);
  await syncNegociacoesParadas(supabase, resultado);
  await syncContestacoesPendentes(supabase, resultado);
  await syncAcordosInadimplentes(supabase, resultado);

  return resultado;
}

async function fecharItensQueNaoValemMais(
  supabase: AdminClient,
  tipo: WorkItemTipo,
  idsAindaValidos: Set<string>,
  resultado: SyncResultado,
  contador:
    | "pagamentosVencidosResolvidos"
    | "negociacoesParadasResolvidas"
    | "contestacoesPendentesResolvidas"
    | "acordosInadimplentesResolvidos",
) {
  const { data: abertos } = await supabase
    .from("work_items")
    .select("id, entity_id")
    .eq("tipo", tipo)
    .in("status", ["aberto", "adiado"]);

  for (const item of abertos ?? []) {
    if (!idsAindaValidos.has(item.entity_id)) {
      await supabase
        .from("work_items")
        .update({ status: "cancelado", resolved_at: new Date().toISOString() })
        .eq("id", item.id);
      resultado[contador]++;
    }
  }
}

async function syncPagamentosVencidos(supabase: AdminClient, resultado: SyncResultado) {
  const hoje = new Date().toISOString().slice(0, 10);

  const { data: cobrancas } = await supabase
    .from("cobrancas")
    .select("id, tenant_id, valor_cobranca, vencimento, status, empresas(razao_social, nome_fantasia)")
    .lt("vencimento", hoje)
    .not("vencimento", "is", null);

  const idsVencidas = new Set<string>();

  for (const c of cobrancas ?? []) {
    if (STATUS_COBRANCA_NAO_GERA_PENDENCIA.has(c.status)) continue;

    idsVencidas.add(c.id);
    const empresa = Array.isArray(c.empresas) ? c.empresas[0] : c.empresas;
    const nome = empresa?.nome_fantasia ?? empresa?.razao_social ?? "empresa";

    await criarWorkItemSeNaoExiste(supabase, {
      tenantId: c.tenant_id,
      tipo: "pagamento_vencido",
      entityType: "cobranca",
      entityId: c.id,
      titulo: `Pagamento vencido — ${nome}`,
      descricao: `Vencimento em ${formatDateBR(c.vencimento)}, valor ${formatCurrencyBRL(c.valor_cobranca ?? 0)}.`,
      prioridade: "high",
      dueAt: c.vencimento ? new Date(`${c.vencimento}T00:00:00`).toISOString() : null,
      motivo: `Status atual da cobrança: ${c.status}.`,
    });
    resultado.pagamentosVencidosAbertos++;
  }

  await fecharItensQueNaoValemMais(
    supabase,
    "pagamento_vencido",
    idsVencidas,
    resultado,
    "pagamentosVencidosResolvidos",
  );
}

async function syncNegociacoesParadas(supabase: AdminClient, resultado: SyncResultado) {
  const cutoff = new Date(Date.now() - DIAS_NEGOCIACAO_PARADA * 24 * 60 * 60 * 1000).toISOString();

  const { data: negociacoes } = await supabase
    .from("negociacoes")
    .select("id, tenant_id, created_at, empresas(razao_social, nome_fantasia)")
    .in("status", ["aberta", "em_negociacao"]);

  const idsParadas = new Set<string>();

  for (const n of negociacoes ?? []) {
    const { data: ultimoEvento } = await supabase
      .from("negociacao_eventos")
      .select("created_at")
      .eq("negociacao_id", n.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const ultimaAtividade = ultimoEvento?.created_at ?? n.created_at;
    if (ultimaAtividade > cutoff) continue;

    idsParadas.add(n.id);
    const empresa = Array.isArray(n.empresas) ? n.empresas[0] : n.empresas;
    const nome = empresa?.nome_fantasia ?? empresa?.razao_social ?? "empresa";

    await criarWorkItemSeNaoExiste(supabase, {
      tenantId: n.tenant_id,
      tipo: "negociacao_parada",
      entityType: "negociacao",
      entityId: n.id,
      titulo: `Negociação parada — ${nome}`,
      descricao: `Sem proposta, contraproposta ou observação há mais de ${DIAS_NEGOCIACAO_PARADA} dias.`,
      prioridade: "medium",
    });
    resultado.negociacoesParadasAbertas++;
  }

  await fecharItensQueNaoValemMais(
    supabase,
    "negociacao_parada",
    idsParadas,
    resultado,
    "negociacoesParadasResolvidas",
  );
}

const CONTESTACAO_TIPO_LABEL: Record<string, string> = {
  enquadramento: "Enquadramento",
  aplicabilidade: "Aplicabilidade",
  pagamento_ja_realizado: "Pagamento já realizado",
  base_calculo: "Base de cálculo",
  quantidade_empregados: "Quantidade de empregados",
  valor: "Valor",
  periodo: "Período",
  dados_cadastrais: "Dados cadastrais",
  outros: "Outros",
};

/**
 * Destrava o bloco "Contestações pendentes" (Rodada 20, pendência aberta
 * por a entidade não existir ainda). entity_id aqui é a cobrança, não a
 * contestação — mesma convenção de pagamento_vencido, porque a ação
 * humana acontece na ficha da cobrança (ver contestacao-section.tsx),
 * não em uma página própria de contestações.
 */
async function syncContestacoesPendentes(supabase: AdminClient, resultado: SyncResultado) {
  const { data: contestacoes } = await supabase
    .from("contestacoes")
    .select("id, tenant_id, cobranca_id, tipo, aberta_em, empresas(razao_social, nome_fantasia)")
    .in("status", ["aberta", "em_analise"]);

  const idsAbertas = new Set<string>();

  for (const c of contestacoes ?? []) {
    idsAbertas.add(c.cobranca_id);
    const empresa = Array.isArray(c.empresas) ? c.empresas[0] : c.empresas;
    const nome = empresa?.nome_fantasia ?? empresa?.razao_social ?? "empresa";

    await criarWorkItemSeNaoExiste(supabase, {
      tenantId: c.tenant_id,
      tipo: "contestacao_pendente",
      entityType: "cobranca",
      entityId: c.cobranca_id,
      titulo: `Contestação pendente — ${nome}`,
      descricao: `Motivo: ${CONTESTACAO_TIPO_LABEL[c.tipo] ?? c.tipo}. Aberta em ${new Date(c.aberta_em).toLocaleDateString("pt-BR")}.`,
      prioridade: "high",
    });
    resultado.contestacoesPendentesAbertas++;
  }

  await fecharItensQueNaoValemMais(
    supabase,
    "contestacao_pendente",
    idsAbertas,
    resultado,
    "contestacoesPendentesResolvidas",
  );
}

/**
 * Política "Acordo inadimplente cria item de trabalho" (STG-11) —
 * diferente de negociacao_parada (estagnação ANTES de um acordo, dias
 * sem atividade), esta olha DEPOIS do acordo firmado: cobrança em
 * 'agreement_reached' há mais de dias_limite dias, ainda sem quitação
 * total. `ativa=false` desliga a varredura inteira, inclusive o
 * fechamento de itens que deixaram de valer — mesmo racional de
 * "automação interrompível" (regra 6): desligar a política pausa o
 * efeito dela por completo, não só a criação de itens novos.
 */
async function syncAcordosInadimplentes(supabase: AdminClient, resultado: SyncResultado) {
  const { data: policy } = await supabase
    .from("policies")
    .select("ativa, versao, parametros")
    .eq("id", "acordo_inadimplente_work_item")
    .maybeSingle();

  if (!policy?.ativa) return;

  const diasLimite = Number((policy.parametros as { dias_limite?: number })?.dias_limite ?? 15);
  const cutoff = new Date(Date.now() - diasLimite * 24 * 60 * 60 * 1000).toISOString();

  const { data: cobrancas } = await supabase
    .from("cobrancas")
    .select("id, tenant_id, valor_cobranca, empresas(razao_social, nome_fantasia)")
    .eq("status", "agreement_reached");

  const idsInadimplentes = new Set<string>();

  for (const c of cobrancas ?? []) {
    const { data: eventoAcordo } = await supabase
      .from("cobranca_eventos")
      .select("created_at")
      .eq("cobranca_id", c.id)
      .eq("to_status", "agreement_reached")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const desde = eventoAcordo?.created_at;
    if (!desde || desde > cutoff) continue;

    const { data: pagamentosRows } = await supabase
      .from("pagamentos")
      .select("valor")
      .eq("cobranca_id", c.id);

    const totalPago = (pagamentosRows ?? []).reduce((acc, p) => acc + p.valor, 0);
    if (totalPago >= (c.valor_cobranca ?? 0)) continue;

    idsInadimplentes.add(c.id);
    const empresa = Array.isArray(c.empresas) ? c.empresas[0] : c.empresas;
    const nome = empresa?.nome_fantasia ?? empresa?.razao_social ?? "empresa";
    const saldo = (c.valor_cobranca ?? 0) - totalPago;

    await criarWorkItemSeNaoExiste(supabase, {
      tenantId: c.tenant_id,
      tipo: "acordo_inadimplente",
      entityType: "cobranca",
      entityId: c.id,
      titulo: `Acordo inadimplente — ${nome}`,
      descricao: `Acordo firmado há mais de ${diasLimite} dias sem quitação total. Saldo pendente: ${formatCurrencyBRL(saldo)}.`,
      prioridade: "high",
    });

    await registrarDecisaoPolicy(supabase, {
      policyId: "acordo_inadimplente_work_item",
      tenantId: c.tenant_id,
      entityType: "cobranca",
      entityId: c.id,
      inputs: { dias_limite: diasLimite, total_pago: totalPago, valor_cobranca: c.valor_cobranca },
      resultado: "work_item_criado",
      motivo: `Acordo firmado há mais de ${diasLimite} dias sem quitação total — saldo pendente ${formatCurrencyBRL(saldo)}.`,
    });

    resultado.acordosInadimplentesAbertos++;
  }

  await fecharItensQueNaoValemMais(
    supabase,
    "acordo_inadimplente",
    idsInadimplentes,
    resultado,
    "acordosInadimplentesResolvidos",
  );
}
