import { redirect } from "next/navigation";
import { PageHeader } from "@/components/design-system/page-header";
import { EmptyState } from "@/components/design-system/empty-state";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { InstrumentoForm } from "./instrumento-form";

export default async function NovoInstrumentoPage() {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    redirect("/backoffice/instrumentos");
  }

  const supabase = await createClient();
  const [{ data: tenants }, { data: empresas }] = await Promise.all([
    supabase
      .from("tenants")
      .select("id, name")
      .eq("type", "sindicato")
      .order("name"),
    supabase
      .from("empresas")
      .select("id, razao_social, nome_fantasia, tenant_id")
      .order("razao_social"),
  ]);

  const empresaOptions = (empresas ?? []).map((e) => ({
    id: e.id,
    nome: e.nome_fantasia ?? e.razao_social,
    tenantId: e.tenant_id,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Novo instrumento"
        description="CCT, ACT ou termo aditivo. Vincule a uma empresa apenas para ACT restrito a ela."
      />
      {tenants && tenants.length > 0 ? (
        <InstrumentoForm tenants={tenants} empresas={empresaOptions} />
      ) : (
        <EmptyState
          title="Nenhum sindicato cadastrado"
          description="Cadastre um sindicato antes de registrar instrumentos."
        />
      )}
    </div>
  );
}
