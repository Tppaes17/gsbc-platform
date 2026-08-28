"use client";

import { useActionState } from "react";
import { FormSection } from "@/components/design-system/form-section";
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
  type CobrancaActionState,
  updateCobrancaAction,
} from "../actions";
import { cobrancaPrioridadeOptions } from "@/lib/validation/cobranca";
import type { Database } from "@/types/database.types";

type CobrancaRow = Database["public"]["Tables"]["cobrancas"]["Row"];

const initialState: CobrancaActionState = { error: null };

interface ResponsavelOption {
  id: string;
  nome: string;
}

export function EditCobrancaForm({
  cobranca,
  responsaveis,
  readOnly,
}: {
  cobranca: CobrancaRow;
  responsaveis: ResponsavelOption[];
  readOnly: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    updateCobrancaAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-6">
      <input type="hidden" name="cobrancaId" value={cobranca.id} />

      <FormSection title="Valores" description="Definidos na criação, ajustáveis pra refletir juros e multa até o vencimento.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label>Valor principal</Label>
            <p className="text-sm text-muted-foreground">
              {cobranca.valor_principal.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}{" "}
              (definido na criação)
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="valorAtualizacao">Atualização (juros/multa)</Label>
            <Input
              id="valorAtualizacao"
              name="valorAtualizacao"
              inputMode="decimal"
              defaultValue={String(cobranca.valor_atualizacao)}
              disabled={readOnly}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="vencimento">Vencimento</Label>
            <Input
              id="vencimento"
              name="vencimento"
              type="date"
              defaultValue={cobranca.vencimento ?? ""}
              disabled={readOnly}
            />
          </div>
        </div>
      </FormSection>

      <FormSection title="Gestão" description="Prioridade operacional e responsável pela condução desta cobrança.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="prioridade">Prioridade</Label>
            <Select
              name="prioridade"
              defaultValue={cobranca.prioridade}
              disabled={readOnly}
            >
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
            <Select
              name="responsavelId"
              defaultValue={cobranca.responsavel_id ?? undefined}
              disabled={readOnly}
            >
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
        </div>
      </FormSection>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      {!readOnly ? (
        <div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          A gestão da cobrança é exclusiva da equipe GSBC.
        </p>
      )}
    </form>
  );
}
