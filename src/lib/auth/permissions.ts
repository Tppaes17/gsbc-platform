import { ROLE_CODES } from "@/types/domain";
import type { CurrentUser } from "@/types/domain";

/**
 * Checagem de UI (mostrar/ocultar ação). A autoridade final é sempre a
 * função `public.can_manage_tenant_members` no Postgres, aplicada via RLS —
 * esta função nunca deve ser o único controle em uma mutação.
 */
export function canManageTenantMembers(
  user: CurrentUser,
  tenantId: string,
): boolean {
  if (user.isPlatformStaff) return true;
  return user.memberships.some(
    (m) =>
      m.tenantId === tenantId &&
      m.roleCode === "sindicato_administrador" &&
      m.tenantOnboardingStatus === "active",
  );
}

/**
 * Checagem de UI — quem pode aprovar/rejeitar um escalonamento pra
 * notificação extrajudicial (STG-09): papel Jurídico ou Super Admin, mais
 * restrito que isPlatformStaff. A autoridade final é sempre
 * `public.is_escalation_approver` no Postgres, checada dentro de
 * `decidir_aprovacao` (SECURITY DEFINER) — esta função nunca deve ser o
 * único controle sobre a mutação em si, só sobre o que a UI mostra.
 */
export function isEscalationApprover(user: CurrentUser): boolean {
  return user.memberships.some(
    (m) =>
      m.tenantType === "platform" &&
      (m.roleCode === ROLE_CODES.gsbcJuridico || m.roleCode === ROLE_CODES.gsbcSuperAdmin),
  );
}
