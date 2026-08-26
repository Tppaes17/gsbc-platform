"use client";

import { useActionState, useEffect, useState } from "react";
import { PlusCircle } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  registerNegociacaoEventoAction,
  type RegisterEventoState,
} from "../actions";
import { negociacaoEventoTipoOptions } from "@/lib/validation/negociacao";

const initialState: RegisterEventoState = { error: null, success: false };
const VALOR_OBRIGATORIO = new Set(["proposta_gsbc", "contraproposta_empresa", "aceite"]);

export function EventoForm({ negociacaoId }: { negociacaoId: string }) {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<string>("proposta_gsbc");
  const [state, formAction, isPending] = useActionState(
    registerNegociacaoEventoAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      toast.success("Movimento registrado.");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
  }, [state.success]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setTipo("proposta_gsbc");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button>
            <PlusCircle className="h-4 w-4" />
            Registrar movimento
          </Button>
        }
      />
      <DialogContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="negociacaoId" value={negociacaoId} />
          <input type="hidden" name="tipo" value={tipo} />

          <DialogHeader>
            <DialogTitle>Registrar movimento</DialogTitle>
            <DialogDescription>
              Cada movimento fica registrado na timeline, de forma imutável.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="tipoSelect">Tipo *</Label>
            <Select value={tipo} onValueChange={(value) => setTipo(value as string)}>
              <SelectTrigger id="tipoSelect" className="w-full">
                <SelectValue>
                  {(value: string | null) =>
                    negociacaoEventoTipoOptions.find((opt) => opt.value === value)
                      ?.label ?? value
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {negociacaoEventoTipoOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="valor">
              Valor {VALOR_OBRIGATORIO.has(tipo) ? "*" : ""}
            </Label>
            <Input id="valor" name="valor" inputMode="decimal" placeholder="0,00" />
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
              {isPending ? "Salvando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
