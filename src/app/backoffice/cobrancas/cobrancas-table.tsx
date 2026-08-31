"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { DataTable } from "@/components/design-system/data-table";
import { FinancialCell, formatBrl } from "@/components/design-system/financial-cell";
import { MobileRowCard } from "@/components/design-system/mobile-row-card";
import { StatusBadge } from "@/components/design-system/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { cobrancaStatusOptions } from "@/lib/validation/cobranca";
import type { Database } from "@/types/database.types";

type CobrancaRow = Database["public"]["Tables"]["cobrancas"]["Row"] & {
  empresas: { razao_social: string; nome_fantasia: string | null } | null;
  tenants: { name: string } | null;
};

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

const PRIORIDADE_LABEL: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

interface CobrancasTableProps {
  data: CobrancaRow[];
  showTenantColumn: boolean;
}

export function CobrancasTable({ data, showTenantColumn }: CobrancasTableProps) {
  const columns: ColumnDef<CobrancaRow>[] = [
    {
      id: "empresa",
      accessorFn: (row) => row.empresas?.nome_fantasia ?? row.empresas?.razao_social ?? "",
      header: "Empresa",
      meta: { isPrimary: true },
      cell: ({ row }) => (
        <Link
          href={`/backoffice/cobrancas/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {row.original.empresas?.nome_fantasia ??
            row.original.empresas?.razao_social ??
            "—"}
        </Link>
      ),
    },
    ...(showTenantColumn
      ? [
          {
            id: "tenant",
            header: "Sindicato",
            meta: { cellClassName: "max-w-64 truncate" },
            cell: ({ row }: { row: { original: CobrancaRow } }) =>
              row.original.tenants?.name ?? "—",
          } satisfies ColumnDef<CobrancaRow>,
        ]
      : []),
    {
      accessorKey: "valor_cobranca",
      header: "Valor",
      meta: { isNumeric: true },
      cell: ({ row }) => <FinancialCell value={row.original.valor_cobranca} />,
    },
    {
      accessorKey: "vencimento",
      header: "Vencimento",
      cell: ({ row }) => formatDate(row.original.vencimento),
    },
    {
      accessorKey: "prioridade",
      header: "Prioridade",
      cell: ({ row }) =>
        PRIORIDADE_LABEL[row.original.prioridade] ?? row.original.prioridade,
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
      tableLabel="Cobranças"
      emptyTitle="Nenhuma cobrança gerada"
      emptyDescription="Cobranças são geradas a partir de obrigações validadas."
      enableSearch
      searchPlaceholder="Buscar por empresa..."
      renderMobileCard={(row) => (
        <MobileRowCard
          title={row.empresas?.nome_fantasia ?? row.empresas?.razao_social ?? "Empresa não informada"}
          subtitle={showTenantColumn ? row.tenants?.name : row.empresas?.razao_social}
          status={
            <StatusBadge
              label={STATUS_LABEL[row.status] ?? row.status}
              tone={STATUS_TONE[row.status] ?? "neutral"}
            />
          }
          value={formatBrl(row.valor_cobranca)}
          metadata={[
            { label: "Vencimento", value: formatDate(row.vencimento), priority: "primary" },
            {
              label: "Prioridade",
              value: PRIORIDADE_LABEL[row.prioridade] ?? row.prioridade,
              priority: "primary",
            },
            ...(showTenantColumn
              ? [{ label: "Sindicato", value: row.tenants?.name ?? "—", priority: "detail" as const }]
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
      )}
    />
  );
}
