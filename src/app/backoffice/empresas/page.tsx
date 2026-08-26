import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/design-system/page-header";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { EmpresasTable } from "./empresas-table";

export default async function EmpresasPage() {
  const user = await requireCurrentUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("empresas")
    .select("*, tenants(name)")
    .order("razao_social");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Empresas"
        description="Empresas sob jurisdição dos sindicatos atendidos pela GSBC. Visibilidade aplicada por RLS."
        actions={
          user.isPlatformStaff ? (
            <Button
              nativeButton={false}
              render={
                <Link href="/backoffice/empresas/novo">
                  <Plus className="h-4 w-4" />
                  Nova empresa
                </Link>
              }
            />
          ) : undefined
        }
      />
      <EmpresasTable data={data ?? []} showTenantColumn={user.isPlatformStaff} />
    </div>
  );
}
