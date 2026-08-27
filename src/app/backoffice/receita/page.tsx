import { PageHeader } from "@/components/design-system/page-header";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { computeKpis } from "@/lib/revenue/kpis";
import { computeConversions, computeFunnel } from "@/lib/revenue/funnel";
import { computeMonthlyTrend } from "@/lib/revenue/trend";
import { KpiGrid } from "./kpi-grid";
import { FunnelSection } from "./funnel-section";
import { TrendChart } from "./trend-chart";
import { SegmentacaoSection } from "./segmentacao-section";

const OBRIGACAO_STATUS_EXCLUIDO = new Set(["cancelled"]);

export default async function ReceitaPage() {
  const user = await requireCurrentUser();
  const supabase = await createClient();

  const [
    { data: obrigacoesRaw },
    { data: cobrancasRaw },
    { data: eventosRaw },
    { data: negociacoesRaw },
    { data: pagamentosRaw },
  ] = await Promise.all([
    supabase.from("obrigacoes").select("id, status, valor_referencia"),
    supabase
      .from("cobrancas")
      .select("id, empresa_id, status, valor_cobranca, vencimento, empresas(razao_social, nome_fantasia)"),
    supabase.from("cobranca_eventos").select("cobranca_id, to_status"),
    supabase.from("negociacoes").select("cobranca_id, status, valor_atual"),
    supabase.from("pagamentos").select("valor, data_pagamento"),
  ]);

  const obrigacoes = obrigacoesRaw ?? [];
  const cobrancas = cobrancasRaw ?? [];
  const eventos = eventosRaw ?? [];
  const negociacoes = negociacoesRaw ?? [];
  const pagamentos = pagamentosRaw ?? [];

  const obrigacoesValidas = obrigacoes.filter((o) => !OBRIGACAO_STATUS_EXCLUIDO.has(o.status));
  const valorIdentificado = obrigacoesValidas.reduce((sum, o) => sum + (o.valor_referencia ?? 0), 0);

  const negociacaoPorCobranca = new Map(negociacoes.map((n) => [n.cobranca_id, n]));

  const totalPago = pagamentos.reduce((sum, p) => sum + p.valor, 0);

  const kpis = computeKpis(
    cobrancas.map((c) => ({
      id: c.id,
      empresaId: c.empresa_id,
      status: c.status,
      valorCobranca: c.valor_cobranca,
      negociacao: negociacaoPorCobranca.get(c.id) ?? null,
    })),
    valorIdentificado,
    totalPago,
  );

  const funnel = computeFunnel(
    cobrancas.map((c) => ({ id: c.id, valorCobranca: c.valor_cobranca })),
    eventos.map((e) => ({ cobrancaId: e.cobranca_id, toStatus: e.to_status })),
    valorIdentificado,
    obrigacoesValidas.length,
  );
  const conversoes = computeConversions(funnel);

  const STATUS_NAO_VALIDADO = new Set(["draft", "pending_validation"]);
  const trend = computeMonthlyTrend(
    cobrancas
      .filter((c) => c.vencimento && !STATUS_NAO_VALIDADO.has(c.status))
      .map((c) => ({ vencimento: c.vencimento!, valor: c.valor_cobranca })),
    pagamentos.map((p) => ({ dataPagamento: p.data_pagamento, valor: p.valor })),
  );

  const porEmpresa = new Map<string, { nome: string; total: number; count: number }>();
  for (const c of cobrancas) {
    const empresa = Array.isArray(c.empresas) ? c.empresas[0] : c.empresas;
    const nome = empresa?.nome_fantasia ?? empresa?.razao_social ?? "Empresa";
    const atual = porEmpresa.get(c.empresa_id) ?? { nome, total: 0, count: 0 };
    atual.total += c.valor_cobranca;
    atual.count += 1;
    porEmpresa.set(c.empresa_id, atual);
  }
  const segmentacaoEmpresa = Array.from(porEmpresa.entries())
    .map(([empresaId, dados]) => ({ empresaId, ...dados }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Receita"
        description={
          user.isPlatformStaff
            ? "Revenue Command Center — visão consolidada da receita, do identificado ao recebido."
            : `Revenue Command Center — ${user.memberships[0]?.tenantName ?? "seu sindicato"}.`
        }
      />

      <KpiGrid kpis={kpis} />

      <FunnelSection funnel={funnel} conversoes={conversoes} />

      <TrendChart data={trend} />

      <SegmentacaoSection porEmpresa={segmentacaoEmpresa} />
    </div>
  );
}
