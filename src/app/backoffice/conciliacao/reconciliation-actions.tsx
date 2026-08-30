"use client";

import { useActionState, useEffect } from "react";
import { CheckCircle2, PlayCircle, SearchCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  retryManualReconciliationAction,
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

export function RetryReconciliationButton({ reconciliationId }: { reconciliationId: string }) {
  const [state, formAction, isPending] = useActionState(retryManualReconciliationAction, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success("Conciliação reprocessada.");
    }
  }, [state.success]);

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <input type="hidden" name="reconciliationId" value={reconciliationId} />
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
  const [state, formAction, isPending] = useActionState(updateDivergenceStatusAction, initialState);

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
