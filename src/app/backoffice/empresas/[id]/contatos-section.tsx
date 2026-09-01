"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { KeyRound, Plus, User } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/design-system/empty-state";
import { StatusBadge } from "@/components/design-system/status-badge";
import {
  addEmpresaContatoAction,
  concederAcessoPortalAction,
  type AddContatoState,
} from "../actions";

interface Contato {
  id: string;
  nome: string;
  cargo: string | null;
  email: string | null;
  telefone: string | null;
  principal: boolean;
  portal_access_status: string;
}

const PORTAL_STATUS_LABEL: Record<string, string> = {
  none: "Sem acesso ao portal",
  invited: "Convite pendente",
  active: "Acesso ativo ao portal",
};

const PORTAL_STATUS_TONE: Record<string, "positive" | "neutral" | "warning"> = {
  none: "neutral",
  invited: "warning",
  active: "positive",
};

const initialState: AddContatoState = { error: null, success: false };

export function ContatosSection({
  empresaId,
  contatos,
  canManage,
}: {
  empresaId: string;
  contatos: Contato[];
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    addEmpresaContatoAction,
    initialState,
  );
  const [isGranting, startGrantTransition] = useTransition();

  useEffect(() => {
    if (state.success) {
      toast.success("Contato adicionado.");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
  }, [state.success]);

  function handleConcederAcesso(contatoId: string) {
    startGrantTransition(async () => {
      const result = await concederAcessoPortalAction(contatoId);
      if (!result.error) toast.success("Convite enviado.");
      else toast.error(result.error);
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">Contatos</CardTitle>
        {canManage ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4" />
                  Adicionar contato
                </Button>
              }
            />
            <DialogContent>
              <form action={formAction} className="flex flex-col gap-4">
                <input type="hidden" name="empresaId" value={empresaId} />
                <DialogHeader>
                  <DialogTitle>Adicionar contato</DialogTitle>
                  <DialogDescription>
                    Pessoa de referência na empresa para tratativas da GSBC.
                  </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input id="nome" name="nome" required />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="cargo">Cargo</Label>
                  <Input id="cargo" name="cargo" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" name="email" type="email" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input id="telefone" name="telefone" />
                </div>

                {state.error ? (
                  <p role="alert" className="text-sm text-destructive">
                    {state.error}
                  </p>
                ) : null}

                <DialogFooter>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Adicionando..." : "Adicionar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        ) : null}
      </CardHeader>
      <CardContent>
        {contatos.length === 0 ? (
          <EmptyState
            icon={User}
            title="Nenhum contato cadastrado"
            description="Adicione uma pessoa de referência nesta empresa."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {contatos.map((contato) => (
              <li
                key={contato.id}
                className="flex flex-col gap-2 border-b pb-3 text-sm last:border-b-0 last:pb-0 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="flex flex-col">
                  <span className="font-medium">
                    {contato.nome}
                    {contato.principal ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (principal)
                      </span>
                    ) : null}
                  </span>
                  <span className="text-muted-foreground">
                    {[contato.cargo, contato.email, contato.telefone]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                  <StatusBadge
                    label={PORTAL_STATUS_LABEL[contato.portal_access_status] ?? contato.portal_access_status}
                    tone={PORTAL_STATUS_TONE[contato.portal_access_status] ?? "neutral"}
                  />
                  {canManage && contato.portal_access_status === "none" && contato.email ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full lg:w-auto"
                      disabled={isGranting}
                      onClick={() => handleConcederAcesso(contato.id)}
                    >
                      <KeyRound className="h-4 w-4" />
                      Conceder acesso ao portal
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
