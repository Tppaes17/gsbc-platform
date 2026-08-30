import { notFound } from "next/navigation";
import { PageHeader } from "@/components/design-system/page-header";
import { StatusBadge } from "@/components/design-system/status-badge";
import type { TimelineItem } from "@/components/design-system/timeline";
import { requireCurrentPortalContato } from "@/lib/auth/portal-session";
import { createClient } from "@/lib/supabase/server";
import { PagamentosList } from "@/app/backoffice/financeiro/pagamentos-list";
import { valorReferenciaCobranca } from "@/lib/finance/referencia";
import { ContestacaoPortalSection } from "./contestacao-portal-section";
import { DocumentosPortalList } from "./documentos-portal-list";
import { EntendaCobrancaSection } from "./entenda-cobranca-section";
import { NegociacaoPortalSection } from "./negociacao-portal-section";

const DOCUMENTOS_BUCKET = "documentos-empresas";

const STATUS_LABEL: Record<string, string> = {
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
  contestada: "Contestada",
};

const STATUS_TONE: Record<string, "positive" | "neutral" | "warning" | "negative" | "info"> = {
  approved: "info",
  notified: "info",
  contacted: "info",
  negotiating: "warning",
  agreement_reached: "positive",
  partially_paid: "warning",
  paid: "positive",
  overdue: "negative",
  suspended: "neutral",
  cancelled: "neutral",
  legal_escalation: "negative",
  closed: "neutral",
  contestada: "warning",
};

const CONTESTACAO_EVENTO_LABEL: Record<string, string> = {
  abertura: "Contestação enviada",
  em_analise: "Em análise pela GSBC",
  procedente: "Procedente",
  parcialmente_procedente: "Parcialmente procedente",
  improcedente: "Improcedente",
  inconclusiva: "Inconclusiva",
  observacao: "Observação",
};

const NEGOCIACAO_EVENTO_LABEL: Record<string, string> = {
  proposta_gsbc: "Proposta do Sindicato",
  contraproposta_empresa: "Sua contraproposta",
  aceite: "Aceite",
  recusa: "Recusa",
  observacao: "Observação",
};

export default async function PortalCobrancaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contato = await requireCurrentPortalContato();
  const supabase = await createClient();

  const { data: cobranca } = await supabase
    .from("cobrancas")
    .select(
      "id, valor_principal, valor_atualizacao, valor_cobranca, vencimento, status, obrigacoes(descricao, fundamento, periodo_inicio, periodo_fim, valor_referencia, clausula_id, instrumento_id, clausulas(numero, titulo), instrumentos(titulo, numero))",
    )
    .eq("id", id)
    .single();

  // RLS já restringe a leitura à própria empresa do contato — se não
  // encontrou, ou não existe, ou é de outra empresa (mesma resposta pro
  // usuário nos dois casos, de propósito: nunca revelar qual dos dois é).
  if (!cobranca) {
    notFound();
  }

  const obrigacao = Array.isArray(cobranca.obrigacoes) ? cobranca.obrigacoes[0] : cobranca.obrigacoes;
  const clausula = obrigacao ? (Array.isArray(obrigacao.clausulas) ? obrigacao.clausulas[0] : obrigacao.clausulas) : null;
  const instrumento = obrigacao ? (Array.isArray(obrigacao.instrumentos) ? obrigacao.instrumentos[0] : obrigacao.instrumentos) : null;

  const [
    { data: documentosRaw },
    { data: contestacaoRows },
    { data: negociacao },
    { data: pagamentosRaw },
    { data: conciliacoesRaw },
  ] = await Promise.all([
    supabase
      .from("documentos")
      .select("id, nome_arquivo, storage_path, created_at")
      .eq("empresa_id", contato.empresaId)
      .order("created_at", { ascending: false }),
    supabase
      .from("contestacoes")
      .select("id, tipo, status, motivo, valor_alegado, aberta_em")
      .eq("cobranca_id", id)
      .order("aberta_em", { ascending: false })
      .limit(1),
    supabase
      .from("negociacoes")
      .select("id, status, valor_atual")
      .eq("cobranca_id", id)
      .maybeSingle(),
    supabase
      .from("pagamentos")
      .select("id, valor, data_pagamento, forma_pagamento, observacao")
      .eq("cobranca_id", id)
      .order("data_pagamento", { ascending: false }),
    supabase
      .from("payment_reconciliations")
      .select("id, pagamento_id, status, gross_amount, provider_fee_amount, net_amount")
      .eq("cobranca_id", id),
  ]);

  const documentos = await Promise.all(
    (documentosRaw ?? []).map(async (doc) => {
      const { data: signed } = await supabase.storage
        .from(DOCUMENTOS_BUCKET)
        .createSignedUrl(doc.storage_path, 300);
      return { id: doc.id, nome_arquivo: doc.nome_arquivo, created_at: doc.created_at, url: signed?.signedUrl ?? null };
    }),
  );

  const contestacao = contestacaoRows?.[0] ?? null;

  const [{ data: contestacaoEventosRaw }, { data: contestacaoEvidenciasRaw }, { data: negociacaoEventosRaw }] =
    await Promise.all([
      contestacao
        ? supabase
            .from("contestacao_eventos")
            .select("id, tipo, descricao, created_at")
            .eq("contestacao_id", contestacao.id)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as never[] }),
      contestacao
        ? supabase
            .from("contestacao_evidencias")
            .select("id, tipo, comentario, fundamento, created_at, documentos(nome_arquivo, storage_path)")
            .eq("contestacao_id", contestacao.id)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as never[] }),
      negociacao
        ? supabase
            .from("negociacao_eventos")
            .select("id, tipo, valor, condicoes, created_at")
            .eq("negociacao_id", negociacao.id)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as never[] }),
    ]);

  const contestacaoEventos: TimelineItem[] = (contestacaoEventosRaw ?? []).map((ev) => ({
    id: ev.id,
    label: CONTESTACAO_EVENTO_LABEL[ev.tipo] ?? ev.tipo,
    description: ev.descricao ?? undefined,
    timestamp: ev.created_at,
  }));

  const contestacaoEvidencias = await Promise.all(
    (contestacaoEvidenciasRaw ?? []).map(async (ev) => {
      const documento = Array.isArray(ev.documentos) ? ev.documentos[0] : ev.documentos;
      let documentoUrl: string | null = null;
      if (documento) {
        const { data: signed } = await supabase.storage
          .from(DOCUMENTOS_BUCKET)
          .createSignedUrl(documento.storage_path, 300);
        documentoUrl = signed?.signedUrl ?? null;
      }
      return {
        id: ev.id,
        tipo: ev.tipo,
        comentario: ev.comentario,
        fundamento: ev.fundamento,
        created_at: ev.created_at,
        documentoNome: documento?.nome_arquivo ?? null,
        documentoUrl,
      };
    }),
  );

  const negociacaoEventos: TimelineItem[] = (negociacaoEventosRaw ?? []).map((ev) => ({
    id: ev.id,
    label: NEGOCIACAO_EVENTO_LABEL[ev.tipo] ?? ev.tipo,
    description: ev.condicoes ?? undefined,
    timestamp: ev.created_at,
  }));

  const conciliacaoPorPagamento = new Map(
    (conciliacoesRaw ?? []).map((c) => [c.pagamento_id, c]),
  );

  const pagamentos = (pagamentosRaw ?? []).map((p) => {
    const conciliacao = conciliacaoPorPagamento.get(p.id);
    return {
      id: p.id,
      valor: p.valor,
      data_pagamento: p.data_pagamento,
      forma_pagamento: p.forma_pagamento,
      observacao: p.observacao,
      registradoPorNome: null,
      conciliacao: conciliacao
        ? {
            status: conciliacao.status,
            valorBruto: conciliacao.gross_amount,
            taxas: conciliacao.provider_fee_amount,
            valorLiquido: conciliacao.net_amount,
            repasses: [],
          }
        : null,
    };
  });

  const valorReferencia = valorReferenciaCobranca(cobranca.valor_cobranca, negociacao);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={obrigacao?.descricao ?? "Cobrança"}
        description={instrumento?.titulo ?? undefined}
      />

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <StatusBadge
            label={STATUS_LABEL[cobranca.status] ?? cobranca.status}
            tone={STATUS_TONE[cobranca.status] ?? "neutral"}
          />
        </div>
        <div className="text-sm text-muted-foreground">
          Valor a regularizar:{" "}
          <span className="font-medium text-foreground">
            {valorReferencia.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
        </div>
      </div>

      <EntendaCobrancaSection
        dados={{
          origem: obrigacao?.descricao ?? "—",
          instrumento: instrumento?.titulo ?? null,
          clausula: clausula ? [clausula.numero, clausula.titulo].filter(Boolean).join(" — ") : null,
          periodoInicio: obrigacao?.periodo_inicio ?? null,
          periodoFim: obrigacao?.periodo_fim ?? null,
          base: obrigacao?.fundamento ?? null,
          valorPrincipal: cobranca.valor_principal,
          valorAtualizacao: cobranca.valor_atualizacao,
          valorTotal: cobranca.valor_cobranca,
        }}
      />

      <PagamentosList pagamentos={pagamentos} valorReferencia={valorReferencia} />

      <NegociacaoPortalSection negociacao={negociacao ?? null} eventos={negociacaoEventos} />

      <ContestacaoPortalSection
        cobrancaId={cobranca.id}
        contestacao={contestacao}
        eventos={contestacaoEventos}
        evidencias={contestacaoEvidencias}
      />

      <DocumentosPortalList documentos={documentos} />
    </div>
  );
}
