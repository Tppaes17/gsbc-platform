import { redirect } from "next/navigation";
import { PageHeader } from "@/components/design-system/page-header";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ImportarProspectosDialog } from "./importar-dialog";
import { ProspectosTable } from "./prospectos-table";

export default async function ProspectosPage() {
  const user = await requireCurrentUser();
  if (!user.isOwner) {
    redirect("/backoffice");
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("dossies_cadastrais")
    .select("id, cnpj_consultado, razao_social, origem, status, score_confiabilidade, score_classificacao, ultima_consulta_em, created_at")
    .is("empresa_id", null)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Prospectos"
        description="Empresas identificadas via pesquisa de mercado (upload de planilha ou consulta oficial de CNPJ), ainda sem vínculo com um sindicato. Módulo restrito a Owners."
        actions={<ImportarProspectosDialog />}
      />
      <ProspectosTable data={data ?? []} />
    </div>
  );
}
