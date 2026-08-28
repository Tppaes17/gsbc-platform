"use server";

import { revalidatePath } from "next/cache";
import { logAuditEvent } from "@/lib/audit/log";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AI_MODEL, isAiConfigured } from "@/lib/ai/client";
import {
  sugerirAcaoCobranca,
  COLLECTIONS_COPILOT_PROMPT_VERSION,
  type CollectionsCopilotResult,
} from "@/lib/ai/collections-copilot";
import { sendNotificacaoAction } from "../actions";

export interface SugerirAcaoState {
  error: string | null;
  success: boolean;
  interacaoId: string | null;
  resultado: CollectionsCopilotResult | null;
}

export async function sugerirAcaoCobrancaAction(cobrancaId: string): Promise<SugerirAcaoState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return {
      error: "Apenas a equipe GSBC pode usar o Collections Copilot.",
      success: false,
      interacaoId: null,
      resultado: null,
    };
  }

  if (!isAiConfigured()) {
    return {
      error: "IA não configurada — defina ANTHROPIC_API_KEY para ativar o Collections Copilot.",
      success: false,
      interacaoId: null,
      resultado: null,
    };
  }

  const supabase = await createClient();

  const { data: cobranca } = await supabase
    .from("cobrancas")
    .select(
      "tenant_id, status, valor_cobranca, vencimento, empresas(razao_social, nome_fantasia), obrigacoes(descricao)",
    )
    .eq("id", cobrancaId)
    .single();

  if (!cobranca) {
    return { error: "Cobrança não encontrada.", success: false, interacaoId: null, resultado: null };
  }

  const empresa = Array.isArray(cobranca.empresas) ? cobranca.empresas[0] : cobranca.empresas;
  const obrigacao = Array.isArray(cobranca.obrigacoes) ? cobranca.obrigacoes[0] : cobranca.obrigacoes;

  const [{ data: notificacoes }, { data: eventos }, { data: negociacoes }] = await Promise.all([
    supabase
      .from("notificacoes")
      .select("assunto, status, created_at")
      .eq("cobranca_id", cobrancaId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("cobranca_eventos")
      .select("to_status, reason, created_at")
      .eq("cobranca_id", cobrancaId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("negociacoes")
      .select("id")
      .eq("cobranca_id", cobrancaId)
      .in("status", ["em_negociacao", "aguardando_aprovacao"])
      .limit(1),
  ]);

  let resultado;
  try {
    resultado = await sugerirAcaoCobranca({
      cobrancaId,
      empresaNome: empresa?.nome_fantasia ?? empresa?.razao_social ?? "empresa",
      obrigacaoDescricao: obrigacao?.descricao ?? "obrigação",
      status: cobranca.status,
      valorCobranca: cobranca.valor_cobranca,
      vencimento: cobranca.vencimento,
      temNegociacaoAtiva: (negociacoes?.length ?? 0) > 0,
      notificacoesRecentes: (notificacoes ?? []).map((n) => ({
        assunto: n.assunto,
        status: n.status,
        createdAt: n.created_at,
      })),
      eventosRecentes: (eventos ?? []).map((e) => ({
        toStatus: e.to_status,
        reason: e.reason,
        createdAt: e.created_at,
      })),
    });
  } catch {
    return {
      error: "Não foi possível gerar a sugestão — tente novamente em instantes.",
      success: false,
      interacaoId: null,
      resultado: null,
    };
  }

  const { data: interacao, error } = await supabase
    .from("ai_interacoes")
    .insert({
      tenant_id: cobranca.tenant_id,
      copilot: "collections",
      entity_type: "cobranca",
      entity_id: cobrancaId,
      model: AI_MODEL,
      prompt_version: COLLECTIONS_COPILOT_PROMPT_VERSION,
      context_reference: resultado.contextReference,
      output: resultado.output,
      output_estruturado: resultado.parseOk
        ? {
            acao_sugerida: resultado.acaoSugerida,
            justificativa: resultado.justificativa,
            rascunho_notificacao: resultado.rascunhoNotificacao,
          }
        : null,
      user_id: user.id,
    })
    .select("id")
    .single();

  if (error || !interacao) {
    return {
      error: "Sugestão gerada, mas não foi possível registrar a interação de IA.",
      success: false,
      interacaoId: null,
      resultado,
    };
  }

  await logAuditEvent({
    tenantId: cobranca.tenant_id,
    action: "ai.collections_copilot.gerado",
    entityType: "cobranca",
    entityId: cobrancaId,
    newData: { interacao_id: interacao.id, acao_sugerida: resultado.acaoSugerida },
  });

  revalidatePath(`/backoffice/cobrancas/${cobrancaId}`);
  return { error: null, success: true, interacaoId: interacao.id, resultado };
}

export interface MarcarDecisaoState {
  error: string | null;
  success: boolean;
}

export async function marcarDecisaoCollectionsAction(
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

export interface EnviarRascunhoState {
  error: string | null;
  success: boolean;
}

export async function enviarRascunhoNotificacaoAction(
  cobrancaId: string,
  interacaoId: string,
  mensagem: string,
  rascunhoOriginal: string | null,
): Promise<EnviarRascunhoState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return { error: "Apenas a equipe GSBC pode enviar notificações.", success: false };
  }

  const formData = new FormData();
  formData.set("cobrancaId", cobrancaId);
  formData.set("mensagem", mensagem);

  const result = await sendNotificacaoAction({ error: null, success: false }, formData);

  if (!result.success) {
    return { error: result.error, success: false };
  }

  const supabase = await createClient();
  const foiEditado = rascunhoOriginal !== null && mensagem.trim() !== rascunhoOriginal.trim();

  await supabase
    .from("ai_interacoes")
    .update({
      status: foiEditado ? "editado" : "aceito",
      decided_at: new Date().toISOString(),
      decided_by: user.id,
    })
    .eq("id", interacaoId);

  revalidatePath(`/backoffice/cobrancas/${cobrancaId}`);
  return { error: null, success: true };
}
