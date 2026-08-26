"use server";

import { revalidatePath } from "next/cache";
import { logAuditEvent } from "@/lib/audit/log";
import { requireCurrentUser } from "@/lib/auth/session";
import { canManageTenantMembers } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { inviteMembershipSchema } from "@/lib/validation/membership";

export interface InviteMembershipState {
  error: string | null;
  success: boolean;
}

export async function inviteMembershipAction(
  _prevState: InviteMembershipState,
  formData: FormData,
): Promise<InviteMembershipState> {
  const currentUser = await requireCurrentUser();

  const parsed = inviteMembershipSchema.safeParse({
    email: formData.get("email"),
    fullName: formData.get("fullName"),
    tenantId: formData.get("tenantId"),
    roleId: formData.get("roleId"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      success: false,
    };
  }

  const input = parsed.data;

  if (!canManageTenantMembers(currentUser, input.tenantId)) {
    return {
      error: "Você não tem permissão para convidar membros para este tenant.",
      success: false,
    };
  }

  const admin = createAdminClient();

  const { data: existingUser } = await admin
    .from("users")
    .select("id")
    .eq("email", input.email)
    .maybeSingle();

  let userId = existingUser?.id;

  if (!userId) {
    const { data: invited, error: inviteError } =
      await admin.auth.admin.inviteUserByEmail(input.email, {
        data: { full_name: input.fullName },
      });

    if (inviteError || !invited.user) {
      return {
        error: "Não foi possível enviar o convite. Verifique o e-mail informado.",
        success: false,
      };
    }

    userId = invited.user.id;
  }

  const supabase = await createClient();
  const { error: membershipError } = await supabase.from("memberships").insert({
    tenant_id: input.tenantId,
    user_id: userId,
    role_id: input.roleId,
    status: "invited",
    invited_by: currentUser.id,
  });

  if (membershipError) {
    if (membershipError.message.includes("duplicate key")) {
      return {
        error: "Este usuário já é membro deste tenant.",
        success: false,
      };
    }
    return {
      error: "Convite enviado, mas não foi possível vincular ao tenant.",
      success: false,
    };
  }

  await logAuditEvent({
    tenantId: input.tenantId,
    action: "membership.invited",
    entityType: "membership",
    entityId: userId,
    newData: { email: input.email, role_id: input.roleId },
  });

  revalidatePath("/backoffice/usuarios");
  return { error: null, success: true };
}
