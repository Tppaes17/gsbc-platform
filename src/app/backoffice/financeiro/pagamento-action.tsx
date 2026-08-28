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
import { formaPagamentoOptions, parseCurrency } from "@/lib/validation/pagamento";
import { registerPagamentoAction, type RegisterPagamentoState } from "./actions";

const initialState: RegisterPagamentoState = { error: null, success: false };

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function RegistrarPagamentoAction({
  cobrancaId,
  empresaNome,
  obrigacaoDescricao,
  saldoAtual,
}: {
  cobrancaId: string;
  empresaNome: string;
  obrigacaoDescricao: string;
  saldoAtual: number;
}) {
  const [open, setOpen] = useState(false);
  const [forma, setForma] = useState<string>("pix");
  const [valorDigitado, setValorDigitado] = useState("");
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
    if (next) {
      setForma("pix");
      setValorDigitado("");
    }
  }

  const valorInformado = parseCurrency(valorDigitado);
  const valorValido = !Number.isNaN(valorInformado) && valorInformado > 0;
  const saldoResultante = valorValido ? Math.max(saldoAtual - valorInformado, 0) : saldoAtual;

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

          <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3">
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Empresa</span>
              <span className="font-medium text-foreground">{empresaNome}</span>
            </div>
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span className="text-muted-foreground">Obrigação</span>
              <span className="font-medium text-foreground">{obrigacaoDescricao}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="valor">Valor pago *</Label>
            <Input
              id="valor"
              name="valor"
              inputMode="decimal"
              placeholder="0,00"
              value={valorDigitado}
              onChange={(e) => setValorDigitado(e.target.value)}
              required
            />
          </div>

          <dl className="flex flex-col">
            <div className="flex items-baseline justify-between gap-4 border-b border-border-subtle py-2">
              <dt className="text-sm text-muted-foreground">Saldo atual</dt>
              <dd className="text-sm font-medium tabular-nums text-foreground">
                {formatCurrency(saldoAtual)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-2">
              <dt className="text-sm font-medium text-foreground">Saldo após este pagamento</dt>
              <dd className="text-base font-semibold tabular-nums text-foreground">
                {formatCurrency(saldoResultante)}
              </dd>
            </div>
          </dl>

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
              {isPending ? "Salvando..." : "Confirmar pagamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
