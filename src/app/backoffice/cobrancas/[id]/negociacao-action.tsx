"use client";

import { useActionState, useState } from "react";
import { Handshake } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createNegociacaoAction,
  type NegociacaoActionState,
} from "../../negociacoes/actions";

const initialState: NegociacaoActionState = { error: null };

interface ResponsavelOption {
  id: string;
  nome: string;
}

export function IniciarNegociacaoAction({
  cobrancaId,
  responsaveis,
}: {
  cobrancaId: string;
  responsaveis: ResponsavelOption[];
}) {
  const [open, setOpen] = useState(false);
  const [responsavelId, setResponsavelId] = useState("");
  const [state, formAction, isPending] = useActionState(
    createNegociacaoAction,
    initialState,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline">
            <Handshake className="h-4 w-4" />
            Iniciar negociação
          </Button>
        }
      />
      <DialogContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="cobrancaId" value={cobrancaId} />
          <input type="hidden" name="responsavelId" value={responsavelId} />

          <DialogHeader>
            <DialogTitle>Iniciar negociação</DialogTitle>
            <DialogDescription>
              A cobrança passa para o status &ldquo;Em negociação&rdquo; e uma
              negociação é aberta para registrar propostas e contrapropostas.
            </DialogDescription>
          </DialogHeader>

          {responsaveis.length > 0 ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="responsavelSelect">Responsável</Label>
              <Select
                value={responsavelId}
                onValueChange={(value) => setResponsavelId(value as string)}
              >
                <SelectTrigger id="responsavelSelect" className="w-full">
                  <SelectValue placeholder="Sem responsável definido">
                    {(value: string | null) =>
                      responsaveis.find((r) => r.id === value)?.nome ??
                      "Sem responsável definido"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {responsaveis.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Iniciando..." : "Iniciar negociação"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
