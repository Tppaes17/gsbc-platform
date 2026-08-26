"use client";

import { useActionState, useMemo, useState } from "react";
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
  createInstrumentoAction,
  type InstrumentoActionState,
} from "../actions";
import { instrumentoTipoOptions } from "@/lib/validation/instrumento";

const initialState: InstrumentoActionState = { error: null };

interface TenantOption {
  id: string;
  name: string;
}

interface EmpresaOption {
  id: string;
  nome: string;
  tenantId: string;
}

export function InstrumentoForm({
  tenants,
  empresas,
}: {
  tenants: TenantOption[];
  empresas: EmpresaOption[];
}) {
  const [state, formAction, isPending] = useActionState(
    createInstrumentoAction,
    initialState,
  );
  const [tenantId, setTenantId] = useState(tenants[0]?.id ?? "");
  const [empresaId, setEmpresaId] = useState("");

  const empresasDoTenant = useMemo(
    () => empresas.filter((e) => e.tenantId === tenantId),
    [empresas, tenantId],
  );

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <input type="hidden" name="tenantId" value={tenantId} />
      <input type="hidden" name="empresaId" value={empresaId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="tenantSelect">Sindicato *</Label>
          <Select
            value={tenantId}
            onValueChange={(value) => {
              setTenantId(value as string);
              setEmpresaId("");
            }}
          >
            <SelectTrigger id="tenantSelect" className="w-full">
              <SelectValue placeholder="Selecione um sindicato">
                {(value: string | null) =>
                  tenants.find((t) => t.id === value)?.name ??
                  "Selecione um sindicato"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {tenants.map((tenant) => (
                <SelectItem key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="empresaSelect">
            Empresa vinculada (só para ACT)
          </Label>
          <Select
            value={empresaId}
            onValueChange={(value) => setEmpresaId(value as string)}
          >
            <SelectTrigger id="empresaSelect" className="w-full">
              <SelectValue placeholder="Nenhuma (CCT amplo)">
                {(value: string | null) =>
                  empresasDoTenant.find((e) => e.id === value)?.nome ??
                  "Nenhuma (CCT amplo)"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {empresasDoTenant.map((empresa) => (
                <SelectItem key={empresa.id} value={empresa.id}>
                  {empresa.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="tipo">Tipo *</Label>
          <Select name="tipo" defaultValue="cct">
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
          <Label htmlFor="numero">Número</Label>
          <Input id="numero" name="numero" placeholder="CCT-2026/001" />
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="titulo">Título *</Label>
          <Input id="titulo" name="titulo" required />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="dataBase">Data-base</Label>
          <Input id="dataBase" name="dataBase" type="date" />
        </div>
        <div />
        <div className="flex flex-col gap-2">
          <Label htmlFor="vigenciaInicio">Vigência — início</Label>
          <Input id="vigenciaInicio" name="vigenciaInicio" type="date" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="vigenciaFim">Vigência — fim</Label>
          <Input id="vigenciaFim" name="vigenciaFim" type="date" />
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="origem">Origem</Label>
          <Input
            id="origem"
            name="origem"
            placeholder="Ex.: Negociação coletiva anual"
          />
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Cadastrando..." : "Cadastrar instrumento"}
        </Button>
      </div>
    </form>
  );
}
