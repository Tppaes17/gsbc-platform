"use client";

import { useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/design-system/status-badge";
import { adiarWorkItemAction, atribuirWorkItemAction, concluirWorkItemAction } from "./actions";

const TIPO_LABEL: Record<string, string> = {
  tarefa_regua_cobranca: "Tarefa da régua",
  falha_automacao: "Falha de automação",
  escalonamento: "Escalonamento",
  pagamento_vencido: "Pagamento vencido",
  negociacao_parada: "Negociação parada",
};

const PRIORIDADE_TONE: Record<string, "positive" | "neutral" | "warning" | "negative" | "info"> = {
  low: "neutral",
  medium: "info",
  high: "negative",
};

const PRIORIDADE_LABEL: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

export interface WorkItemData {
  id: string;
  tipo: string;
  entity_type: string;
  entity_id: string;
  titulo: string;
  descricao: string | null;
  prioridade: string;
  due_at: string | null;
  status: string;
  assigned_to: string | null;
  motivo: string | null;
}

function linkParaEntidade(entityType: string, entityId: string): string | null {
  if (entityType === "cobranca") return `/backoffice/cobrancas/${entityId}`;
  if (entityType === "negociacao") return `/backoffice/negociacoes/${entityId}`;
  return null;
}

export function WorkItemRow({
  item,
  responsaveis,
}: {
  item: WorkItemData;
  responsaveis: { id: string; nome: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const link = linkParaEntidade(item.entity_type, item.entity_id);
  const vencido = item.due_at
    ? new Date(item.due_at).getTime() < new Date().getTime()
    : false;

  function handleConcluir() {
    startTransition(async () => {
      const result = await concluirWorkItemAction(item.id);
      if (!result.error) toast.success("Item concluído.");
      else toast.error(result.error);
    });
  }

  function handleAdiar() {
    startTransition(async () => {
      const result = await adiarWorkItemAction(item.id);
      if (!result.error) toast.success("Item adiado por 3 dias.");
      else toast.error(result.error);
    });
  }

  function handleAtribuir(value: string | null) {
    startTransition(async () => {
      const result = await atribuirWorkItemAction(item.id, value === "none" ? null : value);
      if (!result.error) toast.success("Responsável atualizado.");
      else toast.error(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-3 border-b py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            label={TIPO_LABEL[item.tipo] ?? item.tipo}
            tone="neutral"
          />
          <StatusBadge
            label={PRIORIDADE_LABEL[item.prioridade] ?? item.prioridade}
            tone={PRIORIDADE_TONE[item.prioridade] ?? "neutral"}
          />
          {item.status === "adiado" ? <StatusBadge label="Adiado" tone="warning" /> : null}
        </div>
        {link ? (
          <Link href={link} className="text-sm font-medium hover:underline">
            {item.titulo}
          </Link>
        ) : (
          <span className="text-sm font-medium">{item.titulo}</span>
        )}
        {item.descricao ? (
          <span className="text-xs text-muted-foreground">{item.descricao}</span>
        ) : null}
        {item.due_at ? (
          <span
            className={`flex items-center gap-1 text-xs ${vencido ? "text-destructive" : "text-muted-foreground"}`}
          >
            <Clock className="h-3 w-3" />
            {vencido ? "Vencido em " : "Prazo: "}
            {new Date(item.due_at).toLocaleDateString("pt-BR")}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={item.assigned_to ?? "none"}
          onValueChange={handleAtribuir}
        >
          <SelectTrigger className="w-40" size="sm">
            <SelectValue placeholder="Atribuir">
              {(value: string | null) =>
                value && value !== "none"
                  ? (responsaveis.find((r) => r.id === value)?.nome ?? "—")
                  : "Sem responsável"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem responsável</SelectItem>
            {responsaveis.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={handleAdiar} disabled={isPending}>
          Adiar
        </Button>
        <Button variant="outline" size="sm" onClick={handleConcluir} disabled={isPending}>
          <CheckCircle2 className="h-4 w-4" />
          Concluir
        </Button>
      </div>
    </div>
  );
}
