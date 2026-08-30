"use server";

import { revalidatePath } from "next/cache";
import { logAuditEvent } from "@/lib/audit/log";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AI_MODEL, isAiConfigured } from "@/lib/ai/client";
import {
  gerarResumoNegociacao,
  NEGOTIATION_COPILOT_PROMPT_VERSION,
} from "@/lib/ai/negotiation-copilot";

export interface GerarResumoState {
  error: string | null;
  success: boolean;
  interacaoId: string | null;
  output: string | null;
}

export async function gerarResumoNegociacaoAction(negociacaoId: string): Promise<GerarResumoState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return {
      error: "Apenas a equipe GSBC pode usar o Negotiation Copilot.",
      success: false,
      interacaoId: null,
      output: null,
    };
  }

  if (!isAiConfigured()) {
    return {
      error: "IA não configurada — defina ANTHROPIC_API_KEY para ativar o Negotiation Copilot.",
      success: false,
      interacaoId: null,
      output: null,
    };
  }

  const supabase = await createClient();

  const { data: negociacao } = await supabase
    .from("negociacoes")
    .select("tenant_id, status, valor_atual, cobrancas(valor_cobranca), empresas(razao_social, nome_fantasia)")
    .eq("id", negociacaoId)
    .single();

  if (!negociacao) {
    return { error: "Negociação não encontrada.", success: false, interacaoId: null, output: null };
  }

  const { data: eventosRaw } = await supabase
    .from("negociacao_eventos")
    .select("id, tipo, valor, condicoes, created_at, users(full_name)")
    .eq("negociacao_id", negociacaoId)
    .order("created_at", { ascending: true });

  const empresa = Array.isArray(negociacao.empresas) ? negociacao.empresas[0] : negociacao.empresas;
  const cobranca = Array.isArray(negociacao.cobrancas) ? negociacao.cobrancas[0] : negociacao.cobrancas;

  const eventos = (eventosRaw ?? []).map((e) => {
    const autor = Array.isArray(e.users) ? e.users[0] : e.users;
    return {
      id: e.id,
      tipo: e.tipo,
      valor: e.valor,
      condicoes: e.condicoes,
      createdAt: e.created_at,
      autorNome: autor?.full_name ?? null,
    };
  });

  let resultado;
  try {
    resultado = await gerarResumoNegociacao({
      negociacaoId,
      empresaNome: empresa?.nome_fantasia ?? empresa?.razao_social ?? "empresa",
      status: negociacao.status,
      valorOriginal: cobranca?.valor_cobranca ?? null,
      valorAtual: negociacao.valor_atual,
      eventos,
    });
  } catch {
    return {
      error: "Não foi possível gerar o resumo — tente novamente em instantes.",
      success: false,
      interacaoId: null,
      output: null,
    };
  }

  const { data: interacao, error } = await supabase
    .from("ai_interacoes")
    .insert({
      tenant_id: negociacao.tenant_id,
      copilot: "negotiation",
      entity_type: "negociacao",
      entity_id: negociacaoId,
      model: AI_MODEL,
      prompt_version: NEGOTIATION_COPILOT_PROMPT_VERSION,
      context_reference: resultado.contextReference,
      context_safety: resultado.contextSafety,
      output: resultado.output,
      autonomy_level: 1,
      user_id: user.id,
    })
    .select("id")
    .single();

  if (error || !interacao) {
    return {
      error: "Resumo gerado, mas não foi possível registrar a interação de IA.",
      success: false,
      interacaoId: null,
      output: resultado.output,
    };
  }

  await logAuditEvent({
    tenantId: negociacao.tenant_id,
    action: "ai.negotiation_copilot.gerado",
    entityType: "negociacao",
    entityId: negociacaoId,
    newData: { interacao_id: interacao.id },
  });

  revalidatePath(`/backoffice/negociacoes/${negociacaoId}`);
  return { error: null, success: true, interacaoId: interacao.id, output: resultado.output };
}

export interface MarcarDecisaoState {
  error: string | null;
  success: boolean;
}

export async function marcarDecisaoNegotiationAction(
  interacaoId: string,
  status: "aceito" | "rejeitado",
): Promise<MarcarDecisaoState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return { error: "Apenas a equipe GSBC pode registrar essa decisão.", success: false };
  }

  const supabase = await createClient();
  let policyDecisionId: string | null = null;

  if (status === "aceito") {
    const { data: interacao } = await supabase
      .from("ai_interacoes")
      .select("tenant_id, entity_type, entity_id")
      .eq("id", interacaoId)
      .single();

    if (!interacao) {
      return { error: "Interação de IA não encontrada.", success: false };
    }

    const { data: decision, error: decisionError } = await supabase.rpc("evaluate_policy_action", {
      p_action_code: "ai.suggestion_acceptance",
      p_tenant_id: interacao.tenant_id,
      p_entity_type: interacao.entity_type,
      p_entity_id: interacao.entity_id,
      p_inputs: { interacao_id: interacaoId, status },
    });

    if (decisionError || decision?.result !== "ALLOW") {
      return { error: "Policy Engine não autorizou aceitar esta sugestão de IA.", success: false };
    }

    policyDecisionId = typeof decision.decision_id === "string" ? decision.decision_id : null;
  }

  const { error } = await supabase
    .from("ai_interacoes")
    .update({ status, decided_at: new Date().toISOString(), decided_by: user.id, policy_decision_id: policyDecisionId })
    .eq("id", interacaoId);

  if (error) {
    return { error: "Não foi possível registrar a decisão.", success: false };
  }

  return { error: null, success: true };
}
