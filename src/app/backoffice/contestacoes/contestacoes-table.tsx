"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { DataTable } from "@/components/design-system/data-table";
import { StatusBadge } from "@/components/design-system/status-badge";
import { contestacaoTipoOptions } from "@/lib/validation/contestacao";
import type { Database } from "@/types/database.types";

type ContestacaoRow = Database["public"]["Tables"]["contestacoes"]["Row"] & {
  empresas: { razao_social: string; nome_fantasia: string | null } | null;
  tenants: { name: string } | null;
};

const TIPO_LABEL = Object.fromEntries(contestacaoTipoOptions.map((o) => [o.value, o.label]));

const STATUS_LABEL: Record<string, string> = {
  aberta: "Aberta",
  em_analise: "Em análise",
  procedente: "Procedente",
  parcialmente_procedente: "Parcialmente procedente",
  improcedente: "Improcedente",
  inconclusiva: "Inconclusiva",
};

const STATUS_TONE: Record<string, "positive" | "neutral" | "warning" | "negative" | "info"> = {
  aberta: "negative",
  em_analise: "warning",
  procedente: "positive",
  parcialmente_procedente: "warning",
  improcedente: "neutral",
  inconclusiva: "neutral",
};

function formatCurrency(value: number | null) {
  if (value === null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

interface ContestacoesTableProps {
  data: ContestacaoRow[];
  showTenantColumn: boolean;
}

export function ContestacoesTable({ data, showTenantColumn }: ContestacoesTableProps) {
  const columns: ColumnDef<ContestacaoRow>[] = [
    {
      id: "empresa",
      header: "Empresa",
      cell: ({ row }) => (
        <Link
          href={`/backoffice/cobrancas/${row.original.cobranca_id}`}
          className="font-medium hover:underline"
        >
          {row.original.empresas?.nome_fantasia ?? row.original.empresas?.razao_social ?? "—"}
        </Link>
      ),
    },
    ...(showTenantColumn
      ? [
          {
            id: "tenant",
            header: "Sindicato",
            cell: ({ row }: { row: { original: ContestacaoRow } }) =>
              row.original.tenants?.name ?? "—",
          } satisfies ColumnDef<ContestacaoRow>,
        ]
      : []),
    {
      accessorKey: "tipo",
      header: "Tipo",
      cell: ({ row }) => TIPO_LABEL[row.original.tipo] ?? row.original.tipo,
    },
    {
      id: "valorAlegado",
      header: "Valor alegado",
      cell: ({ row }) => formatCurrency(row.original.valor_alegado),
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
    {
      id: "abertaEm",
      header: "Aberta em",
      cell: ({ row }) => formatDate(row.original.aberta_em),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      emptyTitle="Nenhuma contestação registrada"
      emptyDescription="Contestações são abertas a partir da ficha de uma cobrança."
    />
  );
}
