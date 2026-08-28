import Link from "next/link";
import {
  Building,
  Building2,
  CircleDollarSign,
  FileText,
  Handshake,
  Receipt,
  ScrollText,
  Users,
} from "lucide-react";
import { MetricCard } from "@/components/design-system/metric-card";
import { PageHeader } from "@/components/design-system/page-header";
import { PageSection } from "@/components/design-system/page-section";
import { RiskPanel } from "@/components/design-system/risk-panel";
import { Timeline, type TimelineItem } from "@/components/design-system/timeline";
import { Button } from "@/components/ui/button";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const COBRANCA_STATUS_ENCERRADO = ["paid", "cancelled", "closed"];

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

function auditLabel(action: string) {
  return AUDIT_ACTION_LABEL[action] ?? action;
}

export default async function BackofficeDashboardPage() {
  const user = await requireCurrentUser();
  const supabase = await createClient();

  const [
    sindicatosCount,
    empresasCount,
    instrumentosCount,
    cobrancasAbertas,
    negociacoesAbertas,
    pagamentos,
    usersCount,
    membershipsCount,
    recentAuditLogs,
    workItemsAbertos,
  ] = await Promise.all([
    supabase.from("sindicatos").select("id", { count: "exact", head: true }),
    supabase.from("empresas").select("id", { count: "exact", head: true }),
    supabase
      .from("instrumentos")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("cobrancas")
      .select("valor_cobranca")
      .not("status", "in", `(${COBRANCA_STATUS_ENCERRADO.join(",")})`),
    supabase
      .from("negociacoes")
      .select("id", { count: "exact", head: true })
      .in("status", ["aberta", "em_negociacao"]),
    supabase.from("pagamentos").select("valor"),
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("audit_logs")
      .select("id, action, entity_type, entity_id, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    user.isPlatformStaff
      ? supabase.from("work_items").select("id, due_at").in("status", ["aberto", "adiado"])
      : Promise.resolve({ data: null }),
  ]);

  const valorEmCobranca = (cobrancasAbertas.data ?? []).reduce(
    (sum, c) => sum + c.valor_cobranca,
    0,
  );
  const totalPago = (pagamentos.data ?? []).reduce((sum, p) => sum + p.valor, 0);

  const agora = new Date().getTime();
  const itensAbertos = workItemsAbertos.data ?? [];
  const itensVencidos = itensAbertos.filter(
    (i) => i.due_at && new Date(i.due_at).getTime() < agora,
  );

  const atividadeRecente: TimelineItem[] = (recentAuditLogs.data ?? []).map((log) => ({
    id: log.id,
    label: auditLabel(log.action),
    description: log.entity_id
      ? `${log.entity_type} #${log.entity_id.slice(0, 8)}`
      : log.entity_type,
    timestamp: log.created_at,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Olá, ${user.fullName.split(" ")[0]}`}
        description={
          user.isPlatformStaff
            ? "Visão geral da operação GSBC."
            : `Visão geral — ${user.memberships[0]?.tenantName}.`
        }
      />

      <PageSection title="Tamanho da operação">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <MetricCard
            label={user.isPlatformStaff ? "Sindicatos ativos" : "Meu sindicato"}
            value={String(sindicatosCount.count ?? 0)}
            icon={Building2}
          />
          <MetricCard
            label="Empresas cadastradas"
            value={String(empresasCount.count ?? 0)}
            icon={Building}
            hint="Escopo aplicado por RLS por tenant."
          />
          <MetricCard
            label="Instrumentos vigentes"
            value={String(instrumentosCount.count ?? 0)}
            icon={FileText}
            hint="Escopo aplicado por RLS por tenant."
          />
          <MetricCard
            label="Usuários visíveis"
            value={String(usersCount.count ?? 0)}
            icon={Users}
            hint="Escopo aplicado por RLS por tenant."
          />
          <MetricCard
            label="Memberships ativas"
            value={String(membershipsCount.count ?? 0)}
            icon={ScrollText}
          />
        </div>
      </PageSection>

      <PageSection title="Quanto está sendo movimentado">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            label="Valor em cobrança"
            value={valorEmCobranca.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
            icon={Receipt}
            hint={`${cobrancasAbertas.data?.length ?? 0} cobrança(s) em aberto.`}
          />
          <MetricCard
            label="Negociações em andamento"
            value={String(negociacoesAbertas.count ?? 0)}
            icon={Handshake}
          />
          <MetricCard
            label="Total pago"
            value={totalPago.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
            icon={CircleDollarSign}
          />
        </div>
      </PageSection>

      {user.isPlatformStaff && itensAbertos.length > 0 ? (
        <PageSection title="Atenção necessária">
          <RiskPanel
            tone={itensVencidos.length > 0 ? "negative" : "warning"}
            title={
              itensVencidos.length > 0
                ? `${itensVencidos.length} item(ns) vencido(s) na fila operacional`
                : `${itensAbertos.length} item(ns) aberto(s) na fila operacional`
            }
            description="Tarefas da régua de cobrança, falhas de automação, escalonamentos e negociações paradas."
            action={
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href="/backoffice/operacoes">Ver central operacional</Link>}
              />
            }
          />
        </PageSection>
      ) : null}

      <PageSection title="O que aconteceu recentemente">
        <Timeline items={atividadeRecente} />
      </PageSection>
    </div>
  );
}
