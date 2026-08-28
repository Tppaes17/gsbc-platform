import { redirect } from "next/navigation";
import { PageHeader } from "@/components/design-system/page-header";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ImportarProspectosDialog } from "./importar-dialog";
import { ProspectosTable } from "./prospectos-table";

// A importação de planilha agora consulta a Receita Federal
// automaticamente, sequencial, dentro da mesma Server Action (Rodada
// 30, decisão confirmada com o usuário) — planilhas grandes (a
// referência tem ~1257 linhas) podem levar minutos. maxDuration só
// tem efeito real em planos Vercel Pro ou superior; documentado como
// risco residual na Rodada 30.
export const maxDuration = 300;

export default async function ProspectosPage() {
  const user = await requireCurrentUser();
  if (!user.isOwner) {
    redirect("/backoffice");
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("dossies_cadastrais")
    .select(
      "id, cnpj_consultado, razao_social, origem, status, score_confiabilidade, score_classificacao, ultima_consulta_em, created_at, oportunidades(status, prioridade, score)",
    )
    .is("empresa_id", null)
    .is("promoted_at", null)
    .neq("status", "descartado_receita")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Empresas Prospectadas"
        description="Empresas identificadas via pesquisa de mercado (upload de planilha ou consulta oficial de CNPJ), ainda sem vínculo com um sindicato. Descartadas automaticamente por CNPJ baixado/inativo na Receita Federal não aparecem aqui — o registro continua existindo, sem histórico apagado. Módulo restrito a Owners."
        actions={<ImportarProspectosDialog />}
      />
      <ProspectosTable data={data ?? []} />
    </div>
  );
}
