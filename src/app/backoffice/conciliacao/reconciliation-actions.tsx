"use client";

import { useActionState, useEffect } from "react";
import {
  Banknote,
  CalendarClock,
  CheckCircle2,
  PlayCircle,
  RotateCcw,
  SearchCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ActionConsequencePanel } from "@/components/design-system/action-consequence-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  registerCompensationEventAction,
  retryManualReconciliationAction,
  transitionFinancialRepasseAction,
  updateDivergenceStatusAction,
  type ReconciliationActionState,
} from "./actions";

const initialState: ReconciliationActionState = { error: null, success: false };

function ActionError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="min-w-52 text-xs text-destructive">
      {error}
    </p>
  );
}

export function RetryReconciliationButton({
  reconciliationId,
}: {
  reconciliationId: string;
}) {
  const [state, formAction, isPending] = useActionState(
    retryManualReconciliationAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      toast.success("Conciliação reprocessada.");
    }
  }, [state.success]);

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <input type="hidden" name="reconciliationId" value={reconciliationId} />
      <ActionConsequencePanel
        title="Reprocessamento"
        items={[
          {
            label: "Efeito",
            value: "Reexecuta a conciliação manual",
            emphasis: true,
          },
          {
            label: "Idempotência",
            value: "Não deve duplicar pagamento, split ou baixa",
          },
          {
            label: "Falha",
            value: "Mantém revisão manual se o erro persistir",
          },
          {
            label: "Auditoria",
            value: "Tentativa de reprocessamento fica registrada",
          },
        ]}
      />
      <Button
        type="submit"
        size="sm"
        disabled={isPending}
        data-testid={`retry-reconciliation-${reconciliationId}`}
      >
        <PlayCircle className="h-4 w-4" />
        {isPending ? "Reprocessando..." : "Reprocessar"}
      </Button>
      <ActionError error={state.error} />
    </form>
  );
}

export function DivergenceStatusButtons({
  divergenceId,
  status,
}: {
  divergenceId: string;
  status: string;
}) {
  const [state, formAction, isPending] = useActionState(
    updateDivergenceStatusAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      toast.success("Divergência atualizada.");
    }
  }, [state.success]);

  if (status === "resolved" || status === "dismissed") {
    return null;
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <form action={formAction} className="flex flex-wrap gap-2">
        <input type="hidden" name="divergenceId" value={divergenceId} />
        <Button
          type="submit"
          size="sm"
          variant="outline"
          name="status"
          value="in_review"
          disabled={isPending || status === "in_review"}
          data-testid={`review-divergence-${divergenceId}`}
        >
          <SearchCheck className="h-4 w-4" />
          Em análise
        </Button>
        <Button
          type="submit"
          size="sm"
          variant="outline"
          name="status"
          value="dismissed"
          disabled={isPending}
          data-testid={`dismiss-divergence-${divergenceId}`}
        >
          <CheckCircle2 className="h-4 w-4" />
          Dispensar
        </Button>
      </form>
      <ActionError error={state.error} />
    </div>
  );
}

export function RepasseTransitionForm({
  repasseId,
  status,
}: {
  repasseId: string;
  status: string;
}) {
  const [state, formAction, isPending] = useActionState(
    transitionFinancialRepasseAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      toast.success("Repasse atualizado.");
    }
  }, [state.success]);

  if (status === "paid" || status === "cancelled") {
    return null;
  }

  return (
    <form
      action={formAction}
      className="mt-2 grid gap-2 rounded-lg border bg-muted/20 p-2"
    >
      <input type="hidden" name="repasseId" value={repasseId} />
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`scheduledFor-${repasseId}`} className="text-xs">
            Agendar
          </Label>
          <Input
            id={`scheduledFor-${repasseId}`}
            name="scheduledFor"
            type="date"
            className="h-7 text-xs"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label
            htmlFor={`externalTransferId-${repasseId}`}
            className="text-xs"
          >
            Ref. externa
          </Label>
          <Input
            id={`externalTransferId-${repasseId}`}
            name="externalTransferId"
            className="h-7 text-xs"
          />
        </div>
      </div>
      <Input
        name="reason"
        placeholder="Justificativa operacional"
        className="h-7 text-xs"
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          size="xs"
          variant="outline"
          name="status"
          value="scheduled"
          disabled={isPending}
          data-testid={`schedule-repasse-${repasseId}`}
        >
          <CalendarClock className="h-3 w-3" />
          Agendar
        </Button>
        <Button
          type="submit"
          size="xs"
          name="status"
          value="paid"
          disabled={isPending}
          data-testid={`pay-repasse-${repasseId}`}
        >
          <Banknote className="h-3 w-3" />
          Pago
        </Button>
        <Button
          type="submit"
          size="xs"
          variant="outline"
          name="status"
          value="failed"
          disabled={isPending}
        >
          <XCircle className="h-3 w-3" />
          Falhou
        </Button>
        <Button
          type="submit"
          size="xs"
          variant="outline"
          name="status"
          value="cancelled"
          disabled={isPending}
        >
          Cancelar
        </Button>
      </div>
      <ActionError error={state.error} />
    </form>
  );
}

export function CompensationEventForm({
  reconciliationId,
  grossAmount,
}: {
  reconciliationId: string;
  grossAmount: number;
}) {
  const [state, formAction, isPending] = useActionState(
    registerCompensationEventAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      toast.success("Evento compensatório registrado.");
    }
  }, [state.success]);

  return (
    <form
      action={formAction}
      className="mt-3 grid gap-2 rounded-lg border bg-muted/20 p-2"
      data-testid={`compensation-form-${reconciliationId}`}
    >
      <input type="hidden" name="reconciliationId" value={reconciliationId} />
      <ActionConsequencePanel
        title="Compensação financeira"
        items={[
          {
            label: "Efeito",
            value: "Cria evento financeiro posterior",
            emphasis: true,
          },
          {
            label: "Não altera",
            value: "Pagamento original, webhook ou split histórico",
          },
          {
            label: "Valor base",
            value: grossAmount.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            }),
          },
          {
            label: "Reversibilidade",
            value: "Nova correcao exige outro evento auditável",
          },
          {
            label: "Auditoria",
            value: "Tipo, valor, referencia e justificativa ficam registrados",
          },
        ]}
      />
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`eventType-${reconciliationId}`} className="text-xs">
            Evento
          </Label>
          <select
            id={`eventType-${reconciliationId}`}
            name="eventType"
            className="h-7 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            defaultValue="refund"
          >
            <option value="refund">Estorno</option>
            <option value="chargeback">Chargeback</option>
            <option value="credit">Crédito</option>
            <option value="reversal">Reversão</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`amount-${reconciliationId}`} className="text-xs">
            Valor
          </Label>
          <Input
            id={`amount-${reconciliationId}`}
            name="amount"
            defaultValue={String(grossAmount).replace(".", ",")}
            className="h-7 text-xs"
            inputMode="decimal"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label
            htmlFor={`providerReference-${reconciliationId}`}
            className="text-xs"
          >
            Referência externa
          </Label>
          <Input
            id={`providerReference-${reconciliationId}`}
            name="providerReference"
            className="h-7 text-xs"
          />
        </div>
      </div>
      <Textarea
        name="reason"
        rows={2}
        placeholder="Justificativa obrigatória"
        className="text-xs"
      />
      <Button
        type="submit"
        size="xs"
        variant="outline"
        disabled={isPending}
        data-testid={`compensate-reconciliation-${reconciliationId}`}
      >
        <RotateCcw className="h-3 w-3" />
        Registrar evento
      </Button>
      <ActionError error={state.error} />
    </form>
  );
}
