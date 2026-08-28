"use client";

import type { ReactElement, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CriticalActionField {
  label: string;
  value: ReactNode;
  emphasis?: boolean;
}

interface CriticalActionDialogProps {
  trigger: ReactElement;
  title: string;
  description?: string;
  context?: CriticalActionField[];
  impact?: CriticalActionField[];
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}

/**
 * Confirmação para ações financeiras/críticas com contexto explícito —
 * objeto da ação e situação antes/depois — no lugar de um "Confirmar?"
 * genérico (Stage 1 da revisão de design, exemplo da Seção 24 do master
 * prompt). `context` identifica o que está sendo alterado (empresa,
 * cobrança); `impact` mostra o efeito (saldo atual → valor da operação →
 * saldo resultante). Nunca recalcula — os valores vêm prontos de quem
 * chama.
 */
export function CriticalActionDialog({
  trigger,
  title,
  description,
  context,
  impact,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = false,
  onConfirm,
}: CriticalActionDialogProps) {
  return (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        {context && context.length > 0 ? (
          <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3">
            {context.map((field) => (
              <div key={field.label} className="flex items-baseline justify-between gap-4 text-sm">
                <span className="text-muted-foreground">{field.label}</span>
                <span className="font-medium text-foreground">{field.value}</span>
              </div>
            ))}
          </div>
        ) : null}

        {impact && impact.length > 0 ? (
          <dl className="flex flex-col">
            {impact.map((field, index) => (
              <div
                key={field.label}
                className={
                  "flex items-baseline justify-between gap-4 py-2" +
                  (index < impact.length - 1 ? " border-b border-border-subtle" : "")
                }
              >
                <dt
                  className={
                    field.emphasis
                      ? "text-sm font-medium text-foreground"
                      : "text-sm text-muted-foreground"
                  }
                >
                  {field.label}
                </dt>
                <dd
                  className={
                    field.emphasis
                      ? "text-base font-semibold tabular-nums text-foreground"
                      : "text-sm font-medium tabular-nums text-foreground"
                  }
                >
                  {field.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        <DialogFooter>
          <DialogClose render={<Button variant="outline">{cancelLabel}</Button>} />
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={() => onConfirm()}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
