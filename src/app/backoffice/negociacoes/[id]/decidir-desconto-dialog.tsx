"use client";

import { useActionState, useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ActionConsequencePanel } from "@/components/design-system/action-consequence-panel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  decidirDescontoNegociacaoAction,
  type DecidirDescontoState,
} from "../actions";

const initialState: DecidirDescontoState = { error: null, success: false };

export function DecidirDescontoDialog({
  negociacaoId,
  aprovado,
}: {
  negociacaoId: string;
  aprovado: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    decidirDescontoNegociacaoAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      toast.success(aprovado ? "Desconto aprovado." : "Desconto rejeitado.");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
  }, [state.success, aprovado]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant={aprovado ? "default" : "outline"}>
            {aprovado ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {aprovado ? "Aprovar desconto" : "Rejeitar desconto"}
          </Button>
        }
      />
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="negociacaoId" value={negociacaoId} />
          <input type="hidden" name="aprovado" value={String(aprovado)} />
          <DialogHeader>
            <DialogTitle>
              {aprovado ? "Aprovar desconto" : "Rejeitar desconto"}
            </DialogTitle>
            <DialogDescription>
              {aprovado
                ? "A negociação vira acordo firmado e a cobrança passa pra 'Acordo firmado'."
                : "A negociação volta para 'Em negociação' — a equipe pode renegociar o valor."}{" "}
              Política de aprovação: esta decisão fica registrada com
              justificativa, nunca é automática (regra 8 — IA não tem
              autoridade).
            </DialogDescription>
          </DialogHeader>
          <ActionConsequencePanel
            items={[
              {
                label: "Decisão humana",
                value: aprovado
                  ? "Aprova valor negociado"
                  : "Mantém negociacao aberta",
                emphasis: true,
              },
              {
                label: "Efeito na cobranca",
                value: aprovado
                  ? "Status muda para acordo firmado"
                  : "Status volta para em negociacao",
              },
              {
                label: "Acordo não e",
                value: "Pagamento, baixa, repasse ou quitação",
              },
              {
                label: "Reversibilidade",
                value: "Mudanca posterior exige novo evento justificado",
              },
              {
                label: "Auditoria",
                value: "Decisão, justificativa e usuário ficam registrados",
              },
            ]}
          />
          <div className="flex flex-col gap-2">
            <Label htmlFor="motivo">Justificativa *</Label>
            <Textarea id="motivo" name="motivo" rows={3} required />
          </div>
          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
