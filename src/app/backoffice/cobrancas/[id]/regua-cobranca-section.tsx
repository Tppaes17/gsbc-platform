"use client";

import { useTransition } from "react";
import { PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/design-system/confirmation-dialog";
import { EmptyState } from "@/components/design-system/empty-state";
import { StatusBadge } from "@/components/design-system/status-badge";
import { Timeline, type TimelineItem } from "@/components/design-system/timeline";
import {
  cancelarReguaAction,
  iniciarReguaAction,
  pausarReguaAction,
  retomarReguaAction,
} from "./regua-actions";

const ENROLLMENT_STATUS_LABEL: Record<string, string> = {
  active: "Ativa",
  paused: "Pausada",
  completed: "Concluída",
  cancelled: "Cancelada",
  escalated: "Escalada",
};

const ENROLLMENT_STATUS_TONE: Record<
  string,
  "positive" | "neutral" | "warning" | "negative" | "info"
> = {
  active: "info",
  paused: "warning",
  completed: "positive",
  cancelled: "neutral",
  escalated: "negative",
};

const EXECUTION_STATUS_LABEL: Record<string, string> = {
  scheduled: "Agendada",
  processing: "Processando",
  sent: "Enviada",
  completed: "Concluída",
  failed: "Falhou",
  skipped: "Pulada",
  cancelled: "Cancelada",
};

interface StepItem {
  ordem: number;
  dias_apos_inscricao: number;
  canal: string;
  descricao: string;
}

interface ExecutionItem {
  id: string;
  status: string;
  scheduled_for: string;
  executed_at: string | null;
  last_error: string | null;
  step: StepItem | null;
}

interface EnrollmentData {
  id: string;
  status: string;
  current_step_ordem: number;
  enrolled_at: string;
  paused_reason: string | null;
}

export function ReguaCobrancaSection({
  cobrancaId,
  enrollment,
  steps,
  execucoes,
}: {
  cobrancaId: string;
  enrollment: EnrollmentData | null;
  steps: StepItem[];
  execucoes: ExecutionItem[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleIniciar() {
    startTransition(async () => {
      const result = await iniciarReguaAction(cobrancaId);
      if (!result.error) {
        toast.success("Régua de cobrança iniciada.");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handlePausar() {
    if (!enrollment) return;
    startTransition(async () => {
      const result = await pausarReguaAction(enrollment.id, cobrancaId);
      if (!result.error) toast.success("Régua pausada.");
      else toast.error(result.error);
    });
  }

  function handleRetomar() {
    if (!enrollment) return;
    startTransition(async () => {
      const result = await retomarReguaAction(enrollment.id, cobrancaId);
      if (!result.error) toast.success("Régua retomada.");
      else toast.error(result.error);
    });
  }

  function handleCancelar() {
    if (!enrollment) return;
    startTransition(async () => {
      const result = await cancelarReguaAction(enrollment.id, cobrancaId);
      if (!result.error) toast.success("Régua cancelada.");
      else toast.error(result.error);
    });
  }

  const timelineItems: TimelineItem[] = execucoes.map((e) => ({
    id: e.id,
    label: `${e.step?.descricao ?? "Etapa"} — ${EXECUTION_STATUS_LABEL[e.status] ?? e.status}`,
    description: e.last_error ?? `Canal: ${e.step?.canal ?? "—"}`,
    timestamp: e.executed_at ?? e.scheduled_for,
  }));

  const podeIniciarNova =
    !enrollment || ["completed", "cancelled", "escalated"].includes(enrollment.status);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-sm font-medium">
          Régua de cobrança
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            Sequência assistida
          </span>
        </CardTitle>
        {podeIniciarNova ? (
          <Button variant="outline" size="sm" onClick={handleIniciar} disabled={isPending}>
            <PlayCircle className="h-4 w-4" />
            {isPending ? "Iniciando..." : "Iniciar régua de cobrança"}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!enrollment ? (
          <EmptyState
            icon={PlayCircle}
            title="Nenhuma régua iniciada"
            description="Inicia uma sequência automática de e-mail inicial, follow-up e tarefas de contato até a cobrança ser resolvida ou escalada — para de agir sozinha assim que houver pagamento, negociação em andamento, suspensão ou cancelamento."
            density="compact"
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Status:</span>
                <StatusBadge
                  label={ENROLLMENT_STATUS_LABEL[enrollment.status] ?? enrollment.status}
                  tone={ENROLLMENT_STATUS_TONE[enrollment.status] ?? "neutral"}
                />
              </div>
              <span className="text-muted-foreground">
                Etapa atual: {enrollment.current_step_ordem} de {steps.length}
              </span>
              {enrollment.paused_reason ? (
                <span className="text-muted-foreground">{enrollment.paused_reason}</span>
              ) : null}
            </div>

            <div className="flex gap-2">
              {enrollment.status === "active" ? (
                <ConfirmationDialog
                  trigger={
                    <Button variant="outline" size="sm" disabled={isPending}>
                      Pausar
                    </Button>
                  }
                  title="Pausar régua de cobrança?"
                  description="Nenhum step novo será executado até a régua ser retomada manualmente."
                  confirmLabel="Pausar"
                  onConfirm={handlePausar}
                />
              ) : null}
              {enrollment.status === "paused" ? (
                <Button variant="outline" size="sm" onClick={handleRetomar} disabled={isPending}>
                  Retomar
                </Button>
              ) : null}
              {enrollment.status === "active" || enrollment.status === "paused" ? (
                <ConfirmationDialog
                  trigger={
                    <Button variant="ghost" size="sm" disabled={isPending}>
                      Cancelar régua
                    </Button>
                  }
                  title="Cancelar régua de cobrança?"
                  description="A régua é encerrada permanentemente. Pode ser iniciada de novo depois, se necessário."
                  confirmLabel="Cancelar régua"
                  destructive
                  onConfirm={handleCancelar}
                />
              ) : null}
            </div>

            {timelineItems.length > 0 ? (
              <div>
                <h3 className="mb-2 text-xs font-medium text-muted-foreground">
                  Execuções da régua
                </h3>
                <Timeline items={timelineItems} />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Nenhuma etapa executada ainda. A próxima ação aparece quando a régua avançar.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
