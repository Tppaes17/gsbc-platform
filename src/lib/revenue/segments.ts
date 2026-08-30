export interface RevenueChargeSegmentInput {
  id: string;
  empresaId: string;
  empresaNome: string;
  obrigacaoId: string | null;
  obrigacaoDescricao: string | null;
  instrumentoId: string | null;
  status: string;
  valorCobranca: number;
  vencimento: string | null;
}

export interface RevenueObligationSegmentInput {
  id: string;
  descricao: string;
  instrumentoId: string;
  empresaId: string;
  valorReferencia: number;
  status: string;
}

export interface EmpresaSegment {
  empresaId: string;
  nome: string;
  total: number;
  count: number;
}

export interface ObrigacaoSegment {
  obrigacaoId: string;
  descricao: string;
  instrumentoId: string | null;
  total: number;
  count: number;
}

export interface PeriodoSegment {
  month: string;
  label: string;
  total: number;
  count: number;
  vencimentoInicio: string;
  vencimentoFim: string;
}

export interface StatusSegment {
  status: string;
  label: string;
  total: number;
  count: number;
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("pt-BR", {
    month: "short",
    year: "2-digit",
  });
}

function monthEnd(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

export function segmentByEmpresa(charges: RevenueChargeSegmentInput[]): EmpresaSegment[] {
  const segmentos = new Map<string, EmpresaSegment>();
  for (const charge of charges) {
    const atual = segmentos.get(charge.empresaId) ?? {
      empresaId: charge.empresaId,
      nome: charge.empresaNome,
      total: 0,
      count: 0,
    };
    atual.total += charge.valorCobranca;
    atual.count += 1;
    segmentos.set(charge.empresaId, atual);
  }
  return Array.from(segmentos.values()).sort((a, b) => b.total - a.total);
}

export function segmentByObrigacao(
  charges: RevenueChargeSegmentInput[],
  obligations: RevenueObligationSegmentInput[],
): ObrigacaoSegment[] {
  const segmentos = new Map<string, ObrigacaoSegment>();

  // Semeia com o valor de referência da obrigação — só usado como
  // estimativa de exibição pra obrigação que ainda não gerou nenhuma
  // cobrança de verdade (count = 0). Assim que a primeira cobrança
  // real aparecer, o total vira soma das cobranças, nunca uma mistura
  // dos dois — total tem que significar "soma do que foi cobrado",
  // igual às outras segmentações (por empresa/período/status), nunca
  // um valor "no máximo".
  for (const obligation of obligations) {
    segmentos.set(obligation.id, {
      obrigacaoId: obligation.id,
      descricao: obligation.descricao,
      instrumentoId: obligation.instrumentoId,
      total: obligation.valorReferencia,
      count: 0,
    });
  }

  for (const charge of charges) {
    if (!charge.obrigacaoId) continue;
    const atual = segmentos.get(charge.obrigacaoId) ?? {
      obrigacaoId: charge.obrigacaoId,
      descricao: charge.obrigacaoDescricao ?? "Obrigação",
      instrumentoId: charge.instrumentoId,
      total: 0,
      count: 0,
    };
    atual.total = atual.count === 0 ? charge.valorCobranca : atual.total + charge.valorCobranca;
    atual.count += 1;
    segmentos.set(charge.obrigacaoId, atual);
  }

  return Array.from(segmentos.values()).sort((a, b) => b.total - a.total);
}

export function segmentByPeriodo(charges: RevenueChargeSegmentInput[]): PeriodoSegment[] {
  const segmentos = new Map<string, PeriodoSegment>();
  for (const charge of charges) {
    if (!charge.vencimento) continue;
    const month = charge.vencimento.slice(0, 7);
    const atual = segmentos.get(month) ?? {
      month,
      label: monthLabel(month),
      total: 0,
      count: 0,
      vencimentoInicio: `${month}-01`,
      vencimentoFim: monthEnd(month),
    };
    atual.total += charge.valorCobranca;
    atual.count += 1;
    segmentos.set(month, atual);
  }
  return Array.from(segmentos.values()).sort((a, b) => a.month.localeCompare(b.month));
}

export function segmentByStatus(
  charges: RevenueChargeSegmentInput[],
  statusLabels: Record<string, string>,
): StatusSegment[] {
  const segmentos = new Map<string, StatusSegment>();
  for (const charge of charges) {
    const atual = segmentos.get(charge.status) ?? {
      status: charge.status,
      label: statusLabels[charge.status] ?? charge.status,
      total: 0,
      count: 0,
    };
    atual.total += charge.valorCobranca;
    atual.count += 1;
    segmentos.set(charge.status, atual);
  }
  return Array.from(segmentos.values()).sort((a, b) => b.total - a.total);
}
