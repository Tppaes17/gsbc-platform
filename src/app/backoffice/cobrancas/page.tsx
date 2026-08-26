import { PageHeader } from "@/components/design-system/page-header";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { CobrancasTable } from "./cobrancas-table";

export default async function CobrancasPage() {
  const user = await requireCurrentUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("cobrancas")
    .select("*, empresas(razao_social, nome_fantasia), tenants(name)")
    .order("vencimento");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cobranças"
        description="Ações de regularização geradas a partir de obrigações. Cobranças nascem a partir de uma obrigação — veja Instrumentos ou a ficha da empresa."
      />
      <CobrancasTable data={data ?? []} showTenantColumn={user.isPlatformStaff} />
    </div>
  );
}
