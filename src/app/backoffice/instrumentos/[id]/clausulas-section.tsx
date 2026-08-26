"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus, ScrollText } from "lucide-react";
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
import { addClausulaAction, type SimpleActionState } from "../actions";

interface Clausula {
  id: string;
  numero: string | null;
  titulo: string;
  texto: string | null;
}

const initialState: SimpleActionState = { error: null, success: false };

export function ClausulasSection({
  instrumentoId,
  clausulas,
  canManage,
}: {
  instrumentoId: string;
  clausulas: Clausula[];
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    addClausulaAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      toast.success("Cláusula adicionada.");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
  }, [state.success]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">Cláusulas</CardTitle>
        {canManage ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4" />
                  Adicionar cláusula
                </Button>
              }
            />
            <DialogContent>
              <form action={formAction} className="flex flex-col gap-4">
                <input type="hidden" name="instrumentoId" value={instrumentoId} />
                <DialogHeader>
                  <DialogTitle>Adicionar cláusula</DialogTitle>
                  <DialogDescription>
                    Cláusulas viram a origem rastreável das obrigações.
                  </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="numero">Número</Label>
                  <Input id="numero" name="numero" placeholder="5ª" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="titulo">Título *</Label>
                  <Input id="titulo" name="titulo" required />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="texto">Texto</Label>
                  <textarea
                    id="texto"
                    name="texto"
                    rows={4}
                    className="rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
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
        {clausulas.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="Nenhuma cláusula cadastrada"
            description="Cláusulas dão rastreabilidade às obrigações originadas deste instrumento."
          />
        ) : (
          <ul className="flex flex-col gap-4">
            {clausulas.map((clausula) => (
              <li key={clausula.id} className="flex flex-col text-sm">
                <span className="font-medium">
                  {clausula.numero ? `Cláusula ${clausula.numero} — ` : ""}
                  {clausula.titulo}
                </span>
                {clausula.texto ? (
                  <span className="text-muted-foreground">{clausula.texto}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
