import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/design-system/page-header";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PromoverProspectoDialog } from "./promover-dialog";
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

  const [{ data: evidencias }, { data: tenants }, promotedEmpresa] = await Promise.all([
    supabase
      .from("dossie_evidencias")
      .select("*")
      .eq("dossie_id", id)
      .order("consultado_em", { ascending: false }),
    supabase.from("tenants").select("id, name").eq("type", "sindicato").order("name"),
    prospecto.promoted_empresa_id
      ? supabase
          .from("empresas")
          .select("id, razao_social")
          .eq("id", prospecto.promoted_empresa_id)
          .single()
          .then((r) => r.data)
      : Promise.resolve(null),
  ]);

  const enriquecimentoWebConfigurado = Boolean(process.env.LEADCNPJ_API_KEY);
  const dadosOficiais = prospecto.dados_oficiais as { cnaePrincipalCodigo?: string } | null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={prospecto.razao_social ?? "Prospecto"}
        description={
          prospecto.cnpj_consultado
            ? `CNPJ ${prospecto.cnpj_consultado} · empresa ainda sem vínculo com um sindicato`
            : "Empresa ainda sem vínculo com um sindicato"
        }
        actions={
          !prospecto.promoted_at ? (
            <PromoverProspectoDialog
              dossieId={prospecto.id}
              razaoSocial={prospecto.razao_social ?? ""}
              cnaeSugerido={dadosOficiais?.cnaePrincipalCodigo ?? ""}
              tenants={tenants ?? []}
            />
          ) : undefined
        }
      />
      {prospecto.promoted_at ? (
        <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
          Este prospecto já foi promovido em{" "}
          {new Date(prospecto.promoted_at).toLocaleString("pt-BR")}
          {promotedEmpresa ? (
            <>
              {" "}— evidências associadas a{" "}
              <Link
                href={`/backoffice/empresas/${promotedEmpresa.id}`}
                className="underline"
              >
                {promotedEmpresa.razao_social}
              </Link>
              .
            </>
          ) : (
            "."
          )}
        </p>
      ) : null}
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
