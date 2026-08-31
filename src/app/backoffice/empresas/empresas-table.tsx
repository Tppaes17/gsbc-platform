"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { DataTable } from "@/components/design-system/data-table";
import { MobileRowCard } from "@/components/design-system/mobile-row-card";
import { StatusBadge } from "@/components/design-system/status-badge";
import { buttonVariants } from "@/components/ui/button";
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
      id: "empresa",
      accessorFn: (row) => `${row.nome_fantasia ?? ""} ${row.razao_social}`,
      header: "Empresa",
      meta: { isPrimary: true },
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
            meta: { cellClassName: "max-w-64 truncate" },
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
      density="compact"
      tableLabel="Empresas"
      emptyTitle="Nenhuma empresa cadastrada"
      emptyDescription="Empresas são cadastradas pela equipe GSBC conforme a operação avança."
      enableSearch
      searchPlaceholder="Buscar por razão social, nome fantasia ou CNPJ..."
      renderMobileCard={(row) => (
        <MobileRowCard
          title={row.nome_fantasia ?? row.razao_social}
          subtitle={row.razao_social}
          status={
            <StatusBadge
              label={row.status === "active" ? "Ativa" : "Inativa"}
              tone={row.status === "active" ? "positive" : "neutral"}
            />
          }
          metadata={[
            { label: "CNPJ", value: row.cnpj, priority: "primary" },
            { label: "Segmento", value: row.segmento ?? "—", priority: "secondary" },
            ...(showTenantColumn
              ? [{ label: "Sindicato", value: row.tenants?.name ?? "—", priority: "detail" as const }]
              : []),
          ]}
          action={
            <Link
              href={`/backoffice/empresas/${row.id}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Abrir empresa
            </Link>
          }
        />
      )}
    />
  );
}
