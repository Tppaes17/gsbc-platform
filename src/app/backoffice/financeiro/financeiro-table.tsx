"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { DataTable } from "@/components/design-system/data-table";
import { FinancialCell, formatBrl } from "@/components/design-system/financial-cell";
import { MobileRowCard } from "@/components/design-system/mobile-row-card";
import { StatusBadge } from "@/components/design-system/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { cobrancaStatusOptions } from "@/lib/validation/cobranca";

interface FinanceiroRow {
  id: string;
  empresaNome: string;
  tenantNome: string | null | undefined;
  valorCobranca: number;
  valorReferencia: number;
  totalPago: number;
  saldo: number;
  status: string;
  vencimento: string | null;
  vencida: boolean;
}

const STATUS_LABEL = Object.fromEntries(
  cobrancaStatusOptions.map((o) => [o.value, o.label]),
);

const STATUS_TONE: Record<string, "positive" | "neutral" | "warning" | "negative" | "info"> = {
  draft: "neutral",
  pending_validation: "info",
  approved: "info",
  notified: "info",
  contacted: "info",
  negotiating: "warning",
  agreement_reached: "positive",
  partially_paid: "warning",
  paid: "positive",
  overdue: "negative",
  suspended: "neutral",
  cancelled: "neutral",
  legal_escalation: "negative",
  closed: "neutral",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

export function FinanceiroTable({
  data,
  showTenantColumn,
}: {
  data: FinanceiroRow[];
  showTenantColumn: boolean;
}) {
  const columns: ColumnDef<FinanceiroRow>[] = [
    {
      accessorKey: "empresaNome",
      header: "Empresa",
      meta: { isPrimary: true },
      cell: ({ row }) => (
        <Link
          href={`/backoffice/cobrancas/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {row.original.empresaNome}
        </Link>
      ),
    },
    ...(showTenantColumn
      ? [
          {
            id: "tenant",
            header: "Sindicato",
            meta: { cellClassName: "max-w-64 truncate" },
            cell: ({ row }: { row: { original: FinanceiroRow } }) =>
              row.original.tenantNome ?? "—",
          } satisfies ColumnDef<FinanceiroRow>,
        ]
      : []),
    {
      accessorKey: "valorCobranca",
      header: "Valor total",
      meta: { isNumeric: true },
      cell: ({ row }) => {
        const { valorCobranca, valorReferencia } = row.original;
        const temDesconto = valorReferencia !== valorCobranca;
        return (
          <FinancialCell
            value={valorCobranca}
            secondary={temDesconto ? `Acordado: ${formatBrl(valorReferencia)}` : undefined}
          />
        );
      },
    },
    {
      accessorKey: "totalPago",
      header: "Pago",
      meta: { isNumeric: true },
      cell: ({ row }) => <FinancialCell value={row.original.totalPago} tone="positive" />,
    },
    {
      accessorKey: "saldo",
      header: "Saldo",
      meta: { isNumeric: true },
      cell: ({ row }) => (
        <FinancialCell value={row.original.saldo} tone={row.original.saldo > 0 ? "warning" : "muted"} />
      ),
    },
    {
      accessorKey: "vencimento",
      header: "Vencimento",
      cell: ({ row }) => (
        <span className={row.original.vencida ? "font-medium text-destructive" : undefined}>
          {formatDate(row.original.vencimento)}
          {row.original.vencida ? " · vencida" : ""}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge
          label={STATUS_LABEL[row.original.status] ?? row.original.status}
          tone={STATUS_TONE[row.original.status] ?? "neutral"}
        />
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      density="compact"
      tableLabel="Financeiro"
      emptyTitle="Nenhuma cobrança gerada"
      emptyDescription="A visão financeira aparece assim que houver cobranças geradas."
      enableSearch
      searchPlaceholder="Buscar por empresa..."
      renderMobileCard={(row) => {
        const temDesconto = row.valorReferencia !== row.valorCobranca;
        return (
          <MobileRowCard
            title={row.empresaNome}
            subtitle={showTenantColumn ? row.tenantNome : undefined}
            status={
              <StatusBadge
                label={STATUS_LABEL[row.status] ?? row.status}
                tone={STATUS_TONE[row.status] ?? "neutral"}
              />
            }
            value={formatBrl(row.saldo)}
            metadata={[
              { label: "Saldo", value: formatBrl(row.saldo), priority: "primary" },
              { label: "Pago", value: formatBrl(row.totalPago), priority: "primary" },
              {
                label: "Total",
                value: temDesconto
                  ? `${formatBrl(row.valorCobranca)} · acordado ${formatBrl(row.valorReferencia)}`
                  : formatBrl(row.valorCobranca),
                priority: "secondary",
              },
              {
                label: "Vencimento",
                value: `${formatDate(row.vencimento)}${row.vencida ? " · vencida" : ""}`,
                priority: "secondary",
              },
              ...(showTenantColumn
                ? [{ label: "Sindicato", value: row.tenantNome ?? "—", priority: "detail" as const }]
                : []),
            ]}
            action={
              <Link
                href={`/backoffice/cobrancas/${row.id}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Abrir cobrança
              </Link>
            }
          />
        );
      }}
    />
  );
}
