"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { CheckCircle2, Handshake, MessageSquareReply } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/design-system/confirmation-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/design-system/empty-state";
import { StatusBadge } from "@/components/design-system/status-badge";
import { Timeline, type TimelineItem } from "@/components/design-system/timeline";
import { responderPropostaPortalAction, type PortalActionState } from "./actions";

const STATUS_LABEL: Record<string, string> = {
  aberta: "Aberta",
  em_negociacao: "Em negociação",
  aceita: "Acordo aceito",
  recusada: "Recusada",
  encerrada: "Encerrada",
};

const STATUS_TONE: Record<string, "positive" | "neutral" | "warning" | "negative" | "info"> = {
  aberta: "info",
  em_negociacao: "warning",
  aceita: "positive",
  recusada: "negative",
  encerrada: "neutral",
};

const STATUS_ABERTOS = new Set(["aberta", "em_negociacao"]);

const initialState: PortalActionState = { error: null, success: false };

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ResponderPropostaDialog({ negociacaoId }: { negociacaoId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    responderPropostaPortalAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      toast.success("Sua contraproposta foi enviada.");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <MessageSquareReply className="h-4 w-4" />
            Enviar contraproposta
          </Button>
        }
      />
      <DialogContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="negociacaoId" value={negociacaoId} />
          <input type="hidden" name="tipo" value="contraproposta_empresa" />
          <DialogHeader>
            <DialogTitle>Enviar contraproposta</DialogTitle>
            <DialogDescription>
              A equipe do Sindicato vai analisar e responder.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="valor">Valor proposto *</Label>
            <Input id="valor" name="valor" inputMode="decimal" placeholder="0,00" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="condicoes">Condições / observações</Label>
            <Textarea id="condicoes" name="condicoes" rows={3} />
          </div>
          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Enviando..." : "Enviar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AceitarPropostaButton({ negociacaoId }: { negociacaoId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleAceitar() {
    const formData = new FormData();
    formData.set("negociacaoId", negociacaoId);
    formData.set("tipo", "aceite");
    startTransition(async () => {
      const result = await responderPropostaPortalAction(initialState, formData);
      if (!result.error) toast.success("Aceite registrado — a equipe do Sindicato vai confirmar o acordo.");
      else toast.error(result.error);
    });
  }

  return (
    <ConfirmationDialog
      trigger={
        <Button size="sm" disabled={isPending}>
          <CheckCircle2 className="h-4 w-4" />
          Aceitar proposta
        </Button>
      }
      title="Aceitar a proposta atual?"
      description="Seu aceite fica registrado no histórico da negociação. A equipe do Sindicato confirma o acordo em seguida."
      confirmLabel="Aceitar"
      onConfirm={handleAceitar}
    />
  );
}

export function NegociacaoPortalSection({
  negociacao,
  eventos,
}: {
  negociacao: { id: string; status: string; valor_atual: number | null } | null;
  eventos: TimelineItem[];
}) {
  const emAberto = negociacao && STATUS_ABERTOS.has(negociacao.status);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Negociação</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!negociacao ? (
          <EmptyState
            icon={Handshake}
            title="Nenhuma negociação em andamento"
            description="Quando o Sindicato iniciar uma negociação para esta cobrança, ela aparece aqui."
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Status:</span>
                <StatusBadge
                  label={STATUS_LABEL[negociacao.status] ?? negociacao.status}
                  tone={STATUS_TONE[negociacao.status] ?? "neutral"}
                />
              </div>
              {negociacao.valor_atual !== null ? (
                <span className="text-muted-foreground">
                  Valor atual da proposta: {formatCurrency(negociacao.valor_atual)}
                </span>
              ) : null}
            </div>

            {emAberto ? (
              <div className="flex flex-wrap gap-2">
                <ResponderPropostaDialog negociacaoId={negociacao.id} />
                <AceitarPropostaButton negociacaoId={negociacao.id} />
              </div>
            ) : null}

            <Timeline items={eventos} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
