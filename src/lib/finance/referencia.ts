/**
 * Espelha `public.valor_referencia_cobranca()` (migration 0015): o valor
 * a considerar para "quitação" é o valor negociado quando existe uma
 * negociação aceita, senão o valor_cobranca original. O valor original
 * nunca é alterado — só o critério de quitação muda.
 */
export function valorReferenciaCobranca(
  valorCobranca: number,
  negociacao?: { status: string; valor_atual: number | null } | null,
): number {
  if (negociacao?.status === "aceita" && negociacao.valor_atual !== null) {
    return negociacao.valor_atual;
  }
  return valorCobranca;
}
