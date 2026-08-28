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
      output: resultado.output,
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

  const { error } = await supabase
    .from("ai_interacoes")
    .update({ status, decided_at: new Date().toISOString(), decided_by: user.id })
    .eq("id", interacaoId);

  if (error) {
    return { error: "Não foi possível registrar a decisão.", success: false };
  }

  return { error: null, success: true };
}
