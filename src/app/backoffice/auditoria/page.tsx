import { PageHeader } from "@/components/design-system/page-header";
import { createClient } from "@/lib/supabase/server";
import { AuditoriaTable } from "./auditoria-table";

export default async function AuditoriaPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Auditoria"
        description="Trilha de ações relevantes — imutável, escopada por tenant (regra 17)."
      />
      <AuditoriaTable data={data ?? []} />
    </div>
  );
}
