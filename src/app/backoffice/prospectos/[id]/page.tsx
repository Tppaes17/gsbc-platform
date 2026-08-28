import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/design-system/page-header";
import type { TimelineItem } from "@/components/design-system/timeline";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { OportunidadeSection } from "./oportunidade-section";
import { PromoverProspectoDialog } from "./promover-dialog";
import { ProspectoDossieSection } from "./prospecto-dossie-section";

const OPORTUNIDADE_EVENTO_LABEL: Record<string, string> = {
  avaliacao: "Avaliação recalculada",
  em_analise: "Colocada em análise",
  validada: "Validada",
  descartada: "Descartada",
  observacao: "Observação",
};

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

  const { data: oportunidadeRow } = await supabase
    .from("oportunidades")
    .select(
      "id, status, score, prioridade, confianca, estimativa_valor, estimativa_metodologia, candidatos_avaliados, instrumentos_potenciais, tenant_candidato_id, motivo_decisao, tenants(name)",
    )
    .eq("dossie_cadastral_id", id)
    .maybeSingle();

  const [{ data: fatoresRows }, { data: oportunidadeEventosRaw }] = await Promise.all([
    oportunidadeRow
      ? supabase
          .from("oportunidade_fatores")
          .select("dimensao, pontos, peso_maximo, explicacao")
          .eq("oportunidade_id", oportunidadeRow.id)
      : Promise.resolve({ data: [] as never[] }),
    oportunidadeRow
      ? supabase
          .from("oportunidade_eventos")
          .select("id, tipo, descricao, score, created_at, users(full_name)")
          .eq("oportunidade_id", oportunidadeRow.id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const oportunidadeTenant = oportunidadeRow
    ? Array.isArray(oportunidadeRow.tenants)
      ? oportunidadeRow.tenants[0]
      : oportunidadeRow.tenants
    : null;

  const oportunidadeEventos: TimelineItem[] = (oportunidadeEventosRaw ?? []).map((ev) => {
    const author = Array.isArray(ev.users) ? ev.users[0] : ev.users;
    const descricaoPartes = [
      ev.score !== null ? `score ${ev.score}/100` : ev.descricao,
      author ? `por ${author.full_name}` : null,
    ].filter(Boolean);
    return {
      id: ev.id,
      label: OPORTUNIDADE_EVENTO_LABEL[ev.tipo] ?? ev.tipo,
      description: descricaoPartes.join(" · ") || undefined,
      timestamp: ev.created_at,
    };
  });

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
          descartado_motivo: prospecto.descartado_motivo,
        }}
        evidencias={evidencias ?? []}
        enriquecimentoWebConfigurado={enriquecimentoWebConfigurado}
      />

      <OportunidadeSection
        dossieId={prospecto.id}
        oportunidade={
          oportunidadeRow
            ? {
                id: oportunidadeRow.id,
                status: oportunidadeRow.status,
                score: oportunidadeRow.score,
                prioridade: oportunidadeRow.prioridade,
                confianca: oportunidadeRow.confianca,
                estimativaValor: oportunidadeRow.estimativa_valor,
                estimativaMetodologia: oportunidadeRow.estimativa_metodologia,
                tenantCandidatoNome: oportunidadeTenant?.name ?? null,
                candidatosAvaliados:
                  (oportunidadeRow.candidatos_avaliados as unknown as {
                    tenantId: string;
                    tenantNome: string;
                    fitTerritorial: number;
                    fitAtividade: number;
                    combinado: number;
                  }[]) ?? [],
                instrumentosPotenciais:
                  (oportunidadeRow.instrumentos_potenciais as unknown as {
                    id: string;
                    titulo: string;
                    tipo: string;
                    vigenciaFim: string | null;
                  }[]) ?? [],
                motivoDecisao: oportunidadeRow.motivo_decisao,
              }
            : null
        }
        fatores={fatoresRows ?? []}
        eventos={oportunidadeEventos}
      />
    </div>
  );
}
