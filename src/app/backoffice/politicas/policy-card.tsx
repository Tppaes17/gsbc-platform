"use client";

import { useActionState, useEffect, useState } from "react";
import { Power, PowerOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { StatusBadge } from "@/components/design-system/status-badge";
import { alternarPolicyAction, type AlternarPolicyState } from "./actions";

const CATEGORIA_LABEL: Record<string, string> = {
  negociacao: "Negociação",
  cobranca: "Cobrança",
  automacao: "Automação",
};

const initialState: AlternarPolicyState = { error: null, success: false };

function ToggleDialog({
  policyId,
  ativa,
}: {
  policyId: string;
  ativa: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(alternarPolicyAction, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success(ativa ? "Política desativada." : "Política ativada.");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
  }, [state.success, ativa]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            {ativa ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
            {ativa ? "Desativar" : "Ativar"}
          </Button>
        }
      />
      <DialogContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="policyId" value={policyId} />
          <input type="hidden" name="ativa" value={String(!ativa)} />
          <DialogHeader>
            <DialogTitle>{ativa ? "Desativar política" : "Ativar política"}</DialogTitle>
            <DialogDescription>
              Fica registrado em policy_decisoes com sua justificativa — decisão de governança,
              exclusiva do Owner (regra 8: IA não tem autoridade sobre isso).
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`motivo-${policyId}`}>Justificativa *</Label>
            <Textarea id={`motivo-${policyId}`} name="motivo" rows={3} required />
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

export function PolicyCard({
  id,
  nome,
  descricao,
  categoria,
  enforcement,
  versao,
  ativa,
  parametros,
  canToggle,
}: {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  enforcement: string;
  versao: number;
  ativa: boolean;
  parametros: Record<string, unknown>;
  canToggle: boolean;
}) {
  const temParametros = Object.keys(parametros).length > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-sm font-medium">{nome}</CardTitle>
          <span className="text-xs text-muted-foreground">
            {CATEGORIA_LABEL[categoria] ?? categoria} · v{versao}
          </span>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <StatusBadge label={ativa ? "Ativa" : "Inativa"} tone={ativa ? "positive" : "neutral"} />
            <StatusBadge
              label={enforcement === "aplicada" ? "Aplicada" : "Registrada"}
              tone={enforcement === "aplicada" ? "info" : "neutral"}
            />
          </div>
          {canToggle ? <ToggleDialog policyId={id} ativa={ativa} /> : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">{descricao}</p>
        {temParametros ? (
          <p className="text-xs text-muted-foreground">
            Parâmetros: {Object.entries(parametros).map(([k, v]) => `${k}=${v}`).join(", ")}
          </p>
        ) : null}
        {enforcement === "registrada" ? (
          <p className="text-xs text-muted-foreground">
            Comportamento já implementado em código desde antes desta rodada — o toggle acima é só
            documentação por enquanto, desativar não muda o comportamento de verdade.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
