"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Upload as UploadIcon } from "lucide-react";
import { DataTable } from "@/components/design-system/data-table";
import { StatusBadge } from "@/components/design-system/status-badge";
import {
  dossieStatusOptions,
  scoreClassificacaoOptions,
} from "@/lib/validation/dossie-cadastral";
import type { Database } from "@/types/database.types";

type ProspectoRow = Pick<
  Database["public"]["Tables"]["dossies_cadastrais"]["Row"],
  | "id"
  | "cnpj_consultado"
  | "razao_social"
  | "origem"
  | "status"
  | "score_confiabilidade"
  | "score_classificacao"
  | "ultima_consulta_em"
  | "created_at"
>;

const STATUS_LABEL = Object.fromEntries(dossieStatusOptions.map((o) => [o.value, o.label]));
const SCORE_LABEL = Object.fromEntries(
  scoreClassificacaoOptions.map((o) => [o.value, o.label]),
);

const STATUS_TONE: Record<string, "positive" | "neutral" | "warning" | "negative" | "info"> = {
  novo: "neutral",
  pesquisa_iniciada: "info",
  cadastro_validado: "positive",
  conflito_identificado: "warning",
  revisao_cadastral: "negative",
};

const SCORE_TONE: Record<string, "positive" | "neutral" | "warning" | "negative" | "info"> = {
  excelente: "positive",
  alta: "positive",
  media: "warning",
  baixa: "negative",
  insuficiente: "negative",
};

function formatCnpj(cnpj: string | null) {
  if (!cnpj || cnpj.length !== 14) return cnpj ?? "—";
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

export function ProspectosTable({ data }: { data: ProspectoRow[] }) {
  const columns: ColumnDef<ProspectoRow>[] = [
    {
      accessorKey: "razao_social",
      header: "Empresa",
      cell: ({ row }) => (
        <Link
          href={`/backoffice/prospectos/${row.original.id}`}
          className="flex flex-col hover:underline"
        >
          <span className="font-medium">{row.original.razao_social ?? "—"}</span>
          <span className="text-xs text-muted-foreground">
            {formatCnpj(row.original.cnpj_consultado)}
          </span>
        </Link>
      ),
    },
    {
      accessorKey: "origem",
      header: "Origem",
      cell: ({ row }) =>
        row.original.origem === "importacao_planilha" ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <UploadIcon className="h-3 w-3" />
            Planilha
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Consulta oficial</span>
        ),
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
      accessorKey: "score_classificacao",
      header: "Score cadastral",
      cell: ({ row }) =>
        row.original.score_classificacao ? (
          <StatusBadge
            label={`${row.original.score_confiabilidade ?? 0}/100 — ${
              SCORE_LABEL[row.original.score_classificacao] ?? row.original.score_classificacao
            }`}
            tone={SCORE_TONE[row.original.score_classificacao] ?? "neutral"}
          />
        ) : (
          <span className="text-xs text-muted-foreground">Não consultado ainda</span>
        ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      emptyTitle="Nenhum prospecto ainda"
      emptyDescription="Importe uma planilha de pesquisa já realizada, ou promova uma consulta oficial de CNPJ diretamente a partir de um dossiê de empresa."
    />
  );
}
