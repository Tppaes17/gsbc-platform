/**
 * Revenue Command Center (STG-08) — todo cálculo aqui deriva de status
 * já exercitados de verdade pelo resto da plataforma (cobrancas.status,
 * cobranca_eventos, pagamentos) — nunca um campo novo "estágio de
 * funil" inventado (regra 5 do AGENTS.md). O funil usa o "maior estágio
 * já alcançado" de cada cobrança (via cobranca_eventos.to_status, que já
 * guarda cada status por onde ela passou) em vez do status atual —
 * assim uma cobrança cancelada depois de negociar continua contando
 * como "chegou a negociar" no funil, que é a pergunta que a
 * Collections Product Specialist faria ("quanto chegamos a negociar",
 * não "quanto está negociando agora").
 */

export const FUNNEL_STAGES = ["identificado", "validado", "cobrado", "negociado", "recebido"] as const;
export type FunnelStage = (typeof FUNNEL_STAGES)[number];

export const FUNNEL_STAGE_LABEL: Record<FunnelStage, string> = {
  identificado: "Identificado",
  validado: "Validado",
  cobrado: "Cobrado",
  negociado: "Negociado",
  recebido: "Recebido",
};

// Rank 0 (draft/pending_validation) não conta como "Validado" — é a
// mesma barreira já usada pra liberar a régua de cobrança (Rodada 19,
// STATUS_PODE_INICIAR_REGUA). Status sem rank aqui (cancelled, closed)
// nunca definem o teto sozinhos — só o maior rank JÁ alcançado importa.
const STATUS_RANK: Record<string, number> = {
  approved: 1,
  notified: 2,
  contacted: 2,
  overdue: 2,
  suspended: 2,
  contestada: 2,
  negotiating: 3,
  agreement_reached: 3,
  legal_escalation: 3,
  partially_paid: 4,
  paid: 4,
};

export interface CobrancaFunilInput {
  id: string;
  valorCobranca: number;
}

/** to_status de cobranca_eventos, uma linha por evento — várias por cobrança. */
export interface EventoFunilInput {
  cobrancaId: string;
  toStatus: string;
}

export interface FunnelResult {
  stage: FunnelStage;
  label: string;
  count: number;
  valor: number;
}

export interface ConversionResult {
  from: FunnelStage;
  to: FunnelStage;
  fromLabel: string;
  toLabel: string;
  rate: number | null;
}

function maiorRankPorCobranca(eventos: EventoFunilInput[]): Map<string, number> {
  const ranks = new Map<string, number>();
  for (const evento of eventos) {
    const rank = STATUS_RANK[evento.toStatus];
    if (rank === undefined) continue;
    const atual = ranks.get(evento.cobrancaId) ?? 0;
    if (rank > atual) ranks.set(evento.cobrancaId, rank);
  }
  return ranks;
}

const STAGE_MIN_RANK: Record<Exclude<FunnelStage, "identificado">, number> = {
  validado: 1,
  cobrado: 2,
  negociado: 3,
  recebido: 4,
};

/**
 * "Identificado" é o universo de obrigações (upstream de qualquer
 * cobrança) — os demais estágios são sobre cobranças que já existem.
 * valorIdentificado já vem somado de fora (obrigacoes.valor_referencia).
 */
export function computeFunnel(
  cobrancas: CobrancaFunilInput[],
  eventos: EventoFunilInput[],
  valorIdentificado: number,
  countIdentificado: number,
): FunnelResult[] {
  const rankPorCobranca = maiorRankPorCobranca(eventos);

  const resultados: FunnelResult[] = [
    { stage: "identificado", label: FUNNEL_STAGE_LABEL.identificado, count: countIdentificado, valor: valorIdentificado },
  ];

  for (const stage of FUNNEL_STAGES.slice(1) as Exclude<FunnelStage, "identificado">[]) {
    const minRank = STAGE_MIN_RANK[stage];
    let count = 0;
    let valor = 0;
    for (const cobranca of cobrancas) {
      const rank = rankPorCobranca.get(cobranca.id) ?? 0;
      if (rank >= minRank) {
        count += 1;
        valor += cobranca.valorCobranca;
      }
    }
    resultados.push({ stage, label: FUNNEL_STAGE_LABEL[stage], count, valor });
  }

  return resultados;
}

export function computeConversions(funnel: FunnelResult[]): ConversionResult[] {
  const conversoes: ConversionResult[] = [];
  for (let i = 0; i < funnel.length - 1; i++) {
    const atual = funnel[i];
    const proximo = funnel[i + 1];
    conversoes.push({
      from: atual.stage,
      to: proximo.stage,
      fromLabel: atual.label,
      toLabel: proximo.label,
      rate: atual.valor > 0 ? proximo.valor / atual.valor : null,
    });
  }
  return conversoes;
}
