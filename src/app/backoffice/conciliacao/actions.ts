"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit/log";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

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
