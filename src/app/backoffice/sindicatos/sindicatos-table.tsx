"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { DataTable } from "@/components/design-system/data-table";
import { StatusBadge } from "@/components/design-system/status-badge";
import type { Database } from "@/types/database.types";

type SindicatoRow = Database["public"]["Tables"]["sindicatos"]["Row"] & {
  tenants: { onboarding_status: "onboarding" | "active" } | null;
};

const columns: ColumnDef<SindicatoRow>[] = [
  {
    accessorKey: "nome_fantasia",
    header: "Sindicato",
    cell: ({ row }) => (
      <Link
        href={`/backoffice/sindicatos/${row.original.tenant_id}`}
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
    accessorKey: "categoria",
    header: "Categoria",
    cell: ({ row }) => row.original.categoria ?? "—",
  },
  {
    accessorKey: "base_territorial",
    header: "Base territorial",
    cell: ({ row }) => row.original.base_territorial ?? "—",
  },
  {
    id: "onboarding_status",
    header: "Onboarding",
    cell: ({ row }) => {
      const onboardingStatus = row.original.tenants?.onboarding_status;
      return (
        <StatusBadge
          label={onboardingStatus === "active" ? "Implantado" : "Em onboarding"}
          tone={onboardingStatus === "active" ? "positive" : "warning"}
        />
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge
        label={row.original.status === "active" ? "Ativo" : "Inativo"}
        tone={row.original.status === "active" ? "positive" : "neutral"}
      />
    ),
  },
];

export function SindicatosTable({ data }: { data: SindicatoRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      emptyTitle="Nenhum sindicato cadastrado"
      emptyDescription="Sindicatos são provisionados pela equipe GSBC."
    />
  );
}
