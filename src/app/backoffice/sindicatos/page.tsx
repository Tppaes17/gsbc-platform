import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/design-system/page-header";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { SindicatosTable } from "./sindicatos-table";

export default async function SindicatosPage() {
  const user = await requireCurrentUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("sindicatos")
    .select("*, tenants(onboarding_status)")
    .order("razao_social");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sindicatos"
        description="Entidades sindicais atendidas pela GSBC. Visibilidade aplicada por RLS."
        actions={
          user.isPlatformStaff ? (
            <Button
              nativeButton={false}
              render={
                <Link href="/backoffice/sindicatos/novo">
                  <Plus className="h-4 w-4" />
                  Novo sindicato
                </Link>
              }
            />
          ) : undefined
        }
      />
      <SindicatosTable data={data ?? []} />
    </div>
  );
}
