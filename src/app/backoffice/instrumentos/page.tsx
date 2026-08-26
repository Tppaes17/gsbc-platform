import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/design-system/page-header";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { InstrumentosTable } from "./instrumentos-table";

export default async function InstrumentosPage() {
  const user = await requireCurrentUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("instrumentos")
    .select("*, tenants(name)")
    .order("titulo");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Instrumentos"
        description="Instrumentos coletivos (CCT, ACT, termos aditivos) dos sindicatos atendidos pela GSBC."
        actions={
          user.isPlatformStaff ? (
            <Button
              nativeButton={false}
              render={
                <Link href="/backoffice/instrumentos/novo">
                  <Plus className="h-4 w-4" />
                  Novo instrumento
                </Link>
              }
            />
          ) : undefined
        }
      />
      <InstrumentosTable
        data={data ?? []}
        showTenantColumn={user.isPlatformStaff}
      />
    </div>
  );
}
