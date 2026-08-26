"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { DataTable } from "@/components/design-system/data-table";
import type { Database } from "@/types/database.types";

type AuditLogRow = Database["public"]["Tables"]["audit_logs"]["Row"];

const columns: ColumnDef<AuditLogRow>[] = [
  {
    accessorKey: "created_at",
    header: "Quando",
    cell: ({ row }) =>
      format(new Date(row.original.created_at), "dd/MM/yyyy HH:mm"),
  },
  { accessorKey: "action", header: "Ação" },
  {
    accessorKey: "entity_type",
    header: "Entidade",
    cell: ({ row }) =>
      `${row.original.entity_type}${row.original.entity_id ? ` #${row.original.entity_id.slice(0, 8)}` : ""}`,
  },
];

export function AuditoriaTable({ data }: { data: AuditLogRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      emptyTitle="Nenhum evento de auditoria ainda"
      emptyDescription="Eventos aparecem aqui conforme ações operacionais são registradas nas próximas rodadas."
    />
  );
}
