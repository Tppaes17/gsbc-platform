"use client";

import { useActionState, useEffect, useState } from "react";
import { ArrowRightCircle } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  changeCobrancaStatusAction,
  type ChangeStatusState,
} from "../actions";
import { cobrancaStatusOptions } from "@/lib/validation/cobranca";
import { STATUS_LABEL } from "./labels";

const initialState: ChangeStatusState = { error: null, success: false };

export function StatusAction({
  cobrancaId,
  currentStatus,
}: {
  cobrancaId: string;
  currentStatus: string;
}) {
  const [open, setOpen] = useState(false);
  const [newStatus, setNewStatus] = useState(currentStatus);
  const [state, formAction, isPending] = useActionState(
    changeCobrancaStatusAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      toast.success("Status atualizado.");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
  }, [state.success]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setNewStatus(currentStatus);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline">
            <ArrowRightCircle className="h-4 w-4" />
            Mudar status
          </Button>
        }
      />
      <DialogContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="cobrancaId" value={cobrancaId} />
          <input type="hidden" name="newStatus" value={newStatus} />

          <DialogHeader>
            <DialogTitle>Mudar status da cobrança</DialogTitle>
            <DialogDescription>
              A mudança fica registrada na timeline com o motivo informado.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 p-3 text-sm">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Status atual</span>
              <span className="font-medium text-foreground">
                {STATUS_LABEL[currentStatus] ?? currentStatus}
              </span>
            </div>
            <ArrowRightCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex flex-col items-end">
              <span className="text-xs text-muted-foreground">Novo status</span>
              <span className="font-medium text-foreground">
                {STATUS_LABEL[newStatus] ?? newStatus}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="statusSelect">Novo status *</Label>
            <Select
              value={newStatus}
              onValueChange={(value) => setNewStatus(value as string)}
            >
              <SelectTrigger id="statusSelect" className="w-full">
                <SelectValue>
                  {(value: string | null) =>
                    cobrancaStatusOptions.find((opt) => opt.value === value)
                      ?.label ?? value
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {cobrancaStatusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="reason">Motivo *</Label>
            <Input
              id="reason"
              name="reason"
              placeholder="Ex.: Notificação extrajudicial enviada"
              required
            />
          </div>

          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Confirmar mudança"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
