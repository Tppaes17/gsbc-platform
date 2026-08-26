"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/design-system/data-table";
import { StatusBadge } from "@/components/design-system/status-badge";

export interface MembershipRow {
  id: string;
  status: string;
  userName: string;
  userEmail: string;
  tenantName: string;
  roleName: string;
}

const columns: ColumnDef<MembershipRow>[] = [
  {
    accessorKey: "userName",
    header: "Usuário",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.userName}</span>
        <span className="text-xs text-muted-foreground">
          {row.original.userEmail}
        </span>
      </div>
    ),
  },
  { accessorKey: "tenantName", header: "Tenant" },
  { accessorKey: "roleName", header: "Papel" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const tone =
        row.original.status === "active"
          ? "positive"
          : row.original.status === "invited"
            ? "info"
            : "neutral";
      const label =
        row.original.status === "active"
          ? "Ativo"
          : row.original.status === "invited"
            ? "Convidado"
            : "Suspenso";
      return <StatusBadge label={label} tone={tone} />;
    },
  },
];

export function UsuariosTable({ data }: { data: MembershipRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      emptyTitle="Nenhum usuário encontrado"
      emptyDescription="Usuários são convidados pela equipe GSBC (regra 6: a GSBC executa, o sindicato acompanha)."
    />
  );
}
