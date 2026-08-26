"use client";

import { useActionState, useState } from "react";
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
  type InstrumentoActionState,
  updateInstrumentoAction,
} from "../actions";
import { instrumentoTipoOptions } from "@/lib/validation/instrumento";
import type { Database } from "@/types/database.types";

type InstrumentoRow = Database["public"]["Tables"]["instrumentos"]["Row"];

const initialState: InstrumentoActionState = { error: null };

const STATUS_OPTIONS = [
  { value: "draft", label: "Rascunho" },
  { value: "active", label: "Vigente" },
  { value: "expired", label: "Expirado" },
  { value: "revoked", label: "Revogado" },
] as const;

interface EmpresaOption {
  id: string;
  nome: string;
}

export function EditInstrumentoForm({
  instrumento,
  empresas,
  readOnly,
}: {
  instrumento: InstrumentoRow;
  empresas: EmpresaOption[];
  readOnly: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    updateInstrumentoAction,
    initialState,
  );
  const [empresaId, setEmpresaId] = useState(instrumento.empresa_id ?? "");

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <input type="hidden" name="instrumentoId" value={instrumento.id} />
      <input type="hidden" name="empresaId" value={empresaId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="tipo">Tipo *</Label>
          <Select name="tipo" defaultValue={instrumento.tipo} disabled={readOnly}>
            <SelectTrigger id="tipo" className="w-full">
              <SelectValue>
                {(value: string | null) =>
                  instrumentoTipoOptions.find((opt) => opt.value === value)
                    ?.label ?? value
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {instrumentoTipoOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="status">Status *</Label>
          <Select
            name="status"
            defaultValue={instrumento.status}
            disabled={readOnly}
          >
            <SelectTrigger id="status" className="w-full">
              <SelectValue>
                {(value: string | null) =>
                  STATUS_OPTIONS.find((opt) => opt.value === value)?.label ??
                  value
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="empresaSelect">Empresa vinculada (só para ACT)</Label>
          <Select
            value={empresaId}
            onValueChange={(value) => setEmpresaId(value as string)}
            disabled={readOnly}
          >
            <SelectTrigger id="empresaSelect" className="w-full">
              <SelectValue placeholder="Nenhuma (CCT amplo)">
                {(value: string | null) =>
                  empresas.find((e) => e.id === value)?.nome ??
                  "Nenhuma (CCT amplo)"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {empresas.map((empresa) => (
                <SelectItem key={empresa.id} value={empresa.id}>
                  {empresa.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="numero">Número</Label>
          <Input
            id="numero"
            name="numero"
            defaultValue={instrumento.numero ?? ""}
            disabled={readOnly}
          />
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="titulo">Título *</Label>
          <Input
            id="titulo"
            name="titulo"
            defaultValue={instrumento.titulo}
            disabled={readOnly}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="dataBase">Data-base</Label>
          <Input
            id="dataBase"
            name="dataBase"
            type="date"
            defaultValue={instrumento.data_base ?? ""}
            disabled={readOnly}
          />
        </div>
        <div />
        <div className="flex flex-col gap-2">
          <Label htmlFor="vigenciaInicio">Vigência — início</Label>
          <Input
            id="vigenciaInicio"
            name="vigenciaInicio"
            type="date"
            defaultValue={instrumento.vigencia_inicio ?? ""}
            disabled={readOnly}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="vigenciaFim">Vigência — fim</Label>
          <Input
            id="vigenciaFim"
            name="vigenciaFim"
            type="date"
            defaultValue={instrumento.vigencia_fim ?? ""}
            disabled={readOnly}
          />
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="origem">Origem</Label>
          <Input
            id="origem"
            name="origem"
            defaultValue={instrumento.origem ?? ""}
            disabled={readOnly}
          />
        </div>
      </div>

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
          Dados do instrumento são gerenciados exclusivamente pela equipe GSBC.
        </p>
      )}
    </form>
  );
}
