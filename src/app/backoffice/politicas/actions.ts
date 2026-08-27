"use server";

import { revalidatePath } from "next/cache";
import { logAuditEvent } from "@/lib/audit/log";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export interface AlternarPolicyState {
  error: string | null;
  success: boolean;
}

export async function alternarPolicyAction(
  _prevState: AlternarPolicyState,
  formData: FormData,
): Promise<AlternarPolicyState> {
  const user = await requireCurrentUser();
  if (!user.isOwner) {
    return { error: "Apenas o Owner pode ativar/desativar uma política.", success: false };
  }

  const policyId = formData.get("policyId");
  const ativa = formData.get("ativa");
  const motivo = formData.get("motivo");

  if (typeof policyId !== "string" || !policyId) {
    return { error: "Política inválida.", success: false };
  }
  if (ativa !== "true" && ativa !== "false") {
    return { error: "Estado inválido.", success: false };
  }
  if (typeof motivo !== "string" || motivo.trim().length < 5) {
    return { error: "Justifique a mudança (mínimo 5 caracteres).", success: false };
  }

  const supabase = await createClient();
  const isAtivar = ativa === "true";

  const { error } = await supabase.rpc("alternar_policy_ativa", {
    p_policy_id: policyId,
    p_ativa: isAtivar,
    p_motivo: motivo,
  });

  if (error) {
    return { error: "Não foi possível atualizar a política.", success: false };
  }

  await logAuditEvent({
    tenantId: null,
    action: isAtivar ? "policy.ativada" : "policy.desativada",
    entityType: "policy",
    entityId: null,
    newData: { policyId, motivo },
  });

  revalidatePath("/backoffice/politicas");
  return { error: null, success: true };
}
