import { redirect } from "next/navigation";
import { CalendarRange, FileCheck2, SplitSquareHorizontal, TriangleAlert } from "lucide-react";
import { MetricCard } from "@/components/design-system/metric-card";
import { PageHeader } from "@/components/design-system/page-header";
import { StatusBadge } from "@/components/design-system/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { FinancialContractsForms } from "./financial-contracts-forms";

const statusTone: Record<string, "neutral" | "info" | "positive" | "warning" | "negative"> = {
  draft: "neutral",
  pending_validation: "warning",
  validated: "positive",
  archived: "neutral",
};

const statusLabel: Record<string, string> = {
  draft: "Rascunho",
  pending_validation: "Pendente",
  validated: "Validado",
  archived: "Arquivado",
};

function formatPercent(value: number) {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}%`;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value: string | null) {
  if (!value) return "sem fim";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export default async function ContratosFinanceirosPage() {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    redirect("/backoffice");
  }

  const supabase = await createClient();
  const [{ data: sindicatosRaw }, { data: contractsRaw }, { data: splitRulesRaw }, { count: manualReviewCount }] =
    await Promise.all([
      supabase
        .from("sindicatos")
        .select("id, tenant_id, razao_social, nome_fantasia, status")
        .order("razao_social"),
      supabase
        .from("financial_contracts")
        .select("id, tenant_id, sindicato_id, titulo, status, vigencia_inicio, vigencia_fim, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("financial_split_rules")
        .select(
          "id, contract_id, tenant_id, version, status, effective_from, effective_to, gsbc_percent, sindicato_percent, terceiros_percent, fee_policy, created_at",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("payment_reconciliations")
        .select("id", { count: "exact", head: true })
        .eq("status", "manual_review"),
    ]);

  const sindicatos = (sindicatosRaw ?? []).map((sindicato) => ({
    id: sindicato.id,
    tenantId: sindicato.tenant_id,
    label: sindicato.nome_fantasia ?? sindicato.razao_social,
    status: sindicato.status,
  }));
  const sindicatosById = new Map(sindicatos.map((sindicato) => [sindicato.id, sindicato]));
  const activeRuleByContract = new Map(
    (splitRulesRaw ?? [])
      .filter((rule) => rule.status === "active")
      .map((rule) => [rule.contract_id, rule]),
  );
  const validatedContracts = (contractsRaw ?? []).filter((contract) => contract.status === "validated");
  const activeRulesCount = (splitRulesRaw ?? []).filter((rule) => rule.status === "active").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Contratos Financeiros"
        description="Governança operacional de contratos validados e regras de split versionadas para reconciliação e repasses."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Contratos validados" value={String(validatedContracts.length)} icon={FileCheck2} />
        <MetricCard label="Regras ativas" value={String(activeRulesCount)} icon={SplitSquareHorizontal} />
        <MetricCard label="Sindicatos elegíveis" value={String(sindicatos.length)} icon={CalendarRange} />
        <MetricCard
          label="Revisão manual"
          value={String(manualReviewCount ?? 0)}
          icon={TriangleAlert}
          hint="Reconciliações financeiras aguardando decisão humana."
        />
      </div>

      <FinancialContractsForms
        sindicatos={sindicatos.map((sindicato) => ({ id: sindicato.id, label: sindicato.label }))}
        contracts={validatedContracts.map((contract) => ({
          id: contract.id,
          label: `${contract.titulo} · ${sindicatosById.get(contract.sindicato_id)?.label ?? "Sindicato"}`,
        }))}
      />

      <Card>
        <CardHeader>
          <CardTitle>Contratos e regras vigentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="border-b text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">Contrato</th>
                  <th className="py-2 pr-4 font-medium">Sindicato</th>
                  <th className="py-2 pr-4 font-medium">Vigência</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Split ativo</th>
                  <th className="py-2 pr-4 font-medium">Taxas provider</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(contractsRaw ?? []).map((contract) => {
                  const rule = activeRuleByContract.get(contract.id);
                  const feePolicy = rule?.fee_policy as
                    | { provider_fee_percent?: number; provider_fee_fixed?: number }
                    | undefined;
                  return (
                    <tr key={contract.id}>
                      <td className="py-3 pr-4 font-medium">{contract.titulo}</td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {sindicatosById.get(contract.sindicato_id)?.label ?? "—"}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {formatDate(contract.vigencia_inicio)} até {formatDate(contract.vigencia_fim)}
                      </td>
                      <td className="py-3 pr-4">
                        <StatusBadge
                          label={statusLabel[contract.status] ?? contract.status}
                          tone={statusTone[contract.status] ?? "neutral"}
                        />
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {rule ? (
                          <span>
                            v{rule.version} · GSBC {formatPercent(rule.gsbc_percent)} · Sindicato{" "}
                            {formatPercent(rule.sindicato_percent)} · Terceiros{" "}
                            {formatPercent(rule.terceiros_percent)}
                          </span>
                        ) : (
                          "Sem regra ativa"
                        )}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {rule
                          ? `${formatPercent(Number(feePolicy?.provider_fee_percent ?? 0))} + ${formatCurrency(
                              Number(feePolicy?.provider_fee_fixed ?? 0),
                            )}`
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
                {(contractsRaw ?? []).length === 0 ? (
                  <tr>
                    <td className="py-6 text-muted-foreground" colSpan={6}>
                      Nenhum contrato financeiro validado ainda.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
