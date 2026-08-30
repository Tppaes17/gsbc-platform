"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit/log";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { parseCurrency } from "@/lib/validation/pagamento";

export interface ReconciliationActionState {
  error: string | null;
  success: boolean;
}

const divergenceStatusSchema = z.object({
  divergenceId: z.string().guid(),
  status: z.enum(["in_review", "dismissed"]),
});

const retrySchema = z.object({
  reconciliationId: z.string().guid(),
});

const repasseTransitionSchema = z.object({
  repasseId: z.string().guid(),
  status: z.enum(["scheduled", "paid", "failed", "cancelled"]),
  scheduledFor: z.string().trim().optional().or(z.literal("")),
  externalTransferId: z.string().trim().optional().or(z.literal("")),
  reason: z.string().trim().optional().or(z.literal("")),
});

const compensationEventSchema = z.object({
  reconciliationId: z.string().guid(),
  eventType: z.enum(["refund", "chargeback", "credit", "reversal"]),
  amount: z.string().trim().min(1, "Informe o valor do evento."),
  reason: z.string().trim().min(3, "Informe a justificativa."),
  providerReference: z.string().trim().optional().or(z.literal("")),
});

export async function updateDivergenceStatusAction(
  _prevState: ReconciliationActionState,
  formData: FormData,
): Promise<ReconciliationActionState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return { error: "Apenas a equipe GSBC pode triar divergências financeiras.", success: false };
  }

  const parsed = divergenceStatusSchema.safeParse({
    divergenceId: formData.get("divergenceId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", success: false };
  }

  const input = parsed.data;
  const supabase = await createClient();
  const { data: before } = await supabase
    .from("reconciliation_divergences")
    .select("id, tenant_id, status, reconciliation_id, reason")
    .eq("id", input.divergenceId)
    .single();

  if (!before) {
    return { error: "Divergência não encontrada.", success: false };
  }

  const resolvedFields =
    input.status === "dismissed"
      ? { resolved_at: new Date().toISOString(), resolved_by: user.id }
      : { resolved_at: null, resolved_by: null };

  const { error } = await supabase
    .from("reconciliation_divergences")
    .update({ status: input.status, ...resolvedFields })
    .eq("id", input.divergenceId);

  if (error) {
    return { error: "Não foi possível atualizar a divergência.", success: false };
  }

  await logAuditEvent({
    tenantId: before.tenant_id,
    action: `reconciliation_divergence.${input.status}`,
    entityType: "reconciliation_divergence",
    entityId: input.divergenceId,
    oldData: { status: before.status },
    newData: { status: input.status, reconciliation_id: before.reconciliation_id, reason: before.reason },
  });

  revalidatePath("/backoffice/conciliacao");
  return { error: null, success: true };
}

export async function retryManualReconciliationAction(
  _prevState: ReconciliationActionState,
  formData: FormData,
): Promise<ReconciliationActionState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return { error: "Apenas a equipe GSBC pode reprocessar conciliações financeiras.", success: false };
  }

  const parsed = retrySchema.safeParse({
    reconciliationId: formData.get("reconciliationId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", success: false };
  }

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("payment_reconciliations")
    .select("id, tenant_id, status, gross_amount, processing_error")
    .eq("id", parsed.data.reconciliationId)
    .single();

  if (!before) {
    return { error: "Conciliação não encontrada.", success: false };
  }

  const { error } = await supabase.rpc("retry_manual_payment_reconciliation", {
    p_reconciliation_id: parsed.data.reconciliationId,
  });

  if (error) {
    return { error: error.message, success: false };
  }

  await logAuditEvent({
    tenantId: before.tenant_id,
    action: "payment_reconciliation.retried",
    entityType: "payment_reconciliation",
    entityId: before.id,
    oldData: { status: before.status, processing_error: before.processing_error },
    newData: { status: "reconciled", gross_amount: before.gross_amount },
  });

  revalidatePath("/backoffice/conciliacao");
  revalidatePath("/backoffice/financeiro");
  return { error: null, success: true };
}

export async function transitionFinancialRepasseAction(
  _prevState: ReconciliationActionState,
  formData: FormData,
): Promise<ReconciliationActionState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return { error: "Apenas a equipe GSBC pode alterar repasses financeiros.", success: false };
  }

  const parsed = repasseTransitionSchema.safeParse({
    repasseId: formData.get("repasseId"),
    status: formData.get("status"),
    scheduledFor: formData.get("scheduledFor") || undefined,
    externalTransferId: formData.get("externalTransferId") || undefined,
    reason: formData.get("reason") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", success: false };
  }

  const input = parsed.data;
  const supabase = await createClient();
  const { data: before } = await supabase
    .from("financial_repasses")
    .select("id, tenant_id, status, amount, beneficiary_type, external_transfer_id")
    .eq("id", input.repasseId)
    .single();

  if (!before) {
    return { error: "Repasse não encontrado.", success: false };
  }

  const { error } = await supabase.rpc("transition_financial_repasse", {
    p_repasse_id: input.repasseId,
    p_status: input.status,
    p_scheduled_for: input.scheduledFor || null,
    p_external_transfer_id: input.externalTransferId || null,
    p_reason: input.reason || null,
  });

  if (error) {
    return { error: error.message, success: false };
  }

  await logAuditEvent({
    tenantId: before.tenant_id,
    action: `financial_repasse.${input.status}`,
    entityType: "financial_repasse",
    entityId: before.id,
    oldData: {
      status: before.status,
      external_transfer_id: before.external_transfer_id,
    },
    newData: {
      status: input.status,
      amount: before.amount,
      beneficiary_type: before.beneficiary_type,
      scheduled_for: input.scheduledFor || null,
      external_transfer_id: input.externalTransferId || null,
      reason: input.reason || null,
    },
  });

  revalidatePath("/backoffice/conciliacao");
  return { error: null, success: true };
}

export async function registerCompensationEventAction(
  _prevState: ReconciliationActionState,
  formData: FormData,
): Promise<ReconciliationActionState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return { error: "Apenas a equipe GSBC pode registrar evento compensatório.", success: false };
  }

  const parsed = compensationEventSchema.safeParse({
    reconciliationId: formData.get("reconciliationId"),
    eventType: formData.get("eventType"),
    amount: formData.get("amount"),
    reason: formData.get("reason"),
    providerReference: formData.get("providerReference") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", success: false };
  }

  const input = parsed.data;
  const amount = parseCurrency(input.amount);
  if (Number.isNaN(amount) || amount <= 0) {
    return { error: "Valor do evento compensatório inválido.", success: false };
  }

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("payment_reconciliations")
    .select("id, tenant_id, status, gross_amount")
    .eq("id", input.reconciliationId)
    .single();

  if (!before) {
    return { error: "Conciliação não encontrada.", success: false };
  }

  const { data: eventId, error } = await supabase.rpc("register_payment_compensation_event", {
    p_reconciliation_id: input.reconciliationId,
    p_event_type: input.eventType,
    p_amount: amount,
    p_reason: input.reason,
    p_provider_reference: input.providerReference || null,
    p_metadata: { source: "staff_ui" },
  });

  if (error || !eventId) {
    return { error: error?.message ?? "Não foi possível registrar o evento compensatório.", success: false };
  }

  await logAuditEvent({
    tenantId: before.tenant_id,
    action: `payment_compensation_event.${input.eventType}`,
    entityType: "payment_reconciliation",
    entityId: before.id,
    oldData: { status: before.status, gross_amount: before.gross_amount },
    newData: {
      event_id: eventId,
      event_type: input.eventType,
      amount,
      reason: input.reason,
      provider_reference: input.providerReference || null,
    },
  });

  revalidatePath("/backoffice/conciliacao");
  revalidatePath("/backoffice/financeiro");
  return { error: null, success: true };
}
