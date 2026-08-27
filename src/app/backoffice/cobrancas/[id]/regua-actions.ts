"use server";

import { revalidatePath } from "next/cache";
import { logAuditEvent } from "@/lib/audit/log";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export interface ReguaActionState {
  error: string | null;
}

type EnrollmentUpdate = Database["public"]["Tables"]["collection_enrollments"]["Update"];

// Só faz sentido iniciar a régua depois que a cobrança foi validada e
// aprovada pra cobrança de verdade — uma cobrança ainda em rascunho ou
// aguardando validação não deve receber contato automático de dunning.
const STATUS_PODE_INICIAR_REGUA = new Set([
  "approved",
  "notified",
  "contacted",
  "negotiating",
  "overdue",
]);

export async function iniciarReguaAction(cobrancaId: string): Promise<ReguaActionState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return { error: "Apenas a equipe GSBC pode iniciar a régua de cobrança." };
  }

  const supabase = await createClient();

  const { data: cobranca } = await supabase
    .from("cobrancas")
    .select("id, tenant_id, empresa_id, status")
    .eq("id", cobrancaId)
    .single();

  if (!cobranca) {
    return { error: "Cobrança não encontrada." };
  }

  if (!STATUS_PODE_INICIAR_REGUA.has(cobranca.status)) {
    return {
      error:
        "A cobrança precisa estar aprovada (ou em etapa posterior) antes de iniciar a régua automática.",
    };
  }

  const { data: strategy } = await supabase
    .from("collection_strategies")
    .select("id")
    .eq("ativa", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!strategy) {
    return { error: "Nenhuma régua de cobrança ativa configurada." };
  }

  const { error } = await supabase.from("collection_enrollments").insert({
    cobranca_id: cobrancaId,
    strategy_id: strategy.id,
    tenant_id: cobranca.tenant_id,
    empresa_id: cobranca.empresa_id,
    enrolled_by: user.id,
  });

  if (error) {
    if (error.message.includes("duplicate key")) {
      return { error: "Esta cobrança já está numa régua ativa." };
    }
    return { error: "Não foi possível iniciar a régua de cobrança." };
  }

  await logAuditEvent({
    tenantId: cobranca.tenant_id,
    action: "collection.enrollment.iniciado",
    entityType: "cobranca",
    entityId: cobrancaId,
    newData: { strategy_id: strategy.id },
  });

  revalidatePath(`/backoffice/cobrancas/${cobrancaId}`);
  return { error: null };
}

async function alterarStatusEnrollment(
  enrollmentId: string,
  cobrancaId: string,
  update: EnrollmentUpdate,
  action: string,
): Promise<ReguaActionState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return { error: "Apenas a equipe GSBC pode gerenciar a régua de cobrança." };
  }

  const supabase = await createClient();

  const { data: enrollment } = await supabase
    .from("collection_enrollments")
    .select("tenant_id")
    .eq("id", enrollmentId)
    .single();

  const { error } = await supabase
    .from("collection_enrollments")
    .update(update)
    .eq("id", enrollmentId);

  if (error) {
    return { error: "Não foi possível atualizar a régua de cobrança." };
  }

  await logAuditEvent({
    tenantId: enrollment?.tenant_id ?? null,
    action,
    entityType: "cobranca",
    entityId: cobrancaId,
    newData: update,
  });

  revalidatePath(`/backoffice/cobrancas/${cobrancaId}`);
  return { error: null };
}

export async function pausarReguaAction(
  enrollmentId: string,
  cobrancaId: string,
): Promise<ReguaActionState> {
  const user = await requireCurrentUser();
  return alterarStatusEnrollment(
    enrollmentId,
    cobrancaId,
    {
      status: "paused",
      paused_at: new Date().toISOString(),
      paused_by: user.id,
      paused_reason: "Pausada manualmente pela equipe GSBC.",
    },
    "collection.enrollment.pausado",
  );
}

export async function retomarReguaAction(
  enrollmentId: string,
  cobrancaId: string,
): Promise<ReguaActionState> {
  return alterarStatusEnrollment(
    enrollmentId,
    cobrancaId,
    { status: "active", paused_at: null, paused_by: null, paused_reason: null },
    "collection.enrollment.retomado",
  );
}

export async function cancelarReguaAction(
  enrollmentId: string,
  cobrancaId: string,
): Promise<ReguaActionState> {
  return alterarStatusEnrollment(
    enrollmentId,
    cobrancaId,
    {
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_reason: "Cancelada manualmente pela equipe GSBC.",
    },
    "collection.enrollment.cancelado",
  );
}
