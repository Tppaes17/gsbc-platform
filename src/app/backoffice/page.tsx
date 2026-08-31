import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building,
  CircleDollarSign,
  Clock,
  FileText,
  Handshake,
  Receipt,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { ChartFrame } from "@/components/design-system/chart-frame";
import {
  DecisionQueue,
  type DecisionQueueItem,
} from "@/components/design-system/decision-queue";
import { ExecutiveKpi } from "@/components/design-system/executive-kpi";
import { PageHeader } from "@/components/design-system/page-header";
import { StatusBadge } from "@/components/design-system/status-badge";
import { Timeline, type TimelineItem } from "@/components/design-system/timeline";
import { Button } from "@/components/ui/button";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const COBRANCA_STATUS_ENCERRADO = new Set(["paid", "cancelled", "closed"]);
const COBRANCA_STATUS_NAO_VALIDADO = new Set(["draft", "pending_validation"]);
const OBRIGACAO_STATUS_EXCLUIDO = new Set(["cancelled"]);
const PRIORIDADE_ORDEM: Record<string, number> = { high: 0, medium: 1, low: 2 };

const AUDIT_ACTION_LABEL: Record<string, string> = {
  "ai.collections_copilot.gerado": "Sugestão do Collections Copilot gerada",
  "ai.negotiation_copilot.gerado": "Resumo do Negotiation Copilot gerado",
  "clausula.added": "Cláusula adicionada",
  "cobranca.created": "Cobrança criada",
  "cobranca.status_changed": "Status de cobrança alterado",
  "cobranca.updated": "Cobrança atualizada",
  "collection.enrollment.iniciado": "Régua de cobrança iniciada",
  "collection.enrollment.cancelado": "Régua de cobrança cancelada",
  "collection.enrollment.pausado": "Régua de cobrança pausada",
  "collection.enrollment.retomado": "Régua de cobrança retomada",
  "contestacao.aberta": "Contestação aberta",
  "contestacao.evento_registrado": "Evento de contestação registrado",
  "documento.enviado": "Documento enviado",
  "documento.removido": "Documento removido",
  "dossie_cadastral.consultado": "Dossiê cadastral consultado",
  "empresa.contato_added": "Contato de empresa adicionado",
  "empresa.created": "Empresa cadastrada",
  "empresa.updated": "Empresa atualizada",
  "escalonamento.aprovado": "Escalonamento aprovado",
  "escalonamento.concluido": "Escalonamento concluído",
  "escalonamento.documento_emitido": "Documento de escalonamento emitido",
  "escalonamento.enviado": "Escalonamento enviado",
  "escalonamento.envio_falhou": "Falha no envio do escalonamento",
  "escalonamento.iniciado": "Escalonamento iniciado",
  "escalonamento.rejeitado": "Escalonamento rejeitado",
  "escalonamento.submetido_aprovacao": "Escalonamento submetido para aprovação",
  "instrumento.created": "Instrumento cadastrado",
  "instrumento.updated": "Instrumento atualizado",
  "membership.invited": "Convite de acesso enviado",
  "negociacao.created": "Negociação iniciada",
  "negociacao.desconto_aprovado": "Desconto de negociação aprovado",
  "negociacao.desconto_rejeitado": "Desconto de negociação rejeitado",
  "negociacao.evento_registrado": "Movimento de negociação registrado",
  "notificacao.enviada": "Notificação enviada",
  "notificacao.falha": "Falha ao enviar notificação",
  "obrigacao.created": "Obrigação criada",
  "oportunidade.avaliada": "Oportunidade avaliada",
  "oportunidade.em_analise": "Oportunidade em análise",
  "oportunidade.validada": "Oportunidade validada",
  "oportunidade.descartada": "Oportunidade descartada",
  "pagamento.registrado": "Pagamento registrado",
  "payment_charge.criada": "Cobrança via provider criada",
  "policy.ativada": "Política ativada",
  "policy.desativada": "Política desativada",
  "portal.acesso_concedido": "Acesso ao portal concedido",
  "portal.contestacao.aberta": "Contestação aberta pelo portal",
  "prospecto.consultado": "Prospecto consultado",
  "prospecto.importado": "Prospecto importado",
  "prospecto.promovido": "Prospecto promovido a empresa",
  "sindicato.created": "Sindicato cadastrado",
  "sindicato.onboarding_completed": "Onboarding de sindicato concluído",
  "sindicato.updated": "Sindicato atualizado",
  "work_item.adiado": "Item da fila operacional adiado",
  "work_item.atribuido": "Item da fila operacional atribuído",
  "work_item.concluido": "Item da fila operacional concluído",
};

type EmpresaJoin =
  | { razao_social: string; nome_fantasia: string | null }
  | { razao_social: string; nome_fantasia: string | null }[]
  | null;

type CobrancaRow = {
  id: string;
  empresa_id: string;
  status: string;
  valor_cobranca: number;
  vencimento: string | null;
  empresas: EmpresaJoin;
};

type WorkItemRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  titulo: string;
  descricao: string | null;
  prioridade: string;
  due_at: string | null;
  status: string;
  motivo: string | null;
};

type EscalonamentoRow = {
  id: string;
  status: string;
  motivo: string;
  cobranca_id: string;
  empresas: EmpresaJoin;
};

function auditLabel(action: string) {
  return AUDIT_ACTION_LABEL[action] ?? action;
}

function formatCurrency(value: number, compact = false) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: compact && Math.abs(value) >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: compact && Math.abs(value) >= 1_000_000 ? 1 : 2,
  });
}

function monthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, next };
}

function inRange(dateValue: string, start: Date, end: Date) {
  const date = new Date(dateValue);
  return date >= start && date < end;
}

function compareCurrency(current: number, previous: number) {
  if (previous === 0) return "Sem base anterior comparável";
  const diff = current - previous;
  const percent = diff / previous;
  const sign = diff >= 0 ? "+" : "";
  return `${sign}${formatCurrency(diff)} (${sign}${(percent * 100).toFixed(1)}%) vs mês anterior`;
}

function empresaNome(row: { empresas: EmpresaJoin }) {
  const empresa = Array.isArray(row.empresas) ? row.empresas[0] : row.empresas;
  return empresa?.nome_fantasia ?? empresa?.razao_social ?? "Empresa sem nome";
}

function isCobrancaAberta(status: string) {
  return !COBRANCA_STATUS_ENCERRADO.has(status);
}

function isCobrancaVencida(cobranca: CobrancaRow, now: Date) {
  if (!isCobrancaAberta(cobranca.status)) return false;
  if (cobranca.status === "overdue") return true;
  if (!cobranca.vencimento) return false;
  return new Date(`${cobranca.vencimento}T23:59:59`) < now;
}

function agingBuckets(cobrancas: CobrancaRow[], now: Date) {
  const buckets = [
    { label: "A vencer", value: 0, href: "/backoffice/cobrancas" },
    { label: "1-30 dias", value: 0, href: "/backoffice/cobrancas?status=overdue" },
    { label: "31-60 dias", value: 0, href: "/backoffice/cobrancas?status=overdue" },
    { label: "60+ dias", value: 0, href: "/backoffice/cobrancas?status=overdue" },
    { label: "Sem vencimento", value: 0, href: "/backoffice/cobrancas" },
  ];

  for (const cobranca of cobrancas.filter((c) => isCobrancaAberta(c.status))) {
    if (!cobranca.vencimento) {
      buckets[4].value += cobranca.valor_cobranca;
      continue;
    }
    const due = new Date(`${cobranca.vencimento}T12:00:00`);
    const days = Math.floor((now.getTime() - due.getTime()) / 86_400_000);
    if (days <= 0) buckets[0].value += cobranca.valor_cobranca;
    else if (days <= 30) buckets[1].value += cobranca.valor_cobranca;
    else if (days <= 60) buckets[2].value += cobranca.valor_cobranca;
    else buckets[3].value += cobranca.valor_cobranca;
  }

  return buckets;
}

function topConcentration(cobrancas: CobrancaRow[]) {
  const totals = new Map<string, { label: string; value: number }>();

  for (const cobranca of cobrancas.filter((c) => isCobrancaAberta(c.status))) {
    const current = totals.get(cobranca.empresa_id) ?? {
      label: empresaNome(cobranca),
      value: 0,
    };
    current.value += cobranca.valor_cobranca;
    totals.set(cobranca.empresa_id, current);
  }

  return Array.from(totals.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

function workItemHref(item: WorkItemRow) {
  if (item.entity_type === "cobranca") return `/backoffice/cobrancas/${item.entity_id}`;
  if (item.entity_type === "negociacao") return `/backoffice/negociacoes/${item.entity_id}`;
  return "/backoffice/operacoes";
}

function buildDecisionItems({
  isPlatformStaff,
  workItems,
  escalonamentos,
  now,
}: {
  isPlatformStaff: boolean;
  workItems: WorkItemRow[];
  escalonamentos: EscalonamentoRow[];
  now: Date;
}): DecisionQueueItem[] {
  const escalationItems: DecisionQueueItem[] = escalonamentos
    .filter((item) => item.status === "aguardando_aprovacao")
    .slice(0, 3)
    .map((item) => ({
      id: `escalonamento-${item.id}`,
      title: `Aprovação jurídica: ${empresaNome(item)}`,
      reason: item.motivo,
      href: `/backoffice/cobrancas/${item.cobranca_id}`,
      source: "Escalonamento",
      risk: "Preparação extrajudicial exige decisão autorizada",
      sla: "Prazo jurídico não inferido pela UI",
      owner: "Jurídico/autoridade habilitada",
      tone: "warning",
    }));

  if (!isPlatformStaff) return escalationItems;

  const taskItems: DecisionQueueItem[] = workItems
    .filter((item) => item.status === "aberto" || item.status === "adiado")
    .sort((a, b) => {
      const priority =
        (PRIORIDADE_ORDEM[a.prioridade] ?? 1) - (PRIORIDADE_ORDEM[b.prioridade] ?? 1);
      if (priority !== 0) return priority;
      if (!a.due_at) return 1;
      if (!b.due_at) return -1;
      return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
    })
    .slice(0, 4)
    .map((item) => {
      const overdue = item.due_at ? new Date(item.due_at) < now : false;
      return {
        id: `work-item-${item.id}`,
        title: item.titulo,
        reason: item.motivo ?? item.descricao ?? "Item operacional requer revisão.",
        href: workItemHref(item),
        source: "Central Operacional",
        risk: item.prioridade === "high" ? "Prioridade alta" : "Prioridade operacional",
        sla: item.due_at
          ? `${overdue ? "Vencido em" : "Vence em"} ${new Date(item.due_at).toLocaleDateString("pt-BR")}`
          : "Sem prazo registrado",
        owner: "Equipe GSBC",
        tone: overdue ? "critical" : item.prioridade === "high" ? "warning" : "neutral",
      } satisfies DecisionQueueItem;
    });

  return [...escalationItems, ...taskItems].slice(0, 5);
}

function BarList({
  items,
  total,
}: {
  items: { label: string; value: number; href?: string }[];
  total: number;
}) {
  if (items.every((item) => item.value === 0)) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        Sem valores no escopo atual.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => {
        const width =
          total > 0 ? Math.max((item.value / total) * 100, item.value > 0 ? 4 : 0) : 0;
        const row = (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="truncate font-medium">{item.label}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatCurrency(item.value)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div className="h-2 rounded-full bg-primary" style={{ width: `${width}%` }} />
            </div>
          </div>
        );

        return item.href ? (
          <Link key={item.label} href={item.href} className="block hover:text-primary">
            {row}
          </Link>
        ) : (
          <div key={item.label}>{row}</div>
        );
      })}
    </div>
  );
}

export default async function BackofficeDashboardPage() {
  const user = await requireCurrentUser();
  const supabase = await createClient();
  const now = new Date();
  const currentMonth = monthRange(now);
  const previousMonth = monthRange(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const [
    sindicatosCount,
    empresasCount,
    instrumentosCount,
    usersCount,
    membershipsCount,
    obrigacoesRaw,
    cobrancasRaw,
    negociacoesRaw,
    pagamentosRaw,
    escalonamentosRaw,
    recentAuditLogs,
    workItemsRaw,
  ] = await Promise.all([
    supabase.from("sindicatos").select("id", { count: "exact", head: true }),
    supabase.from("empresas").select("id", { count: "exact", head: true }),
    supabase
      .from("instrumentos")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase.from("obrigacoes").select("id, status, valor_referencia"),
    supabase
      .from("cobrancas")
      .select(
        "id, empresa_id, status, valor_cobranca, vencimento, empresas(razao_social, nome_fantasia)",
      ),
    supabase.from("negociacoes").select("id, status, valor_atual"),
    supabase.from("pagamentos").select("valor, data_pagamento, created_at"),
    supabase
      .from("escalonamentos")
      .select("id, status, motivo, cobranca_id, empresas(razao_social, nome_fantasia)")
      .order("iniciado_em", { ascending: false })
      .limit(10),
    supabase
      .from("audit_logs")
      .select("id, action, entity_type, entity_id, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
    user.isPlatformStaff
      ? supabase
          .from("work_items")
          .select(
            "id, entity_type, entity_id, titulo, descricao, prioridade, due_at, status, motivo",
          )
          .in("status", ["aberto", "adiado"])
      : Promise.resolve({ data: [] }),
  ]);

  const obrigacoes = obrigacoesRaw.data ?? [];
  const cobrancas = (cobrancasRaw.data ?? []) as CobrancaRow[];
  const negociacoes = negociacoesRaw.data ?? [];
  const pagamentos = pagamentosRaw.data ?? [];
  const escalonamentos = (escalonamentosRaw.data ?? []) as EscalonamentoRow[];
  const workItems = (workItemsRaw.data ?? []) as WorkItemRow[];

  const obrigacoesValidas = obrigacoes.filter((o) => !OBRIGACAO_STATUS_EXCLUIDO.has(o.status));
  const valorIdentificado = obrigacoesValidas.reduce(
    (sum, o) => sum + (o.valor_referencia ?? 0),
    0,
  );
  const cobrancasAbertas = cobrancas.filter((c) => isCobrancaAberta(c.status));
  const cobrancasValidadas = cobrancas.filter(
    (c) => !COBRANCA_STATUS_NAO_VALIDADO.has(c.status),
  );
  const valorEmCobranca = cobrancasAbertas.reduce((sum, c) => sum + c.valor_cobranca, 0);
  const cobrancasVencidas = cobrancas.filter((c) => isCobrancaVencida(c, now));
  const valorVencido = cobrancasVencidas.reduce((sum, c) => sum + c.valor_cobranca, 0);
  const totalPago = pagamentos.reduce((sum, p) => sum + p.valor, 0);
  const recebidoMesAtual = pagamentos
    .filter((p) => inRange(p.data_pagamento, currentMonth.start, currentMonth.next))
    .reduce((sum, p) => sum + p.valor, 0);
  const recebidoMesAnterior = pagamentos
    .filter((p) => inRange(p.data_pagamento, previousMonth.start, previousMonth.next))
    .reduce((sum, p) => sum + p.valor, 0);
  const cobrancasMesAtual = cobrancasValidadas
    .filter((c) => c.vencimento && inRange(c.vencimento, currentMonth.start, currentMonth.next))
    .reduce((sum, c) => sum + c.valor_cobranca, 0);
  const cobrancasMesAnterior = cobrancasValidadas
    .filter((c) => c.vencimento && inRange(c.vencimento, previousMonth.start, previousMonth.next))
    .reduce((sum, c) => sum + c.valor_cobranca, 0);
  const negociacoesAbertas = negociacoes.filter((n) =>
    ["aberta", "em_negociacao"].includes(n.status),
  );
  const aging = agingBuckets(cobrancas, now);
  const concentration = topConcentration(cobrancas);
  const decisions = buildDecisionItems({
    isPlatformStaff: user.isPlatformStaff,
    workItems,
    escalonamentos,
    now,
  });

  const atividadeRecente: TimelineItem[] = (recentAuditLogs.data ?? []).map((log) => ({
    id: log.id,
    label: auditLabel(log.action),
    description: log.entity_id
      ? `${log.entity_type} #${log.entity_id.slice(0, 8)}`
      : log.entity_type,
    timestamp: log.created_at,
  }));

  const periodoLabel = now.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  const updatedAt = now.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Executive Command Center"
        description={
          user.isPlatformStaff
            ? "Posição econômica, risco operacional e decisões suportadas da operação GSBC."
            : `Posição econômica, risco e acompanhamento autorizado — ${user.memberships[0]?.tenantName}.`
        }
        metadata={
          <>
            <span>Período principal: {periodoLabel}</span>
            <span>Atualizado em {updatedAt}</span>
            <span>Escopo aplicado por RLS/tenant</span>
          </>
        }
      />

      <section
        aria-labelledby="executive-pulse-heading"
        className="grid gap-4 xl:grid-cols-[1.25fr_0.9fr_0.9fr]"
      >
        <div className="xl:col-span-3">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 id="executive-pulse-heading" className="text-sm font-semibold">
              Zone A — Executive Pulse
            </h2>
          </div>
        </div>
        <ExecutiveKpi
          hero
          label="Recebido confirmado"
          value={formatCurrency(totalPago, true)}
          period="Ledger de pagamentos, todo o histórico visível"
          context="Dinheiro efetivamente registrado em pagamentos. Não inclui potencial, forecast ou oportunidade."
          tone="positive"
          href="/backoffice/financeiro"
          comparison={compareCurrency(recebidoMesAtual, recebidoMesAnterior)}
          supporting={
            <span>
              {formatCurrency(recebidoMesAtual)} recebido em {periodoLabel}.
            </span>
          }
        />
        <ExecutiveKpi
          hero
          label="Exposição em cobrança"
          value={formatCurrency(valorEmCobranca, true)}
          period="Cobranças não encerradas"
          context="Valor de cobranças abertas, suspensas, negociando, contestadas ou em escalonamento. Não é receita recebida."
          href="/backoffice/cobrancas"
          comparison={compareCurrency(cobrancasMesAtual, cobrancasMesAnterior)}
          supporting={<span>{cobrancasAbertas.length} cobrança(s) abertas no escopo.</span>}
        />
        <ExecutiveKpi
          hero
          label="Exposição vencida"
          value={formatCurrency(valorVencido, true)}
          period="Status vencido ou vencimento passado"
          context="Risco operacional baseado em cobranças não encerradas. Prazo jurídico não é inferido."
          tone={valorVencido > 0 ? "critical" : "default"}
          href="/backoffice/cobrancas?status=overdue"
          supporting={<span>{cobrancasVencidas.length} cobrança(s) com risco de atraso.</span>}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <ExecutiveKpi
          label="Receita identificada"
          value={formatCurrency(valorIdentificado, true)}
          period="Obrigações válidas"
          context="Valor de referência upstream; não é dívida nem recebido."
          href="/backoffice/receita"
        />
        <ExecutiveKpi
          label="Negociações abertas"
          value={String(negociacoesAbertas.length)}
          period="Status aberto/em negociação"
          context="Acordo não equivale a pagamento."
          href="/backoffice/negociacoes"
        />
        <ExecutiveKpi
          label="Empresas visíveis"
          value={String(empresasCount.count ?? 0)}
          period="Escopo atual"
          context="Empresas filtradas por RLS/tenant."
          href="/backoffice/empresas"
        />
        <ExecutiveKpi
          label="Instrumentos vigentes"
          value={String(instrumentosCount.count ?? 0)}
          period="Status active"
          context="Base normativa rastreável."
          href="/backoffice/instrumentos"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <ChartFrame
          title="Zone B — Performance & Risk"
          question="Onde a exposição aberta está concentrada e em que faixa de vencimento?"
          metric="Soma de valor_cobranca de cobranças não encerradas"
          period="Posição atual"
          action={
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href="/backoffice/cobrancas">Abrir cobranças</Link>}
            />
          }
          fallback={
            <ul>
              {aging.map((bucket) => (
                <li key={bucket.label}>
                  {bucket.label}: {formatCurrency(bucket.value)}
                </li>
              ))}
            </ul>
          }
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <h3 className="text-sm font-semibold">Aging de cobrança</h3>
              </div>
              <BarList items={aging} total={valorEmCobranca} />
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <h3 className="text-sm font-semibold">Concentração por empresa</h3>
              </div>
              <BarList items={concentration} total={valorEmCobranca} />
            </div>
          </div>
        </ChartFrame>

        <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-semibold">Zone D — Executive Intelligence</h2>
              <p className="text-sm text-muted-foreground">
                Leituras determinísticas, sem IA generativa e sem causalidade inventada.
              </p>
            </div>
            <StatusBadge label="Determinístico" tone="info" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-border-subtle p-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CircleDollarSign className="h-4 w-4 text-success" aria-hidden="true" />
                Recebimento do mês
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {compareCurrency(recebidoMesAtual, recebidoMesAnterior)}.
              </p>
            </div>
            <div className="rounded-md border border-border-subtle p-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Receipt className="h-4 w-4 text-primary" aria-hidden="true" />
                Cobrança do mês
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {compareCurrency(cobrancasMesAtual, cobrancasMesAnterior)} por vencimento.
              </p>
            </div>
            <div className="rounded-md border border-border-subtle p-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
                Principal risco
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {valorVencido > 0
                  ? `${formatCurrency(valorVencido)} estão vencidos ou com vencimento passado.`
                  : "Não há exposição vencida visível no escopo atual."}
              </p>
            </div>
            <div className="rounded-md border border-border-subtle p-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                Invariante preservado
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Oportunidade, cobertura, obrigação e dívida permanecem separadas nos labels.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <DecisionQueue items={decisions} />

        <section className="flex flex-col gap-4 rounded-lg border bg-card p-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold">Contexto operacional</h2>
            <p className="text-sm text-muted-foreground">
              Volume visível que explica a escala da operação sem competir com os KPIs executivos.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-md border border-border-subtle p-3">
              <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold tabular-nums">{usersCount.count ?? 0}</p>
                <p className="text-xs text-muted-foreground">Usuários visíveis</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-md border border-border-subtle p-3">
              <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold tabular-nums">
                  {membershipsCount.count ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Memberships ativas</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-md border border-border-subtle p-3">
              <Handshake className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold tabular-nums">{negociacoes.length}</p>
                <p className="text-xs text-muted-foreground">Negociações totais visíveis</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-md border border-border-subtle p-3">
              <Building className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold tabular-nums">{sindicatosCount.count ?? 0}</p>
                <p className="text-xs text-muted-foreground">
                  {user.isPlatformStaff ? "Sindicatos ativos" : "Meu sindicato"}
                </p>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-fit"
            nativeButton={false}
            render={
              <Link href="/backoffice/receita">
                Ver análise de receita <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            }
          />
        </section>
      </section>

      <section className="flex flex-col gap-4 rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold">Atividade recente auditável</h2>
          <p className="text-sm text-muted-foreground">
            Eventos reais do audit log no escopo autorizado. Correções históricas devem ocorrer por novos eventos.
          </p>
        </div>
        <Timeline items={atividadeRecente} />
      </section>
    </div>
  );
}
