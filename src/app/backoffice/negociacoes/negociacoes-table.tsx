"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { DataTable } from "@/components/design-system/data-table";
import { StatusBadge } from "@/components/design-system/status-badge";
import { negociacaoStatusOptions } from "@/lib/validation/negociacao";
import type { Database } from "@/types/database.types";

type NegociacaoRow = Database["public"]["Tables"]["negociacoes"]["Row"] & {
  empresas: { razao_social: string; nome_fantasia: string | null } | null;
  tenants: { name: string } | null;
  cobrancas: {
    valor_cobranca: number;
    obrigacoes: { descricao: string } | { descricao: string }[] | null;
  } | null;
};

const STATUS_LABEL = Object.fromEntries(
  negociacaoStatusOptions.map((o) => [o.value, o.label]),
);

const STATUS_TONE: Record<string, "positive" | "neutral" | "warning" | "negative" | "info"> = {
  aberta: "info",
  em_negociacao: "warning",
  aceita: "positive",
  recusada: "negative",
  encerrada: "neutral",
};

function formatCurrency(value: number | null) {
  if (value === null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface NegociacoesTableProps {
  data: NegociacaoRow[];
  showTenantColumn: boolean;
}

export function NegociacoesTable({ data, showTenantColumn }: NegociacoesTableProps) {
  const columns: ColumnDef<NegociacaoRow>[] = [
    {
      id: "empresa",
      header: "Empresa",
      cell: ({ row }) => {
        const obrigacao = Array.isArray(row.original.cobrancas?.obrigacoes)
          ? row.original.cobrancas?.obrigacoes[0]
          : row.original.cobrancas?.obrigacoes;
        return (
          <Link
            href={`/backoffice/negociacoes/${row.original.id}`}
            className="font-medium hover:underline"
          >
            {row.original.empresas?.nome_fantasia ??
              row.original.empresas?.razao_social ??
              "—"}
            {obrigacao ? (
              <span className="block text-xs font-normal text-muted-foreground">
                {obrigacao.descricao}
              </span>
            ) : null}
          </Link>
        );
      },
    },
    ...(showTenantColumn
      ? [
          {
            id: "tenant",
            header: "Sindicato",
            cell: ({ row }: { row: { original: NegociacaoRow } }) =>
              row.original.tenants?.name ?? "—",
          } satisfies ColumnDef<NegociacaoRow>,
        ]
      : []),
    {
      id: "valorCobranca",
      header: "Valor da cobrança",
      cell: ({ row }) => formatCurrency(row.original.cobrancas?.valor_cobranca ?? null),
    },
    {
      accessorKey: "valor_atual",
      header: "Valor negociado",
      cell: ({ row }) => formatCurrency(row.original.valor_atual),
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
      emptyTitle="Nenhuma negociação iniciada"
      emptyDescription="Negociações são iniciadas a partir de uma cobrança."
    />
  );
}
