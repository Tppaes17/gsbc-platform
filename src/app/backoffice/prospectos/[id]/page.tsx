import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/design-system/page-header";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ProspectoDossieSection } from "./prospecto-dossie-section";

export default async function ProspectoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireCurrentUser();
  if (!user.isOwner) {
    redirect("/backoffice");
  }

  const supabase = await createClient();

  const { data: prospecto } = await supabase
    .from("dossies_cadastrais")
    .select("*")
    .eq("id", id)
    .is("empresa_id", null)
    .single();

  if (!prospecto) {
    notFound();
  }

  const { data: evidencias } = await supabase
    .from("dossie_evidencias")
    .select("*")
    .eq("dossie_id", id)
    .order("consultado_em", { ascending: false });

  const enriquecimentoWebConfigurado = Boolean(process.env.LEADCNPJ_API_KEY);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={prospecto.razao_social ?? "Prospecto"}
        description={
          prospecto.cnpj_consultado
            ? `CNPJ ${prospecto.cnpj_consultado} · empresa ainda sem vínculo com um sindicato`
            : "Empresa ainda sem vínculo com um sindicato"
        }
      />
      <ProspectoDossieSection
        dossieId={prospecto.id}
        dossie={{
          status: prospecto.status,
          score_confiabilidade: prospecto.score_confiabilidade,
          score_classificacao: prospecto.score_classificacao,
          ultima_consulta_em: prospecto.ultima_consulta_em,
        }}
        evidencias={evidencias ?? []}
        enriquecimentoWebConfigurado={enriquecimentoWebConfigurado}
      />
    </div>
  );
}
