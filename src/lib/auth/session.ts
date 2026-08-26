import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { ROLE_CODES, type CurrentMembership, type CurrentUser } from "@/types/domain";

/**
 * Carrega o usuário autenticado com suas memberships (tenant + papel).
 * Cacheado por requisição (React `cache`) para evitar refazer a query em
 * cada Server Component que precise da sessão.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("id, full_name, email")
    .eq("id", authUser.id)
    .single();

  if (!profile) return null;

  const { data: membershipRows } = await supabase
    .from("memberships")
    .select(
      "id, tenant_id, role_id, tenants(name, type, slug, onboarding_status), roles(code, name)",
    )
    .eq("user_id", authUser.id)
    .eq("status", "active");

  const memberships: CurrentMembership[] = (membershipRows ?? []).map(
    (row) => {
      const tenant = Array.isArray(row.tenants) ? row.tenants[0] : row.tenants;
      const role = Array.isArray(row.roles) ? row.roles[0] : row.roles;
      return {
        membershipId: row.id,
        tenantId: row.tenant_id,
        tenantName: tenant?.name ?? "",
        tenantType: (tenant?.type ?? "sindicato") as "platform" | "sindicato",
        tenantSlug: tenant?.slug ?? "",
        tenantOnboardingStatus:
          (tenant?.onboarding_status ?? "onboarding") as
            | "onboarding"
            | "active",
        roleId: row.role_id,
        roleCode: role?.code ?? "",
        roleName: role?.name ?? "",
      };
    },
  );

  return {
    id: profile.id,
    fullName: profile.full_name,
    email: profile.email,
    isPlatformStaff: memberships.some((m) => m.tenantType === "platform"),
    isOwner: memberships.some(
      (m) => m.tenantType === "platform" && m.roleCode === ROLE_CODES.gsbcSuperAdmin,
    ),
    memberships,
  };
});

export async function requireCurrentUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Não autenticado.");
  }
  return user;
}
