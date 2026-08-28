import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Modelo confirmado com o usuário (STG-12): Sonnet 5, não Opus 5 — os
 * dois copilots desta rodada são chamados repetidamente em produção
 * (não uma tarefa pontual), então o trade-off de custo é real.
 */
export const AI_MODEL = "claude-sonnet-5";

/**
 * Sem ANTHROPIC_API_KEY configurada, os copilots ficam desligados —
 * mesmo padrão já usado em LEADCNPJ_API_KEY (Rodada 14) e no payment
 * provider (Rodada 23): a tela mostra claramente "IA não configurada"
 * em vez de fingir que funciona (regra 9 do AGENTS.md).
 */
export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let cachedClient: Anthropic | null = null;

export function getAiClient(): Anthropic {
  if (!cachedClient) {
    cachedClient = new Anthropic();
  }
  return cachedClient;
}
