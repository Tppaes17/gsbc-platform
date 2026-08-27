import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/design-system/page-header";
import { StatusBadge } from "@/components/design-system/status-badge";
import { Timeline, type TimelineItem } from "@/components/design-system/timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { cobrancaStatusOptions } from "@/lib/validation/cobranca";
import { valorReferenciaCobranca } from "@/lib/finance/referencia";
import { PagamentosList } from "../../financeiro/pagamentos-list";
import { RegistrarPagamentoAction } from "../../financeiro/pagamento-action";
import { EditCobrancaForm } from "./edit-cobranca-form";
import { IniciarNegociacaoAction } from "./negociacao-action";
import { NotificacaoAction } from "./notificacao-action";
import { NotificacoesList } from "./notificacoes-list";
import { ReguaCobrancaSection } from "./regua-cobranca-section";
import { StatusAction } from "./status-action";

const STATUS_LABEL = Object.fromEntries(
  cobrancaStatusOptions.map((o) => [o.value, o.label]),
);

const STATUS_TONE: Record<string, "positive" | "neutral" | "warning" | "negative" | "info"> = {
  draft: "neutral",
  pending_validation: "info",
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
};

function statusLabel(status: string) {
  return STATUS_LABEL[status] ?? status;
}

export default async function CobrancaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireCurrentUser();
  const supabase = await createClient();

  const { data: cobranca } = await supabase
    .from("cobrancas")
    .select(
      "*, empresas(id, razao_social, nome_fantasia), obrigacoes(descricao, instrumento_id), tenants(name), users!cobrancas_responsavel_id_fkey(full_name)",
    )
    .eq("id", id)
    .single();

  if (!cobranca) {
    notFound();
  }

  const empresa = Array.isArray(cobranca.empresas)
    ? cobranca.empresas[0]
    : cobranca.empresas;
  const obrigacao = Array.isArray(cobranca.obrigacoes)
    ? cobranca.obrigacoes[0]
    : cobranca.obrigacoes;

  const [
    { data: eventos },
    { data: gsbcMembers },
    { data: negociacaoExistente },
    { data: pagamentosRaw },
    { data: contatoPrincipal },
    { data: notificacoes },
  ] = await Promise.all([
    supabase
      .from("cobranca_eventos")
      .select("id, from_status, to_status, reason, created_at, users(full_name)")
      .eq("cobranca_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("memberships")
      .select("user_id, users!memberships_user_id_fkey(full_name), tenants!inner(type)")
      .eq("tenants.type", "platform")
      .eq("status", "active"),
    supabase
      .from("negociacoes")
      .select("id, status, valor_atual")
      .eq("cobranca_id", id)
      .maybeSingle(),
    supabase
      .from("pagamentos")
      .select("id, valor, data_pagamento, forma_pagamento, observacao, users!pagamentos_registrado_por_fkey(full_name)")
      .eq("cobranca_id", id)
      .order("data_pagamento", { ascending: false }),
    supabase
      .from("empresa_contatos")
      .select("email, principal")
      .eq("empresa_id", cobranca.empresa_id)
      .not("email", "is", null)
      .order("principal", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("notificacoes")
      .select("id, destinatario_email, assunto, status, erro, created_at")
      .eq("cobranca_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const { data: enrollmentRows } = await supabase
    .from("collection_enrollments")
    .select("id, status, current_step_ordem, enrolled_at, paused_reason, strategy_id")
    .eq("cobranca_id", id)
    .order("enrolled_at", { ascending: false })
    .limit(1);

  const enrollment = enrollmentRows?.[0] ?? null;

  const [{ data: enrollmentSteps }, { data: execucoesRaw }] = await Promise.all([
    enrollment
      ? supabase
          .from("collection_strategy_steps")
          .select("ordem, dias_apos_inscricao, canal, descricao")
          .eq("strategy_id", enrollment.strategy_id)
          .order("ordem")
      : Promise.resolve({ data: [] as { ordem: number; dias_apos_inscricao: number; canal: string; descricao: string }[] }),
    enrollment
      ? supabase
          .from("collection_executions")
          .select(
            "id, status, scheduled_for, executed_at, last_error, collection_strategy_steps(ordem, dias_apos_inscricao, canal, descricao)",
          )
          .eq("enrollment_id", enrollment.id)
          .order("scheduled_for", { ascending: false })
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const execucoes = (execucoesRaw ?? []).map((e) => {
    const step = Array.isArray(e.collection_strategy_steps)
      ? e.collection_strategy_steps[0]
      : e.collection_strategy_steps;
    return {
      id: e.id,
      status: e.status,
      scheduled_for: e.scheduled_for,
      executed_at: e.executed_at,
      last_error: e.last_error,
      step: step ?? null,
    };
  });

  const pagamentos = (pagamentosRaw ?? []).map((p) => {
    const registrador = Array.isArray(p.users) ? p.users[0] : p.users;
    return {
      id: p.id,
      valor: p.valor,
      data_pagamento: p.data_pagamento,
      forma_pagamento: p.forma_pagamento,
      observacao: p.observacao,
      registradoPorNome: registrador?.full_name ?? null,
    };
  });

  const timelineItems: TimelineItem[] = (eventos ?? []).map((evento) => {
    const author = Array.isArray(evento.users) ? evento.users[0] : evento.users;
    const label = evento.from_status
      ? `${statusLabel(evento.from_status)} → ${statusLabel(evento.to_status)}`
      : `Cobrança criada — ${statusLabel(evento.to_status)}`;
    const description = [evento.reason, author ? `por ${author.full_name}` : null]
      .filter(Boolean)
      .join(" · ");
    return {
      id: evento.id,
      label,
      description: description || undefined,
      timestamp: evento.created_at,
    };
  });

  const valorReferencia = valorReferenciaCobranca(cobranca.valor_cobranca, negociacaoExistente);
  const temAcordoComDesconto =
    negociacaoExistente?.status === "aceita" &&
    negociacaoExistente.valor_atual !== null &&
    negociacaoExistente.valor_atual !== cobranca.valor_cobranca;

  const responsaveis = (gsbcMembers ?? []).map((m) => {
    const u = Array.isArray(m.users) ? m.users[0] : m.users;
    return { id: m.user_id, nome: u?.full_name ?? "—" };
  });

  // Garante que o responsável atual apareça no Select mesmo quando o
  // usuário logado não pode listar memberships do tenant GSBC (ex.: membro
  // de sindicato) — só pode ver o nome deste usuário específico via a
  // policy de users_select (regra 6: transparência sobre quem executa).
  const responsavelAtual = Array.isArray(cobranca.users)
    ? cobranca.users[0]
    : cobranca.users;
  if (
    cobranca.responsavel_id &&
    responsavelAtual &&
    !responsaveis.some((r) => r.id === cobranca.responsavel_id)
  ) {
    responsaveis.push({
      id: cobranca.responsavel_id,
      nome: responsavelAtual.full_name,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={empresa?.nome_fantasia ?? empresa?.razao_social ?? "Cobrança"}
        description={`${obrigacao?.descricao ?? "—"} · ${cobranca.tenants?.name ?? "—"}`}
        actions={
          user.isPlatformStaff ? (
            <StatusAction cobrancaId={cobranca.id} currentStatus={cobranca.status} />
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <StatusBadge
            label={statusLabel(cobranca.status)}
            tone={STATUS_TONE[cobranca.status] ?? "neutral"}
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {temAcordoComDesconto ? "Valor original:" : "Valor total:"}{" "}
          <span className="font-medium text-foreground">
            {cobranca.valor_cobranca.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </span>
        </div>
        {temAcordoComDesconto ? (
          <div className="text-sm text-muted-foreground">
            Valor acordado (negociação):{" "}
            <span className="font-medium text-foreground">
              {valorReferencia.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>
        ) : null}
        {empresa ? (
          <Link
            href={`/backoffice/empresas/${empresa.id}`}
            className="text-sm text-primary hover:underline"
          >
            Ver ficha da empresa
          </Link>
        ) : null}
        {obrigacao?.instrumento_id ? (
          <Link
            href={`/backoffice/instrumentos/${obrigacao.instrumento_id}`}
            className="text-sm text-primary hover:underline"
          >
            Ver instrumento de origem
          </Link>
        ) : null}
        {user.isPlatformStaff ? (
          negociacaoExistente ? (
            <Link
              href={`/backoffice/negociacoes/${negociacaoExistente.id}`}
              className="text-sm text-primary hover:underline"
            >
              Ver negociação
            </Link>
          ) : (
            <IniciarNegociacaoAction cobrancaId={cobranca.id} responsaveis={responsaveis} />
          )
        ) : null}
        {user.isPlatformStaff ? (
          <NotificacaoAction
            cobrancaId={cobranca.id}
            destinatarioEmail={contatoPrincipal?.email ?? null}
          />
        ) : null}
      </div>

      <EditCobrancaForm
        cobranca={cobranca}
        responsaveis={responsaveis}
        readOnly={!user.isPlatformStaff}
      />

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Financeiro</h2>
        {user.isPlatformStaff ? (
          <RegistrarPagamentoAction cobrancaId={cobranca.id} />
        ) : null}
      </div>
      <PagamentosList pagamentos={pagamentos} valorReferencia={valorReferencia} />

      {user.isPlatformStaff ? (
        <ReguaCobrancaSection
          cobrancaId={cobranca.id}
          enrollment={enrollment}
          steps={enrollmentSteps ?? []}
          execucoes={execucoes}
        />
      ) : null}

      <NotificacoesList notificacoes={notificacoes ?? []} />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <Timeline items={timelineItems} />
        </CardContent>
      </Card>
    </div>
  );
}
