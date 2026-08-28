import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { AI_MODEL, getAiClient } from "./client";
import { ACAO_SUGERIDA_OPTIONS, ACAO_VALUES } from "./collections-copilot-options";

/**
 * Collections Copilot (STG-12, Autonomy Level 2 — Draft). Sugere a
 * próxima ação pra uma cobrança e, quando a ação sugerida é enviar
 * notificação, prepara um rascunho de texto — que fica editável e só
 * vira e-mail de verdade se um humano clicar em enviar (mesmo caminho
 * já existente, sendNotificacaoAction, Rodada 12). O copilot nunca
 * envia nada sozinho, nunca conclui um desconto, nunca muda status —
 * guardrails do roadmap STG-12 e regra 8 do AGENTS.md.
 */
export const COLLECTIONS_COPILOT_PROMPT_VERSION = 1;

export { ACAO_SUGERIDA_OPTIONS };

const SYSTEM_PROMPT = `Você é um copiloto de sugestão para a equipe de cobrança da GSBC (uma gestora sindical de benefícios e compliance no Brasil). Sua tarefa é olhar o estado atual de UMA cobrança e sugerir a próxima ação — a decisão final é sempre de um humano da equipe, que vai revisar sua sugestão antes de agir.

Regras estritas:
- Use APENAS as informações fornecidas abaixo. Nunca invente um dado (ex.: não invente um histórico de contato que não foi informado).
- Você pode SUGERIR, nunca DECIDIR ou EXECUTAR. Nunca diga que uma ação "foi tomada" — só que ela é recomendada.
- Nunca sugira conceder desconto, cancelar a cobrança, ou qualquer conclusão jurídica sobre a obrigação.
- A ação sugerida deve ser exatamente um destes valores: ${ACAO_VALUES.join(", ")}.
- Se sugerir "enviar_notificacao", prepare também um rascunho — mas não é uma carta inteira: é só o PARÁGRAFO ADICIONAL (2-4 frases, português do Brasil, tom profissional) que vai ser inserido dentro de um modelo de e-mail de notificação já existente, que já tem saudação, cabeçalho com valor/vencimento e fechamento prontos. Não repita saudação, não repita valor/vencimento (o modelo já mostra isso), não repita fechamento — só o conteúdo específico e humano desta cobrança (ex.: histórico de tentativas de contato, urgência, contexto). SEM inventar prazos ou valores que não estejam nos dados fornecidos.
- Para qualquer outra ação sugerida, o rascunho deve ser null.

Responda SOMENTE com um objeto JSON válido, sem nenhum texto antes ou depois, no formato exato:
{"acao_sugerida": "<um dos valores permitidos>", "justificativa": "<1-2 frases explicando o porquê, baseado só nos dados fornecidos>", "rascunho_notificacao": "<texto do rascunho, ou null>"}`;

export interface CollectionsCopilotInput {
  cobrancaId: string;
  empresaNome: string;
  obrigacaoDescricao: string;
  status: string;
  valorCobranca: number;
  vencimento: string | null;
  temNegociacaoAtiva: boolean;
  notificacoesRecentes: { assunto: string; status: string; createdAt: string }[];
  eventosRecentes: { toStatus: string; reason: string | null; createdAt: string }[];
}

export interface CollectionsCopilotResult {
  output: string;
  acaoSugerida: (typeof ACAO_VALUES)[number] | null;
  justificativa: string | null;
  rascunhoNotificacao: string | null;
  contextReference: Record<string, unknown>;
  parseOk: boolean;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value: string | null) {
  if (!value) return "não informado";
  return new Date(value).toLocaleDateString("pt-BR");
}

export async function sugerirAcaoCobranca(
  input: CollectionsCopilotInput,
): Promise<CollectionsCopilotResult> {
  const client = getAiClient();

  const notificacoesTexto =
    input.notificacoesRecentes.length > 0
      ? input.notificacoesRecentes
          .map((n) => `- [${formatDate(n.createdAt)}] "${n.assunto}" — status: ${n.status}`)
          .join("\n")
      : "(nenhuma notificação enviada ainda)";

  const eventosTexto =
    input.eventosRecentes.length > 0
      ? input.eventosRecentes
          .map((e) => `- [${formatDate(e.createdAt)}] status mudou para "${e.toStatus}"${e.reason ? ` — ${e.reason}` : ""}`)
          .join("\n")
      : "(nenhum evento de status registrado)";

  const userPrompt = `Empresa: ${input.empresaNome}
Obrigação: ${input.obrigacaoDescricao}
Status atual da cobrança: ${input.status}
Valor: ${formatCurrency(input.valorCobranca)}
Vencimento: ${formatDate(input.vencimento)}
Já existe negociação ativa nesta cobrança: ${input.temNegociacaoAtiva ? "sim" : "não"}

Notificações recentes:
${notificacoesTexto}

Eventos de status recentes:
${eventosTexto}`;

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text",
  );
  const output = textBlock?.text ?? "";

  const contextReference: Record<string, unknown> = {
    cobranca_id: input.cobrancaId,
    status_no_momento: input.status,
    tem_negociacao_ativa: input.temNegociacaoAtiva,
    quantidade_notificacoes_consideradas: input.notificacoesRecentes.length,
    quantidade_eventos_considerados: input.eventosRecentes.length,
  };

  try {
    const parsed = JSON.parse(output.trim()) as {
      acao_sugerida?: string;
      justificativa?: string;
      rascunho_notificacao?: string | null;
    };

    const acaoSugerida = ACAO_VALUES.includes(parsed.acao_sugerida as (typeof ACAO_VALUES)[number])
      ? (parsed.acao_sugerida as (typeof ACAO_VALUES)[number])
      : null;

    return {
      output,
      acaoSugerida,
      justificativa: parsed.justificativa ?? null,
      rascunhoNotificacao: parsed.rascunho_notificacao ?? null,
      contextReference,
      parseOk: acaoSugerida !== null,
    };
  } catch {
    return {
      output,
      acaoSugerida: null,
      justificativa: null,
      rascunhoNotificacao: null,
      contextReference,
      parseOk: false,
    };
  }
}
