import { PageHeader } from "@/components/design-system/page-header";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { InviteMemberDialog } from "./invite-member-dialog";
import { UsuariosTable, type MembershipRow } from "./usuarios-table";

export default async function UsuariosPage() {
  const user = await requireCurrentUser();
  const supabase = await createClient();

  const [{ data }, { data: roles }] = await Promise.all([
    supabase
      .from("memberships")
      .select(
        "id, status, users!memberships_user_id_fkey(full_name, email), tenants(name), roles(name)",
      )
      .order("created_at", { ascending: false }),
    supabase.from("roles").select("id, name, tenant_type"),
  ]);

  const rows: MembershipRow[] = (data ?? []).map((row) => {
    const memberUser = Array.isArray(row.users) ? row.users[0] : row.users;
    const tenant = Array.isArray(row.tenants) ? row.tenants[0] : row.tenants;
    const role = Array.isArray(row.roles) ? row.roles[0] : row.roles;
    return {
      id: row.id,
      status: row.status,
      userName: memberUser?.full_name ?? "—",
      userEmail: memberUser?.email ?? "—",
      tenantName: tenant?.name ?? "—",
      roleName: role?.name ?? "—",
    };
  });

  // Tenants em que o usuário atual pode convidar/gerenciar membros: staff
  // GSBC vê todos os tenants; administrador de sindicato vê apenas o(s)
  // próprio(s) tenant(s) já implantado(s) — espelha public.can_manage_tenant_members.
  let invitableTenants: { id: string; name: string; type: "platform" | "sindicato" }[] = [];

  if (user.isPlatformStaff) {
    const { data: allTenants } = await supabase
      .from("tenants")
      .select("id, name, type")
      .order("name");
    invitableTenants = allTenants ?? [];
  } else {
    invitableTenants = user.memberships
      .filter(
        (m) =>
          m.roleCode === "sindicato_administrador" &&
          m.tenantOnboardingStatus === "active",
      )
      .map((m) => ({ id: m.tenantId, name: m.tenantName, type: m.tenantType }));
  }

  const roleOptions = (roles ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    tenantType: r.tenant_type,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Usuários"
        description="Membros com acesso à plataforma, por tenant e papel."
        actions={
          invitableTenants.length > 0 ? (
            <InviteMemberDialog tenants={invitableTenants} roles={roleOptions} />
          ) : undefined
        }
      />
      <UsuariosTable data={rows} />
    </div>
  );
}
