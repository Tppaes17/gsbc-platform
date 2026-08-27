"use server";

import { revalidatePath } from "next/cache";
import { logAuditEvent } from "@/lib/audit/log";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  calcularScoreOportunidade,
  escolherCandidato,
  type HistoricoObrigacoesCandidato,
  type InstrumentoPotencial,
  type ProspectoParaAvaliacao,
  type SindicatoCandidato,
} from "@/lib/oportunidades/scoring";
import type { CnpjOficial } from "@/lib/cnpj/brasil-api";

export interface OportunidadeActionState {
  error: string | null;
  success: boolean;
}

export async function avaliarOportunidadeAction(dossieId: string): Promise<OportunidadeActionState> {
  const user = await requireCurrentUser();
  if (!user.isOwner) {
    return { error: "Apenas Owners podem usar o Opportunity Engine.", success: false };
  }

  const supabase = await createClient();

  const { data: dossie } = await supabase
    .from("dossies_cadastrais")
    .select("id, dados_oficiais, score_confiabilidade, ultima_consulta_em")
    .eq("id", dossieId)
    .is("empresa_id", null)
    .single();

  if (!dossie) {
    return { error: "Prospecto não encontrado.", success: false };
  }

  const { data: existente } = await supabase
    .from("oportunidades")
    .select("id, status")
    .eq("dossie_cadastral_id", dossieId)
    .maybeSingle();

  if (existente && (existente.status === "validada" || existente.status === "descartada")) {
    return {
      error: "Esta oportunidade já tem uma decisão final registrada — reavaliação não muda uma decisão já tomada.",
      success: false,
    };
  }

  const { data: evidencias } = await supabase
    .from("dossie_evidencias")
    .select("tipo, valor, fonte")
    .eq("dossie_id", dossieId);

  const dados = dossie.dados_oficiais as CnpjOficial | null;
  const fontesDistintas = new Set((evidencias ?? []).map((e) => e.fonte));
  const temEmail = Boolean(dados?.email) || (evidencias ?? []).some((e) => e.tipo === "email" && e.valor);
  const temTelefone =
    Boolean(dados?.telefone) || (evidencias ?? []).some((e) => e.tipo === "telefone" && e.valor);

  const prospecto: ProspectoParaAvaliacao = {
    uf: dados?.uf ?? null,
    municipio: dados?.municipio ?? null,
    cnaeDescricao: dados?.cnaePrincipalDescricao ?? null,
    temDadosOficiais: Boolean(dados),
    temRazaoSocial: Boolean(dados?.razaoSocial),
    temSituacaoCadastral: Boolean(dados?.situacaoCadastral),
    temQsa: Boolean(dados?.qsa && dados.qsa.length > 0),
    temEmail,
    temTelefone,
    ultimaConsultaEm: dossie.ultima_consulta_em,
    quantidadeFontesDistintas: fontesDistintas.size,
  };

  const { data: sindicatoRows } = await supabase
    .from("tenants")
    .select("id, name, sindicatos(categoria, base_territorial)")
    .eq("type", "sindicato")
    .eq("status", "active");

  const sindicatos: SindicatoCandidato[] = (sindicatoRows ?? []).map((t) => {
    const s = Array.isArray(t.sindicatos) ? t.sindicatos[0] : t.sindicatos;
    return {
      tenantId: t.id,
      tenantNome: t.name,
      categoria: s?.categoria ?? null,
      baseTerritorial: s?.base_territorial ?? null,
    };
  });

  const { candidatosAvaliados, melhor } = escolherCandidato(prospecto, sindicatos);

  let instrumentosPotenciais: InstrumentoPotencial[] = [];
  let historico: HistoricoObrigacoesCandidato | null = null;

  if (melhor) {
    const [{ data: instrumentosRows }, { data: obrigacoesRows }] = await Promise.all([
      supabase
        .from("instrumentos")
        .select("id, titulo, tipo, vigencia_fim")
        .eq("tenant_id", melhor.tenantId)
        .eq("status", "active")
        .is("empresa_id", null)
        .order("vigencia_fim", { ascending: false })
        .limit(20),
      supabase
        .from("obrigacoes")
        .select("valor_referencia")
        .eq("tenant_id", melhor.tenantId)
        .not("valor_referencia", "is", null),
    ]);

    instrumentosPotenciais = (instrumentosRows ?? []).map((i) => ({
      id: i.id,
      titulo: i.titulo,
      tipo: i.tipo,
      vigenciaFim: i.vigencia_fim,
    }));

    const valores = (obrigacoesRows ?? []).map((o) => o.valor_referencia as number);
    historico =
      valores.length > 0
        ? { quantidade: valores.length, media: valores.reduce((a, b) => a + b, 0) / valores.length }
        : { quantidade: 0, media: null };
  }

  const resultado = calcularScoreOportunidade({
    prospecto,
    candidatosAvaliados,
    melhor,
    instrumentosPotenciais,
    historico,
  });

  let oportunidadeId: string;

  if (existente) {
    oportunidadeId = existente.id;
    const { error } = await supabase
      .from("oportunidades")
      .update({
        tenant_candidato_id: resultado.tenantCandidatoId,
        score: resultado.score,
        prioridade: resultado.prioridade,
        confianca: resultado.confianca,
        estimativa_valor: resultado.estimativaValor,
        estimativa_metodologia: resultado.estimativaMetodologia,
        candidatos_avaliados: resultado.candidatosAvaliados as unknown as Record<string, unknown>[],
        instrumentos_potenciais: resultado.instrumentosPotenciais as unknown as Record<string, unknown>[],
        avaliado_em: new Date().toISOString(),
        avaliado_por: user.id,
      })
      .eq("id", oportunidadeId);

    if (error) {
      return { error: "Não foi possível atualizar a avaliação.", success: false };
    }

    await supabase.from("oportunidade_fatores").delete().eq("oportunidade_id", oportunidadeId);
  } else {
    const { data: nova, error } = await supabase
      .from("oportunidades")
      .insert({
        dossie_cadastral_id: dossieId,
        tenant_candidato_id: resultado.tenantCandidatoId,
        score: resultado.score,
        prioridade: resultado.prioridade,
        confianca: resultado.confianca,
        estimativa_valor: resultado.estimativaValor,
        estimativa_metodologia: resultado.estimativaMetodologia,
        candidatos_avaliados: resultado.candidatosAvaliados as unknown as Record<string, unknown>[],
        instrumentos_potenciais: resultado.instrumentosPotenciais as unknown as Record<string, unknown>[],
        avaliado_por: user.id,
      })
      .select("id")
      .single();

    if (error || !nova) {
      return { error: "Não foi possível criar a avaliação.", success: false };
    }
    oportunidadeId = nova.id;
  }

  const { error: fatoresError } = await supabase.from("oportunidade_fatores").insert(
    resultado.fatores.map((f) => ({
      oportunidade_id: oportunidadeId,
      dimensao: f.dimensao,
      pontos: f.pontos,
      peso_maximo: f.pesoMaximo,
      explicacao: f.explicacao,
    })),
  );

  if (fatoresError) {
    return { error: "Avaliação registrada, mas não foi possível salvar o detalhamento do score.", success: false };
  }

  await supabase.from("oportunidade_eventos").insert({
    oportunidade_id: oportunidadeId,
    tipo: "avaliacao",
    descricao: resultado.tenantCandidatoNome
      ? `Score ${resultado.score}/100 — candidato: ${resultado.tenantCandidatoNome}`
      : `Score ${resultado.score}/100 — nenhum sindicato candidato identificado`,
    score: resultado.score,
    user_id: user.id,
  });

  await logAuditEvent({
    tenantId: null,
    action: "oportunidade.avaliada",
    entityType: "oportunidade",
    entityId: oportunidadeId,
    newData: { score: resultado.score, tenant_candidato_id: resultado.tenantCandidatoId },
  });

  revalidatePath(`/backoffice/prospectos/${dossieId}`);
  revalidatePath("/backoffice/prospectos");
  return { error: null, success: true };
}

export async function iniciarAnaliseOportunidadeAction(oportunidadeId: string): Promise<OportunidadeActionState> {
  const user = await requireCurrentUser();
  if (!user.isOwner) {
    return { error: "Apenas Owners podem usar o Opportunity Engine.", success: false };
  }

  const supabase = await createClient();

  const { data: oportunidade } = await supabase
    .from("oportunidades")
    .select("id, status, dossie_cadastral_id")
    .eq("id", oportunidadeId)
    .single();

  if (!oportunidade) {
    return { error: "Oportunidade não encontrada.", success: false };
  }
  if (oportunidade.status !== "potencial") {
    return { error: "Só é possível colocar em análise a partir de 'potencial'.", success: false };
  }

  const { error } = await supabase
    .from("oportunidades")
    .update({ status: "em_analise", analise_iniciada_em: new Date().toISOString() })
    .eq("id", oportunidadeId);

  if (error) {
    return { error: "Não foi possível colocar em análise.", success: false };
  }

  await supabase.from("oportunidade_eventos").insert({
    oportunidade_id: oportunidadeId,
    tipo: "em_analise",
    user_id: user.id,
  });

  await logAuditEvent({
    tenantId: null,
    action: "oportunidade.em_analise",
    entityType: "oportunidade",
    entityId: oportunidadeId,
  });

  revalidatePath(`/backoffice/prospectos/${oportunidade.dossie_cadastral_id}`);
  return { error: null, success: true };
}

export async function decidirOportunidadeAction(
  _prevState: OportunidadeActionState,
  formData: FormData,
): Promise<OportunidadeActionState> {
  const user = await requireCurrentUser();
  if (!user.isOwner) {
    return { error: "Apenas Owners podem usar o Opportunity Engine.", success: false };
  }

  const oportunidadeId = formData.get("oportunidadeId");
  const decisao = formData.get("decisao");
  const motivo = formData.get("motivo");

  if (typeof oportunidadeId !== "string" || !oportunidadeId) {
    return { error: "Oportunidade inválida.", success: false };
  }
  if (decisao !== "validada" && decisao !== "descartada") {
    return { error: "Decisão inválida.", success: false };
  }
  if (typeof motivo !== "string" || motivo.trim().length < 5) {
    return { error: "Justifique a decisão (mínimo 5 caracteres).", success: false };
  }

  const supabase = await createClient();

  const { data: oportunidade } = await supabase
    .from("oportunidades")
    .select("id, status, dossie_cadastral_id")
    .eq("id", oportunidadeId)
    .single();

  if (!oportunidade) {
    return { error: "Oportunidade não encontrada.", success: false };
  }

  if (decisao === "validada" && oportunidade.status !== "em_analise") {
    return { error: "Só é possível validar a partir de 'em análise'.", success: false };
  }
  if (decisao === "descartada" && !["potencial", "em_analise"].includes(oportunidade.status)) {
    return { error: "Só é possível descartar a partir de 'potencial' ou 'em análise'.", success: false };
  }

  const agora = new Date().toISOString();

  const { error } =
    decisao === "validada"
      ? await supabase
          .from("oportunidades")
          .update({ status: "validada", validado_em: agora, validado_por: user.id, motivo_decisao: motivo })
          .eq("id", oportunidadeId)
      : await supabase
          .from("oportunidades")
          .update({ status: "descartada", descartado_em: agora, descartado_por: user.id, motivo_decisao: motivo })
          .eq("id", oportunidadeId);

  if (error) {
    return { error: "Não foi possível registrar a decisão.", success: false };
  }

  await supabase.from("oportunidade_eventos").insert({
    oportunidade_id: oportunidadeId,
    tipo: decisao,
    descricao: motivo,
    user_id: user.id,
  });

  await logAuditEvent({
    tenantId: null,
    action: `oportunidade.${decisao}`,
    entityType: "oportunidade",
    entityId: oportunidadeId,
    newData: { motivo },
  });

  revalidatePath(`/backoffice/prospectos/${oportunidade.dossie_cadastral_id}`);
  revalidatePath("/backoffice/prospectos");
  return { error: null, success: true };
}
