"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
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
  createCobrancaAction,
  type CobrancaActionState,
} from "../actions";
import { cobrancaPrioridadeOptions } from "@/lib/validation/cobranca";

const initialState: CobrancaActionState = { error: null };

interface ResponsavelOption {
  id: string;
  nome: string;
}

export function CobrancaForm({
  obrigacaoId,
  valorSugerido,
  vencimentoSugerido,
  responsaveis,
}: {
  obrigacaoId: string;
  valorSugerido: string;
  vencimentoSugerido: string;
  responsaveis: ResponsavelOption[];
}) {
  const [state, formAction, isPending] = useActionState(
    createCobrancaAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <input type="hidden" name="obrigacaoId" value={obrigacaoId} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="valorPrincipal">Valor principal *</Label>
        <Input
          id="valorPrincipal"
          name="valorPrincipal"
          inputMode="decimal"
          defaultValue={valorSugerido}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="vencimento">Vencimento</Label>
        <Input
          id="vencimento"
          name="vencimento"
          type="date"
          defaultValue={vencimentoSugerido}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="prioridade">Prioridade *</Label>
        <Select name="prioridade" defaultValue="medium">
          <SelectTrigger id="prioridade" className="w-full">
            <SelectValue>
              {(value: string | null) =>
                cobrancaPrioridadeOptions.find((opt) => opt.value === value)
                  ?.label ?? value
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {cobrancaPrioridadeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="responsavelId">Responsável</Label>
        <Select name="responsavelId">
          <SelectTrigger id="responsavelId" className="w-full">
            <SelectValue placeholder="Sem responsável definido">
              {(value: string | null) =>
                responsaveis.find((r) => r.id === value)?.nome ??
                "Sem responsável definido"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {responsaveis.map((responsavel) => (
              <SelectItem key={responsavel.id} value={responsavel.id}>
                {responsavel.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Gerando..." : "Gerar cobrança"}
        </Button>
      </div>
    </form>
  );
}
