import { valorReferenciaCobranca } from "@/lib/finance/referencia";

/**
 * Os 8 KPIs do roadmap (STG-08) mapeados pra status que a plataforma já
 * exercita de verdade — a maioria é literalmente soma de valor_cobranca
 * agrupada por status atual (mutuamente exclusivos, cada cobrança tem
 * um status só); "identificada" vem de obrigações (upstream) e
 * "recebida" do ledger de pagamentos (não de status — reflete dinheiro
 * de verdade, inclusive pagamento parcial).
 */

export interface CobrancaKpiInput {
  id: string;
  empresaId: string;
  status: string;
  valorCobranca: number;
  negociacao: { status: string; valor_atual: number | null } | null;
}

export interface RevenueKpis {
  identificada: number;
  validada: number;
  emCobranca: number;
  emNegociacao: number;
  acordada: number;
  recebida: number;
  vencida: number;
  contestada: number;
}

const STATUS_NAO_VALIDADO = new Set(["draft", "pending_validation"]);
const STATUS_EM_COBRANCA = new Set(["approved", "notified", "contacted"]);

export function computeKpis(
  cobrancas: CobrancaKpiInput[],
  valorIdentificado: number,
  totalPago: number,
): RevenueKpis {
  const kpis: RevenueKpis = {
    identificada: valorIdentificado,
    validada: 0,
    emCobranca: 0,
    emNegociacao: 0,
    acordada: 0,
    recebida: totalPago,
    vencida: 0,
    contestada: 0,
  };

  for (const c of cobrancas) {
    if (!STATUS_NAO_VALIDADO.has(c.status)) {
      kpis.validada += c.valorCobranca;
    }
    if (STATUS_EM_COBRANCA.has(c.status)) {
      kpis.emCobranca += c.valorCobranca;
    }
    if (c.status === "negotiating") {
      kpis.emNegociacao += c.valorCobranca;
    }
    if (c.status === "agreement_reached") {
      kpis.acordada += valorReferenciaCobranca(c.valorCobranca, c.negociacao);
    }
    if (c.status === "overdue") {
      kpis.vencida += c.valorCobranca;
    }
    if (c.status === "contestada") {
      kpis.contestada += c.valorCobranca;
    }
  }

  return kpis;
}
