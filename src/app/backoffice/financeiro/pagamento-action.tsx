"use client";

import { useActionState, useEffect, useState } from "react";
import { CircleDollarSign } from "lucide-react";
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
import { formaPagamentoOptions } from "@/lib/validation/pagamento";
import { registerPagamentoAction, type RegisterPagamentoState } from "./actions";

const initialState: RegisterPagamentoState = { error: null, success: false };

export function RegistrarPagamentoAction({ cobrancaId }: { cobrancaId: string }) {
  const [open, setOpen] = useState(false);
  const [forma, setForma] = useState<string>("pix");
  const [state, formAction, isPending] = useActionState(
    registerPagamentoAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      toast.success("Pagamento registrado.");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
  }, [state.success]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setForma("pix");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline">
            <CircleDollarSign className="h-4 w-4" />
            Registrar pagamento
          </Button>
        }
      />
      <DialogContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="cobrancaId" value={cobrancaId} />
          <input type="hidden" name="formaPagamento" value={forma} />

          <DialogHeader>
            <DialogTitle>Registrar pagamento</DialogTitle>
            <DialogDescription>
              Cada pagamento fica registrado de forma imutável. A cobrança
              muda para &ldquo;Parcialmente paga&rdquo; ou &ldquo;Paga&rdquo;
              automaticamente conforme o valor acumulado.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="valor">Valor pago *</Label>
            <Input id="valor" name="valor" inputMode="decimal" placeholder="0,00" required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="dataPagamento">Data do pagamento *</Label>
            <Input id="dataPagamento" name="dataPagamento" type="date" required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="formaSelect">Forma de pagamento *</Label>
            <Select value={forma} onValueChange={(value) => setForma(value as string)}>
              <SelectTrigger id="formaSelect" className="w-full">
                <SelectValue>
                  {(value: string | null) =>
                    formaPagamentoOptions.find((opt) => opt.value === value)?.label ??
                    value
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {formaPagamentoOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="observacao">Observação</Label>
            <Input id="observacao" name="observacao" placeholder="Ex.: Comprovante enviado por e-mail" />
          </div>

          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Registrar pagamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
