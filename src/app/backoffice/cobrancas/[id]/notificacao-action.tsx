"use client";

import { useActionState, useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { sendNotificacaoAction, type SendNotificacaoState } from "../actions";

const initialState: SendNotificacaoState = { error: null, success: false };

export function NotificacaoAction({
  cobrancaId,
  destinatarioEmail,
}: {
  cobrancaId: string;
  destinatarioEmail: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    sendNotificacaoAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      toast.success("Notificação enviada.");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
  }, [state.success]);

  if (!destinatarioEmail) {
    return (
      <Button variant="outline" disabled title="Cadastre um contato com e-mail nesta empresa">
        <Mail className="h-4 w-4" />
        Enviar notificação
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline">
            <Mail className="h-4 w-4" />
            Enviar notificação
          </Button>
        }
      />
      <DialogContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="cobrancaId" value={cobrancaId} />

          <DialogHeader>
            <DialogTitle>Enviar notificação por e-mail</DialogTitle>
            <DialogDescription>
              Será enviada para {destinatarioEmail}, o contato principal
              cadastrado nesta empresa.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="mensagem">Mensagem adicional (opcional)</Label>
            <Textarea id="mensagem" name="mensagem" rows={3} />
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
