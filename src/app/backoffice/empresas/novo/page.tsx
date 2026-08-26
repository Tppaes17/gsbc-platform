import { redirect } from "next/navigation";
import { PageHeader } from "@/components/design-system/page-header";
import { EmptyState } from "@/components/design-system/empty-state";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { EmpresaForm } from "./empresa-form";

export default async function NovaEmpresaPage() {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    redirect("/backoffice/empresas");
  }

  const supabase = await createClient();
  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, name")
    .eq("type", "sindicato")
    .order("name");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nova empresa"
        description="A empresa fica vinculada ao sindicato selecionado."
      />
      {tenants && tenants.length > 0 ? (
        <EmpresaForm tenants={tenants} />
      ) : (
        <EmptyState
          title="Nenhum sindicato cadastrado"
          description="Cadastre um sindicato antes de vincular empresas a ele."
        />
      )}
    </div>
  );
}
