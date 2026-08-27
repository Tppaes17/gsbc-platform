"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { DataTable } from "@/components/design-system/data-table";
import { StatusBadge } from "@/components/design-system/status-badge";
import type { Database } from "@/types/database.types";

type EscalonamentoRow = Database["public"]["Tables"]["escalonamentos"]["Row"] & {
  empresas: { razao_social: string; nome_fantasia: string | null } | null;
  tenants: { name: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  em_revisao: "Em revisão",
  aguardando_aprovacao: "Aguardando aprovação",
  rejeitada: "Rejeitada",
  aprovada: "Aprovada",
  documento_emitido: "Documento emitido",
  enviada: "Enviada",
  concluida: "Concluída",
};

const STATUS_TONE: Record<string, "positive" | "neutral" | "warning" | "negative" | "info"> = {
  em_revisao: "neutral",
  aguardando_aprovacao: "warning",
  rejeitada: "negative",
  aprovada: "info",
  documento_emitido: "info",
  enviada: "positive",
  concluida: "positive",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

interface EscalonamentosTableProps {
  data: EscalonamentoRow[];
  showTenantColumn: boolean;
}

export function EscalonamentosTable({ data, showTenantColumn }: EscalonamentosTableProps) {
  const columns: ColumnDef<EscalonamentoRow>[] = [
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
            cell: ({ row }: { row: { original: EscalonamentoRow } }) =>
              row.original.tenants?.name ?? "—",
          } satisfies ColumnDef<EscalonamentoRow>,
        ]
      : []),
    {
      id: "motivo",
      header: "Motivo",
      cell: ({ row }) => <span className="line-clamp-1">{row.original.motivo}</span>,
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
      id: "iniciadoEm",
      header: "Iniciado em",
      cell: ({ row }) => formatDate(row.original.iniciado_em),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      emptyTitle="Nenhum escalonamento registrado"
      emptyDescription="Escalonamentos são iniciados a partir da ficha de uma cobrança, quando a sequência automática de cobrança se esgota."
    />
  );
}
