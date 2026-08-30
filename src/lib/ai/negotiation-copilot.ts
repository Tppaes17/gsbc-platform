import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { AI_MODEL, getAiClient } from "./client";
import { sanitizeAiContextText, summarizeAiContextSafety } from "./guardrails";

/**
 * Negotiation Copilot (STG-12, Autonomy Level 1 — Insight). Só leitura:
 * resume a timeline de uma negociação já existente, destaca pendências,
 * compara o valor negociado contra o original da cobrança. Nunca sugere
 * um valor, nunca conclui se um desconto é "razoável", nunca produz uma
 * decisão — isso é sempre humano (regra 8 do AGENTS.md).
 */
export const NEGOTIATION_COPILOT_PROMPT_VERSION = 1;

const SYSTEM_PROMPT = `Você é um copiloto de leitura para a equipe de cobrança da GSBC (uma gestora sindical de benefícios e compliance no Brasil). Sua única tarefa é resumir o estado de UMA negociação de cobrança, a partir do histórico de eventos fornecido pelo usuário.

Regras estritas:
- Use APENAS as informações fornecidas no histórico abaixo. Nunca invente, estime ou presuma um dado que não esteja explicitamente no texto.
- Nunca dê uma opinião sobre se um valor ou desconto é "razoável", "bom" ou "ruim" — isso é uma decisão humana, não sua.
- Nunca sugira uma ação, um próximo valor ou uma conclusão jurídica.
- Se faltar dado pra alguma seção, diga isso explicitamente ("sem dado suficiente pra isso") em vez de inferir.
- Responda em português do Brasil, direto e objetivo, sem saudação nem despedida.

Estruture a resposta em exatamente 3 seções, cada uma com um título em negrito markdown:

**Resumo da timeline**
2 a 3 frases descrevendo a sequência de propostas/contrapropostas/eventos, na ordem em que aconteceram.

**Pendências**
O que está em aberto agora — por exemplo, uma proposta sem resposta, ou diga "nenhuma pendência aparente" se o histórico não indicar nada em aberto.

**Comparação de valores**
Valor original da cobrança vs. valor negociado atual, e o percentual de diferença entre eles se ambos os valores estiverem disponíveis. Se não houver valor negociado ainda, diga isso.`;

export interface NegotiationEventoInput {
  id: string;
  tipo: string;
  valor: number | null;
  condicoes: string | null;
  createdAt: string;
  autorNome: string | null;
}

export interface NegotiationCopilotInput {
  negociacaoId: string;
  empresaNome: string;
  status: string;
  valorOriginal: number | null;
  valorAtual: number | null;
  eventos: NegotiationEventoInput[];
}

export interface NegotiationCopilotResult {
  output: string;
  contextReference: Record<string, unknown>;
  contextSafety: Record<string, unknown>;
}

const TIPO_LABEL: Record<string, string> = {
  proposta_gsbc: "Proposta da GSBC",
  contraproposta_empresa: "Contraproposta da empresa",
  aceite: "Aceite",
  recusa: "Recusa",
  observacao: "Observação",
};

function formatCurrency(value: number | null) {
  if (value === null) return "não informado";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatEventos(eventos: NegotiationEventoInput[]): string {
  if (eventos.length === 0) return "(nenhum evento registrado ainda)";
  return eventos
    .map((e) => {
      const partes = [
        `[${new Date(e.createdAt).toLocaleString("pt-BR")}]`,
        sanitizeAiContextText(TIPO_LABEL[e.tipo] ?? e.tipo).text,
        e.valor !== null ? `(${formatCurrency(e.valor)})` : null,
        e.condicoes ? `— ${sanitizeAiContextText(e.condicoes).text}` : null,
        `· por ${sanitizeAiContextText(e.autorNome ?? "desconhecido").text}`,
      ].filter(Boolean);
      return `- ${partes.join(" ")}`;
    })
    .join("\n");
}

export async function gerarResumoNegociacao(
  input: NegotiationCopilotInput,
): Promise<NegotiationCopilotResult> {
  const client = getAiClient();

  const empresaNome = sanitizeAiContextText(input.empresaNome).text;
  const status = sanitizeAiContextText(input.status).text;
  const contextSafety = summarizeAiContextSafety({
    empresaNome: input.empresaNome,
    status: input.status,
    eventos: input.eventos.map((e) => `${e.tipo} ${e.condicoes ?? ""} ${e.autorNome ?? ""}`).join(" | "),
  });

  const userPrompt = `Empresa: ${empresaNome}
Status atual da negociação: ${status}
Valor original da cobrança: ${formatCurrency(input.valorOriginal)}
Valor negociado atual: ${formatCurrency(input.valorAtual)}

Histórico de eventos (do mais antigo ao mais recente):
${formatEventos(input.eventos)}`;

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text",
  );

  return {
    output: textBlock?.text ?? "",
    contextReference: {
      negociacao_id: input.negociacaoId,
      eventos_ids: input.eventos.map((e) => e.id),
      status_no_momento: input.status,
      valor_original: input.valorOriginal,
      valor_atual: input.valorAtual,
    },
    contextSafety,
  };
}
