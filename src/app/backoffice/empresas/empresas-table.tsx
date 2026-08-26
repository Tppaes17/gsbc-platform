"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { DataTable } from "@/components/design-system/data-table";
import { StatusBadge } from "@/components/design-system/status-badge";
import type { Database } from "@/types/database.types";

type EmpresaRow = Database["public"]["Tables"]["empresas"]["Row"] & {
  tenants: { name: string } | null;
};

interface EmpresasTableProps {
  data: EmpresaRow[];
  showTenantColumn: boolean;
}

export function EmpresasTable({ data, showTenantColumn }: EmpresasTableProps) {
  const columns: ColumnDef<EmpresaRow>[] = [
    {
      accessorKey: "nome_fantasia",
      header: "Empresa",
      cell: ({ row }) => (
        <Link
          href={`/backoffice/empresas/${row.original.id}`}
          className="flex flex-col hover:underline"
        >
          <span className="font-medium">
            {row.original.nome_fantasia ?? row.original.razao_social}
          </span>
          <span className="text-xs text-muted-foreground">
            {row.original.razao_social}
          </span>
        </Link>
      ),
    },
    { accessorKey: "cnpj", header: "CNPJ" },
    {
      accessorKey: "segmento",
      header: "Segmento",
      cell: ({ row }) => row.original.segmento ?? "—",
    },
    ...(showTenantColumn
      ? [
          {
            id: "tenant",
            header: "Sindicato",
            cell: ({ row }: { row: { original: EmpresaRow } }) =>
              row.original.tenants?.name ?? "—",
          } satisfies ColumnDef<EmpresaRow>,
        ]
      : []),
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge
          label={row.original.status === "active" ? "Ativa" : "Inativa"}
          tone={row.original.status === "active" ? "positive" : "neutral"}
        />
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      emptyTitle="Nenhuma empresa cadastrada"
      emptyDescription="Empresas são cadastradas pela equipe GSBC conforme a operação avança."
    />
  );
}
