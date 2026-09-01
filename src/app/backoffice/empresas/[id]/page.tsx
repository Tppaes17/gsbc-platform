import { notFound } from "next/navigation";
import Link from "next/link";
import { DetailHeader } from "@/components/design-system/detail-header";
import {
  EntityRelationshipSection,
  EntitySummaryStrip,
  EntityWorkspace,
  EntityWorkspaceNav,
  EntityWorkspaceSection,
} from "@/components/design-system/entity-workspace";
import type { TimelineItem } from "@/components/design-system/timeline";
import { formatBrl } from "@/components/design-system/financial-cell";
import { requireCurrentUser } from "@/lib/auth/session";
import { valorReferenciaCobranca } from "@/lib/finance/referencia";
import { createClient } from "@/lib/supabase/server";
import { formaPagamentoOptions } from "@/lib/validation/pagamento";
import { negociacaoEventoTipoOptions } from "@/lib/validation/negociacao";
import { ContatosSection } from "./contatos-section";
import { DossieCadastralSection } from "./dossie-cadastral-section";
import { EditEmpresaForm } from "./edit-empresa-form";
import { EmpresaCobrancasList } from "./cobrancas-list";
import { DocumentosSection } from "./documentos-section";
import { EmpresaFinanceiroSummary } from "./financeiro-summary";
import { EmpresaNegociacoesList } from "./negociacoes-list";
import { EmpresaObrigacoesList } from "./obrigacoes-list";
import { TimelineConsolidada } from "./timeline-consolidada";

const DOCUMENTOS_BUCKET = "documentos-empresas";

const STATUS_ENCERRADO = ["paid", "cancelled", "closed"];
const COBRANCA_STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  pending_validation: "Aguardando validação",
  approved: "Aprovada",
  notified: "Notificada",
  contacted: "Em contato",
  negotiating: "Em negociação",
  agreement_reached: "Acordo firmado",
  partially_paid: "Parcialmente paga",
  paid: "Paga",
  overdue: "Vencida",
  suspended: "Suspensa",
  cancelled: "Cancelada",
  legal_escalation: "Escalada jurídica",
  closed: "Encerrada",
};
const NEGOCIACAO_TIPO_LABEL = Object.fromEntries(
  negociacaoEventoTipoOptions.map((o) => [o.value, o.label]),
);
const FORMA_PAGAMENTO_LABEL = Object.fromEntries(
  formaPagamentoOptions.map((o) => [o.value, o.label]),
);

export default async function EmpresaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireCurrentUser();
  const supabase = await createClient();

  const { data: empresa } = await supabase
    .from("empresas")
    .select("*, tenants(name)")
    .eq("id", id)
    .single();

  if (!empresa) {
    notFound();
  }

  const [
    { data: contatos },
    { data: obrigacoesRaw },
    { data: cobrancasRaw },
    { data: negociacoesRaw },
    { data: cobrancaEventosRaw },
    { data: negociacaoEventosRaw },
    { data: pagamentosTimelineRaw },
    { data: documentosRaw },
  ] = await Promise.all([
    supabase
      .from("empresa_contatos")
      .select("id, nome, cargo, email, telefone, principal, portal_access_status")
      .eq("empresa_id", id)
      .order("principal", { ascending: false }),
    supabase
      .from("obrigacoes")
      .select(
        "id, descricao, vencimento, valor_referencia, status, created_at, instrumentos(id, titulo)",
      )
      .eq("empresa_id", id)
      .order("vencimento"),
    supabase
      .from("cobrancas")
      .select(
        "id, valor_cobranca, vencimento, status, obrigacoes(descricao), pagamentos(valor), negociacoes(status, valor_atual)",
      )
      .eq("empresa_id", id)
      .order("vencimento"),
    supabase
      .from("negociacoes")
      .select("id, status, valor_atual, cobrancas(obrigacoes(descricao))")
      .eq("empresa_id", id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("cobranca_eventos")
      .select(
        "id, from_status, to_status, reason, created_at, users(full_name), cobrancas!inner(empresa_id, obrigacoes(descricao))",
      )
      .eq("cobrancas.empresa_id", id),
    supabase
      .from("negociacao_eventos")
      .select(
        "id, tipo, valor, condicoes, created_at, users(full_name), negociacoes!inner(empresa_id, cobrancas(obrigacoes(descricao)))",
      )
      .eq("negociacoes.empresa_id", id),
    supabase
      .from("pagamentos")
      .select(
        "id, valor, data_pagamento, forma_pagamento, observacao, created_at, users!pagamentos_registrado_por_fkey(full_name), cobrancas(obrigacoes(descricao))",
      )
      .eq("empresa_id", id),
    supabase
      .from("documentos")
      .select(
        "id, storage_path, nome_arquivo, categoria, tamanho_bytes, created_at, users!documentos_uploaded_by_fkey(full_name)",
      )
      .eq("empresa_id", id)
      .order("created_at", { ascending: false }),
  ]);

  let dossie: {
    status: string;
    score_confiabilidade: number | null;
    score_classificacao: string | null;
    ultima_consulta_em: string | null;
  } | null = null;
  let dossieEvidencias: Array<{
    id: string;
    tipo: string;
    campo: string | null;
    valor: string | null;
    fonte: string;
    nivel_confianca: string;
    observacao: string | null;
    consultado_em: string;
  }> = [];
  const enriquecimentoWebConfigurado = !!process.env.LEADCNPJ_API_KEY;

  if (user.isOwner) {
    const { data: dossieRaw } = await supabase
      .from("dossies_cadastrais")
      .select("id, status, score_confiabilidade, score_classificacao, ultima_consulta_em")
      .eq("empresa_id", id)
      .maybeSingle();

    dossie = dossieRaw
      ? {
          status: dossieRaw.status,
          score_confiabilidade: dossieRaw.score_confiabilidade,
          score_classificacao: dossieRaw.score_classificacao,
          ultima_consulta_em: dossieRaw.ultima_consulta_em,
        }
      : null;

    if (dossieRaw) {
      const { data: evidenciasRaw } = await supabase
        .from("dossie_evidencias")
        .select("id, tipo, campo, valor, fonte, nivel_confianca, observacao, consultado_em")
        .eq("dossie_id", dossieRaw.id)
        .order("consultado_em", { ascending: false });
      dossieEvidencias = evidenciasRaw ?? [];
    }
  }

  const documentos = await Promise.all(
    (documentosRaw ?? []).map(async (doc) => {
      const uploader = Array.isArray(doc.users) ? doc.users[0] : doc.users;
      const { data: signed } = await supabase.storage
        .from(DOCUMENTOS_BUCKET)
        .createSignedUrl(doc.storage_path, 300);
      return {
        id: doc.id,
        nome_arquivo: doc.nome_arquivo,
        categoria: doc.categoria,
        tamanho_bytes: doc.tamanho_bytes,
        created_at: doc.created_at,
        uploadedPorNome: uploader?.full_name ?? null,
        url: signed?.signedUrl ?? null,
      };
    }),
  );

  const obrigacoes = (obrigacoesRaw ?? []).map((o) => {
    const instrumento = Array.isArray(o.instrumentos)
      ? o.instrumentos[0]
      : o.instrumentos;
    return {
      id: o.id,
      descricao: o.descricao,
      vencimento: o.vencimento,
      valor_referencia: o.valor_referencia,
      status: o.status,
      instrumentoId: instrumento?.id ?? "",
      instrumentoTitulo: instrumento?.titulo ?? "—",
    };
  });

  const cobrancas = (cobrancasRaw ?? []).map((c) => {
    const obrigacao = Array.isArray(c.obrigacoes) ? c.obrigacoes[0] : c.obrigacoes;
    return {
      id: c.id,
      valor_cobranca: c.valor_cobranca,
      vencimento: c.vencimento,
      status: c.status,
      obrigacaoDescricao: obrigacao?.descricao ?? "—",
    };
  });

  const hoje = new Date().toISOString().slice(0, 10);
  const totalCobrado = (cobrancasRaw ?? []).reduce((sum, c) => sum + c.valor_cobranca, 0);
  const totalPago = (cobrancasRaw ?? []).reduce(
    (sum, c) => sum + (c.pagamentos ?? []).reduce((s, p) => s + p.valor, 0),
    0,
  );
  const cobrancasComReferencia = (cobrancasRaw ?? []).map((c) => {
    const negociacao = Array.isArray(c.negociacoes) ? c.negociacoes[0] : c.negociacoes;
    const referencia = valorReferenciaCobranca(c.valor_cobranca, negociacao);
    const pago = (c.pagamentos ?? []).reduce((s, p) => s + p.valor, 0);
    return { ...c, referencia, pago };
  });
  const saldoEmAberto = cobrancasComReferencia.reduce(
    (sum, c) => sum + Math.max(c.referencia - c.pago, 0),
    0,
  );
  const vencidasCount = cobrancasComReferencia.filter(
    (c) =>
      !!c.vencimento &&
      c.vencimento < hoje &&
      !STATUS_ENCERRADO.includes(c.status) &&
      c.referencia - c.pago > 0,
  ).length;

  const negociacoes = (negociacoesRaw ?? []).map((n) => {
    const cobranca = Array.isArray(n.cobrancas) ? n.cobrancas[0] : n.cobrancas;
    const obrigacao = Array.isArray(cobranca?.obrigacoes)
      ? cobranca?.obrigacoes[0]
      : cobranca?.obrigacoes;
    return {
      id: n.id,
      status: n.status,
      valor_atual: n.valor_atual,
      obrigacaoDescricao: obrigacao?.descricao ?? "—",
    };
  });

  const timelineFromObrigacoes: TimelineItem[] = (obrigacoesRaw ?? []).map((o) => ({
    id: `obrigacao-${o.id}`,
    label: "Obrigação cadastrada",
    description: o.descricao,
    timestamp: o.created_at,
  }));

  const timelineFromCobrancas: TimelineItem[] = (cobrancaEventosRaw ?? []).map((evento) => {
    const author = Array.isArray(evento.users) ? evento.users[0] : evento.users;
    const cobranca = Array.isArray(evento.cobrancas) ? evento.cobrancas[0] : evento.cobrancas;
    const obrigacao = Array.isArray(cobranca?.obrigacoes)
      ? cobranca?.obrigacoes[0]
      : cobranca?.obrigacoes;
    const statusLabel = evento.from_status
      ? `${COBRANCA_STATUS_LABEL[evento.from_status] ?? evento.from_status} → ${COBRANCA_STATUS_LABEL[evento.to_status] ?? evento.to_status}`
      : `criada — ${COBRANCA_STATUS_LABEL[evento.to_status] ?? evento.to_status}`;
    return {
      id: `cobranca-evento-${evento.id}`,
      label: `Cobrança: ${statusLabel}`,
      description: [obrigacao?.descricao, evento.reason, author ? `por ${author.full_name}` : null]
        .filter(Boolean)
        .join(" · ") || undefined,
      timestamp: evento.created_at,
    };
  });

  const timelineFromNegociacoes: TimelineItem[] = (negociacaoEventosRaw ?? []).map((evento) => {
    const author = Array.isArray(evento.users) ? evento.users[0] : evento.users;
    const negociacao = Array.isArray(evento.negociacoes)
      ? evento.negociacoes[0]
      : evento.negociacoes;
    const cobranca = Array.isArray(negociacao?.cobrancas)
      ? negociacao?.cobrancas[0]
      : negociacao?.cobrancas;
    const obrigacao = Array.isArray(cobranca?.obrigacoes)
      ? cobranca?.obrigacoes[0]
      : cobranca?.obrigacoes;
    const valorLabel = evento.valor !== null ? ` · ${formatBrl(evento.valor)}` : "";
    return {
      id: `negociacao-evento-${evento.id}`,
      label: `${NEGOCIACAO_TIPO_LABEL[evento.tipo] ?? evento.tipo}${valorLabel}`,
      description: [obrigacao?.descricao, evento.condicoes, author ? `por ${author.full_name}` : null]
        .filter(Boolean)
        .join(" · ") || undefined,
      timestamp: evento.created_at,
    };
  });

  const timelineFromPagamentos: TimelineItem[] = (pagamentosTimelineRaw ?? []).map((p) => {
    const registrador = Array.isArray(p.users) ? p.users[0] : p.users;
    const cobranca = Array.isArray(p.cobrancas) ? p.cobrancas[0] : p.cobrancas;
    const obrigacao = Array.isArray(cobranca?.obrigacoes)
      ? cobranca?.obrigacoes[0]
      : cobranca?.obrigacoes;
    return {
      id: `pagamento-${p.id}`,
      label: `Pagamento registrado · ${formatBrl(p.valor)}`,
      description: [
        obrigacao?.descricao,
        FORMA_PAGAMENTO_LABEL[p.forma_pagamento] ?? p.forma_pagamento,
        p.observacao,
        registrador ? `registrado por ${registrador.full_name}` : null,
      ]
        .filter(Boolean)
        .join(" · ") || undefined,
      timestamp: p.created_at,
    };
  });

  const timelineFromDocumentos: TimelineItem[] = documentos.map((doc) => ({
    id: `documento-${doc.id}`,
    label: `Documento — ${doc.nome_arquivo}`,
    description: [
      doc.uploadedPorNome ? `enviado por ${doc.uploadedPorNome}` : null,
    ]
      .filter(Boolean)
      .join(" · ") || undefined,
    timestamp: doc.created_at,
  }));

  const timelineConsolidada = [
    ...timelineFromObrigacoes,
    ...timelineFromCobrancas,
    ...timelineFromNegociacoes,
    ...timelineFromPagamentos,
    ...timelineFromDocumentos,
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const navItems = [
    { id: "overview", label: "Visão geral" },
    { id: "compliance", label: "Compliance", meta: obrigacoes.length },
    { id: "receita", label: "Receita", meta: cobrancas.length },
    { id: "financeiro", label: "Financeiro" },
    { id: "contatos", label: "Contatos", meta: contatos?.length ?? 0 },
    { id: "documentos", label: "Documentos", meta: documentos.length },
    { id: "historico", label: "Histórico", meta: timelineConsolidada.length },
    { id: "cadastro", label: "Cadastro" },
  ];

  const proximaAtencao =
    cobrancasComReferencia.find(
      (c) =>
        !!c.vencimento &&
        c.vencimento < hoje &&
        !STATUS_ENCERRADO.includes(c.status) &&
        c.referencia - c.pago > 0,
    ) ??
    cobrancasComReferencia.find((c) => c.status === "negotiating" || c.status === "overdue") ??
    null;

  return (
    <EntityWorkspace>
      <DetailHeader
        title={empresa.nome_fantasia ?? empresa.razao_social}
        subtitle={`${empresa.razao_social} · ${empresa.tenants?.name ?? "—"}`}
        status={{
          label: empresa.status === "active" ? "Ativa" : "Inativa",
          tone: empresa.status === "active" ? "positive" : "neutral",
        }}
        metadata={[{ label: "CNPJ", value: empresa.cnpj }]}
      />

      <EntityWorkspaceNav items={navItems} />

      <EntityWorkspaceSection
        id="overview"
        title="Visão geral"
        description="Contexto operacional desta empresa, sem misturar oportunidade, obrigação, cobrança e pagamento."
      >
        <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <EntityRelationshipSection>
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Relação operacional
                </p>
                <p className="mt-1 text-sm text-foreground">
                  Empresa → Instrumento → Obrigação → Cobrança → Negociação → Pagamento.
                </p>
              </div>
              <div className="grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Sindicato</p>
                  <p className="font-medium">{empresa.tenants?.name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Segmento</p>
                  <p className="font-medium">{empresa.segmento ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">CNPJ</p>
                  <p className="font-medium tabular-nums">{empresa.cnpj}</p>
                </div>
              </div>
            </div>
          </EntityRelationshipSection>

          <EntityRelationshipSection>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Atenção
            </p>
            {proximaAtencao ? (
              <div className="mt-2 flex flex-col gap-1 text-sm">
                <Link
                  href={`/backoffice/cobrancas/${proximaAtencao.id}`}
                  className="font-medium hover:underline"
                >
                  Cobrança requer acompanhamento
                </Link>
                <p className="text-muted-foreground">
                  {formatBrl(Math.max(proximaAtencao.referencia - proximaAtencao.pago, 0))}
                  {" em aberto"}
                  {proximaAtencao.vencimento ? ` · vencimento ${proximaAtencao.vencimento}` : ""}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Nenhuma exposição vencida foi identificada.
              </p>
            )}
          </EntityRelationshipSection>
        </div>

        <EntitySummaryStrip
          items={[
            { label: "Obrigações", value: obrigacoes.length },
            { label: "Cobranças", value: cobrancas.length },
            { label: "Pago", value: formatBrl(totalPago), tone: "positive" },
            {
              label: "Exposição",
              value: formatBrl(saldoEmAberto),
              tone: saldoEmAberto > 0 ? "warning" : "muted",
            },
          ]}
        />
      </EntityWorkspaceSection>

      <EntityWorkspaceSection id="compliance" title="Compliance">
        {user.isOwner ? (
          <DossieCadastralSection
            empresaId={empresa.id}
            dossie={dossie}
            evidencias={dossieEvidencias}
            enriquecimentoWebConfigurado={enriquecimentoWebConfigurado}
          />
        ) : null}
        <EmpresaObrigacoesList obrigacoes={obrigacoes} />
      </EntityWorkspaceSection>

      <EntityWorkspaceSection id="receita" title="Receita">
        <EmpresaCobrancasList cobrancas={cobrancas} />
        <EmpresaNegociacoesList negociacoes={negociacoes} />
      </EntityWorkspaceSection>

      <EntityWorkspaceSection id="financeiro" title="Financeiro">
        <EmpresaFinanceiroSummary
          totalCobrado={totalCobrado}
          totalPago={totalPago}
          saldoEmAberto={saldoEmAberto}
          vencidasCount={vencidasCount}
        />
      </EntityWorkspaceSection>

      <EntityWorkspaceSection id="contatos" title="Contatos">
        <ContatosSection
          empresaId={empresa.id}
          contatos={contatos ?? []}
          canManage={user.isPlatformStaff}
        />
      </EntityWorkspaceSection>

      <EntityWorkspaceSection id="documentos" title="Documentos">
        <DocumentosSection
          empresaId={empresa.id}
          documentos={documentos}
          canManage={user.isPlatformStaff}
        />
      </EntityWorkspaceSection>

      <EntityWorkspaceSection
        id="cadastro"
        title="Cadastro"
        description="Edição cadastral separada da leitura operacional."
      >
        <EditEmpresaForm empresa={empresa} readOnly={!user.isPlatformStaff} />
      </EntityWorkspaceSection>

      <EntityWorkspaceSection id="historico" title="Histórico">
        <TimelineConsolidada items={timelineConsolidada} />
      </EntityWorkspaceSection>
    </EntityWorkspace>
  );
}
