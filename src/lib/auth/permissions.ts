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
