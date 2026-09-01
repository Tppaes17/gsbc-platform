import { redirect } from "next/navigation";
import { CircleDollarSign, FileWarning, RotateCw, SplitSquareHorizontal } from "lucide-react";
import { MetricCard } from "@/components/design-system/metric-card";
import { PageHeader } from "@/components/design-system/page-header";
import { StatusBadge } from "@/components/design-system/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  CompensationEventForm,
  DivergenceStatusButtons,
  RepasseTransitionForm,
  RetryReconciliationButton,
} from "./reconciliation-actions";

type ReconciliationStatus =
  | "pending"
  | "provider_reported"
  | "reconciling"
  | "partial"
  | "mismatch"
  | "manual_review"
  | "reconciled"
  | "unidentified"
  | "reversed"
  | "chargeback"
  | "failed_review_required";

const reconciliationStatusLabel: Record<ReconciliationStatus, string> = {
  pending: "Pendente",
  provider_reported: "Pagamento reportado externamente",
  reconciling: "Conciliando",
  partial: "Parcial",
  mismatch: "Divergente",
  manual_review: "Revisão manual",
  reconciled: "Conciliado",
  unidentified: "Não identificado",
  reversed: "Estornado",
  chargeback: "Chargeback",
  failed_review_required: "Falha em revisão",
};

const reconciliationTone: Record<ReconciliationStatus, "neutral" | "info" | "positive" | "warning" | "negative"> = {
  pending: "neutral",
  provider_reported: "info",
  reconciling: "info",
  partial: "warning",
  mismatch: "negative",
  manual_review: "warning",
  reconciled: "positive",
  unidentified: "warning",
  reversed: "negative",
  chargeback: "negative",
  failed_review_required: "negative",
};

const divergenceStatusLabel: Record<string, string> = {
  open: "Aberta",
  in_review: "Em análise",
  resolved: "Resolvida",
  dismissed: "Dispensada",
};

const divergenceTone: Record<string, "neutral" | "info" | "positive" | "warning" | "negative"> = {
  open: "warning",
  in_review: "info",
  resolved: "positive",
  dismissed: "neutral",
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDate(value: string | null) {
  if (!value) return "sem data";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export default async function ConciliacaoPage() {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    redirect("/backoffice");
  }

  const supabase = await createClient();
  const [
    { data: reconciliationsRaw },
    { data: divergencesRaw },
    { data: splitsRaw },
    { data: repassesRaw },
    { data: compensationRaw },
  ] = await Promise.all([
      supabase
        .from("payment_reconciliations")
        .select(
          "id, tenant_id, empresa_id, cobranca_id, pagamento_id, provider, provider_status, gross_amount, provider_fee_amount, net_amount, status, split_rule_version, processing_error, reconciled_at, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("reconciliation_divergences")
        .select("id, tenant_id, reconciliation_id, provider, external_reference, status, reason, created_at, resolved_at")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("payment_split_items")
        .select("id, reconciliation_id, beneficiary_type, gross_share_amount, fee_share_amount, net_amount, status")
        .order("beneficiary_type"),
      supabase
        .from("financial_repasses")
        .select("id, split_item_id, beneficiary_type, amount, status, scheduled_for, paid_at, external_transfer_id"),
      supabase
        .from("payment_compensation_events")
        .select("id, reconciliation_id, event_type, amount, reason, provider_reference, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  const reconciliations = reconciliationsRaw ?? [];
  const divergences = divergencesRaw ?? [];
  const splitsByReconciliation = new Map<string, typeof splitsRaw>();
  for (const split of splitsRaw ?? []) {
    const current = splitsByReconciliation.get(split.reconciliation_id) ?? [];
    current.push(split);
    splitsByReconciliation.set(split.reconciliation_id, current);
  }

  const repassesBySplit = new Map((repassesRaw ?? []).map((repasse) => [repasse.split_item_id, repasse]));
  const compensationByReconciliation = new Map<string, typeof compensationRaw>();
  for (const event of compensationRaw ?? []) {
    const current = compensationByReconciliation.get(event.reconciliation_id) ?? [];
    current.push(event);
    compensationByReconciliation.set(event.reconciliation_id, current);
  }
  const openDivergences = divergences.filter((divergence) => divergence.status === "open");
  const manualReview = reconciliations.filter((reconciliation) => reconciliation.status === "manual_review");
  const reconciled = reconciliations.filter((reconciliation) => reconciliation.status === "reconciled");
  const pendingRepasse = (repassesRaw ?? []).filter((repasse) => repasse.status === "pending");
  const paidRepasse = (repassesRaw ?? []).filter((repasse) => repasse.status === "paid");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Conciliação"
        description="Fila financeira para revisar divergências, reprocessar conciliações e acompanhar splits/repasses derivados."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Revisão manual" value={String(manualReview.length)} icon={FileWarning} tone="warning" />
        <MetricCard label="Divergências abertas" value={String(openDivergences.length)} icon={RotateCw} tone="warning" />
        <MetricCard label="Conciliadas" value={String(reconciled.length)} icon={SplitSquareHorizontal} tone="positive" />
        <MetricCard
          label="Repasses pendentes"
          value={`${pendingRepasse.length} / ${paidRepasse.length} pagos`}
          icon={CircleDollarSign}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conciliações recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">Criada em</th>
                  <th className="py-2 pr-4 font-medium">Origem externa</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Valores</th>
                  <th className="py-2 pr-4 font-medium">Split / repasse</th>
                  <th className="py-2 pr-4 font-medium">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reconciliations.map((reconciliation) => {
                  const splits = splitsByReconciliation.get(reconciliation.id) ?? [];
                  const compensationEvents = compensationByReconciliation.get(reconciliation.id) ?? [];
                  return (
                    <tr key={reconciliation.id}>
                      <td className="py-3 pr-4 text-muted-foreground">{formatDateTime(reconciliation.created_at)}</td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-col">
                          <span className="font-medium">{reconciliation.provider ?? "—"}</span>
                          <span className="text-xs text-muted-foreground">{reconciliation.provider_status ?? "sem status"}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-col gap-1">
                          <StatusBadge
                            label={reconciliationStatusLabel[reconciliation.status]}
                            tone={reconciliationTone[reconciliation.status]}
                          />
                          {reconciliation.processing_error ? (
                            <span className="max-w-72 text-xs text-muted-foreground">{reconciliation.processing_error}</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        Bruto {formatCurrency(reconciliation.gross_amount)}
                        <br />
                        Taxa externa {formatCurrency(reconciliation.provider_fee_amount)}
                        <br />
                        Líquido {formatCurrency(reconciliation.net_amount)}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {splits.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            <span>Regra v{reconciliation.split_rule_version}</span>
                            {splits.map((split) => {
                              const repasse = repassesBySplit.get(split.id);
                              return (
                                <div key={split.id} className="text-xs">
                                  <span>
                                    {split.beneficiary_type}: {formatCurrency(split.net_amount)}
                                    {repasse ? ` · repasse ${repasse.status}` : ""}
                                  </span>
                                  {repasse ? (
                                    <div className="text-muted-foreground/80">
                                      {repasse.scheduled_for ? `agendado ${formatDate(repasse.scheduled_for)}` : null}
                                      {repasse.external_transfer_id ? ` · ref. ${repasse.external_transfer_id}` : null}
                                      {repasse.paid_at ? ` · pago ${formatDateTime(repasse.paid_at)}` : null}
                                    </div>
                                  ) : null}
                                  {repasse ? (
                                    <RepasseTransitionForm repasseId={repasse.id} status={repasse.status} />
                                  ) : null}
                                </div>
                              );
                            })}
                            {compensationEvents.length > 0 ? (
                              <div className="mt-2 flex flex-col gap-1 border-t pt-2">
                                {compensationEvents.map((event) => (
                                  <span key={event.id} className="text-xs">
                                    {event.event_type}: {formatCurrency(event.amount)} · {event.reason}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          "Sem split aplicado"
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {reconciliation.status === "manual_review" ||
                        reconciliation.status === "failed_review_required" ||
                        reconciliation.status === "mismatch" ||
                        reconciliation.status === "partial" ||
                        reconciliation.status === "unidentified" ? (
                          <RetryReconciliationButton reconciliationId={reconciliation.id} />
                        ) : (
                          <div className="min-w-72">
                            <span className="text-xs text-muted-foreground">Sem reprocessamento disponível</span>
                            {reconciliation.status === "reconciled" ? (
                              <CompensationEventForm
                                reconciliationId={reconciliation.id}
                                grossAmount={reconciliation.gross_amount}
                              />
                            ) : null}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {reconciliations.length === 0 ? (
                  <tr>
                    <td className="py-6 text-muted-foreground" colSpan={6}>
                      Nenhuma conciliação registrada ainda.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Divergências financeiras</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="border-b text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">Criada em</th>
                  <th className="py-2 pr-4 font-medium">Referência</th>
                  <th className="py-2 pr-4 font-medium">Motivo</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {divergences.map((divergence) => (
                  <tr key={divergence.id}>
                    <td className="py-3 pr-4 text-muted-foreground">{formatDateTime(divergence.created_at)}</td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-col">
                        <span className="font-medium">{divergence.provider ?? "—"}</span>
                        <span className="text-xs text-muted-foreground">{divergence.external_reference ?? "sem referência"}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{divergence.reason}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge
                        label={divergenceStatusLabel[divergence.status] ?? divergence.status}
                        tone={divergenceTone[divergence.status] ?? "neutral"}
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <DivergenceStatusButtons divergenceId={divergence.id} status={divergence.status} />
                    </td>
                  </tr>
                ))}
                {divergences.length === 0 ? (
                  <tr>
                    <td className="py-6 text-muted-foreground" colSpan={5}>
                      Nenhuma divergência financeira registrada.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
