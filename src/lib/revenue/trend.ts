/**
 * Tendência mensal (STG-08): "previsto" = valor_cobranca agrupado pelo
 * mês de vencimento (cobranças validadas, não rascunho — mesmo corte de
 * "identificado mas ainda não real" do resto do dashboard); "realizado"
 * = pagamentos.valor agrupado pelo mês em que o pagamento aconteceu.
 * Nenhum valor futuro é projetado/estimado — só o que já está no banco.
 */

export interface MonthlyTrendPoint {
  month: string; // "YYYY-MM"
  monthLabel: string;
  previsto: number;
  realizado: number;
  realizadoAcumulado: number;
}

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

export function computeMonthlyTrend(
  previstoInput: { vencimento: string; valor: number }[],
  realizadoInput: { dataPagamento: string; valor: number }[],
): MonthlyTrendPoint[] {
  const previstoPorMes = new Map<string, number>();
  for (const { vencimento, valor } of previstoInput) {
    const key = monthKey(vencimento);
    previstoPorMes.set(key, (previstoPorMes.get(key) ?? 0) + valor);
  }

  const realizadoPorMes = new Map<string, number>();
  for (const { dataPagamento, valor } of realizadoInput) {
    const key = monthKey(dataPagamento);
    realizadoPorMes.set(key, (realizadoPorMes.get(key) ?? 0) + valor);
  }

  const meses = Array.from(new Set([...previstoPorMes.keys(), ...realizadoPorMes.keys()])).sort();

  let acumulado = 0;
  return meses.map((key) => {
    const realizado = realizadoPorMes.get(key) ?? 0;
    acumulado += realizado;
    return {
      month: key,
      monthLabel: monthLabel(key),
      previsto: previstoPorMes.get(key) ?? 0,
      realizado,
      realizadoAcumulado: acumulado,
    };
  });
}
