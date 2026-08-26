import { PageHeader } from "@/components/design-system/page-header";
import { MetricCard } from "@/components/design-system/metric-card";
import { CircleDollarSign, TriangleAlert, Wallet } from "lucide-react";
import { requireCurrentUser } from "@/lib/auth/session";
import { valorReferenciaCobranca } from "@/lib/finance/referencia";
import { createClient } from "@/lib/supabase/server";
import { FinanceiroTable } from "./financeiro-table";

const STATUS_ENCERRADO = ["paid", "cancelled", "closed"];

export default async function FinanceiroPage() {
  const user = await requireCurrentUser();
  const supabase = await createClient();

  const { data: cobrancasRaw } = await supabase
    .from("cobrancas")
    .select(
      "id, valor_cobranca, vencimento, status, empresas(razao_social, nome_fantasia), tenants(name), pagamentos(valor), negociacoes(status, valor_atual)",
    )
    .order("vencimento");

  const hoje = new Date().toISOString().slice(0, 10);

  const cobrancas = (cobrancasRaw ?? []).map((c) => {
    const negociacao = Array.isArray(c.negociacoes) ? c.negociacoes[0] : c.negociacoes;
    const valorReferencia = valorReferenciaCobranca(c.valor_cobranca, negociacao);
    const totalPago = (c.pagamentos ?? []).reduce((sum, p) => sum + p.valor, 0);
    const saldo = Math.max(valorReferencia - totalPago, 0);
    const empresa = Array.isArray(c.empresas) ? c.empresas[0] : c.empresas;
    const vencida =
      !!c.vencimento &&
      c.vencimento < hoje &&
      !STATUS_ENCERRADO.includes(c.status) &&
      saldo > 0;
    return {
      id: c.id,
      empresaNome: empresa?.nome_fantasia ?? empresa?.razao_social ?? "—",
      tenantNome: Array.isArray(c.tenants) ? c.tenants[0]?.name : c.tenants?.name,
      valorCobranca: c.valor_cobranca,
      valorReferencia,
      totalPago,
      saldo,
      status: c.status,
      vencimento: c.vencimento,
      vencida,
    };
  });

  const totalCobrado = cobrancas.reduce((sum, c) => sum + c.valorCobranca, 0);
  const totalPago = cobrancas.reduce((sum, c) => sum + c.totalPago, 0);
  const vencidasCount = cobrancas.filter((c) => c.vencida).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Financeiro"
        description="Pagamentos registrados contra cada cobrança e situação de inadimplência."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Total cobrado"
          value={totalCobrado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          icon={Wallet}
        />
        <MetricCard
          label="Total pago"
          value={totalPago.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          icon={CircleDollarSign}
        />
        <MetricCard
          label="Cobranças vencidas"
          value={String(vencidasCount)}
          icon={TriangleAlert}
          hint="Vencimento passado, com saldo em aberto."
        />
      </div>

      <FinanceiroTable data={cobrancas} showTenantColumn={user.isPlatformStaff} />
    </div>
  );
}
