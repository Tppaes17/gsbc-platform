"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { DataTable } from "@/components/design-system/data-table";
import { StatusBadge } from "@/components/design-system/status-badge";
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

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

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
      id: "empresa",
      header: "Empresa",
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
            cell: ({ row }: { row: { original: FinanceiroRow } }) =>
              row.original.tenantNome ?? "—",
          } satisfies ColumnDef<FinanceiroRow>,
        ]
      : []),
    {
      accessorKey: "valorCobranca",
      header: "Valor total",
      cell: ({ row }) => {
        const { valorCobranca, valorReferencia } = row.original;
        const temDesconto = valorReferencia !== valorCobranca;
        return (
          <span>
            {formatCurrency(valorCobranca)}
            {temDesconto ? (
              <span className="block text-xs text-muted-foreground">
                Acordado: {formatCurrency(valorReferencia)}
              </span>
            ) : null}
          </span>
        );
      },
    },
    {
      accessorKey: "totalPago",
      header: "Pago",
      cell: ({ row }) => formatCurrency(row.original.totalPago),
    },
    {
      accessorKey: "saldo",
      header: "Saldo",
      cell: ({ row }) => formatCurrency(row.original.saldo),
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
      emptyTitle="Nenhuma cobrança gerada"
      emptyDescription="A visão financeira aparece assim que houver cobranças geradas."
    />
  );
}
