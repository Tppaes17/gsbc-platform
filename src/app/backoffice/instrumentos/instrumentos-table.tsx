"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { DataTable } from "@/components/design-system/data-table";
import { StatusBadge } from "@/components/design-system/status-badge";
import type { Database } from "@/types/database.types";

type InstrumentoRow = Database["public"]["Tables"]["instrumentos"]["Row"] & {
  tenants: { name: string } | null;
};

const TIPO_LABEL: Record<string, string> = {
  cct: "CCT",
  act: "ACT",
  termo_aditivo: "Termo Aditivo",
  outro: "Outro",
};

const STATUS_CONFIG: Record<string, { label: string; tone: "positive" | "neutral" | "warning" | "negative" }> = {
  draft: { label: "Rascunho", tone: "neutral" },
  active: { label: "Vigente", tone: "positive" },
  expired: { label: "Expirado", tone: "warning" },
  revoked: { label: "Revogado", tone: "negative" },
};

interface InstrumentosTableProps {
  data: InstrumentoRow[];
  showTenantColumn: boolean;
}

export function InstrumentosTable({ data, showTenantColumn }: InstrumentosTableProps) {
  const columns: ColumnDef<InstrumentoRow>[] = [
    {
      accessorKey: "titulo",
      header: "Instrumento",
      cell: ({ row }) => (
        <Link
          href={`/backoffice/instrumentos/${row.original.id}`}
          className="flex flex-col hover:underline"
        >
          <span className="font-medium">{row.original.titulo}</span>
          <span className="text-xs text-muted-foreground">
            {row.original.numero ?? "sem número"}
          </span>
        </Link>
      ),
    },
    {
      accessorKey: "tipo",
      header: "Tipo",
      cell: ({ row }) => TIPO_LABEL[row.original.tipo] ?? row.original.tipo,
    },
    ...(showTenantColumn
      ? [
          {
            id: "tenant",
            header: "Sindicato",
            cell: ({ row }: { row: { original: InstrumentoRow } }) =>
              row.original.tenants?.name ?? "—",
          } satisfies ColumnDef<InstrumentoRow>,
        ]
      : []),
    {
      accessorKey: "vigencia_fim",
      header: "Vigência até",
      cell: ({ row }) =>
        row.original.vigencia_fim
          ? new Date(`${row.original.vigencia_fim}T00:00:00`).toLocaleDateString("pt-BR")
          : "—",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const config = STATUS_CONFIG[row.original.status] ?? {
          label: row.original.status,
          tone: "neutral" as const,
        };
        return <StatusBadge label={config.label} tone={config.tone} />;
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      emptyTitle="Nenhum instrumento cadastrado"
      emptyDescription="Instrumentos coletivos são cadastrados pela equipe GSBC."
    />
  );
}
