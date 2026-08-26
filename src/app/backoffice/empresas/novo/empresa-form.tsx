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
import { createEmpresaAction, type EmpresaActionState } from "../actions";

const initialState: EmpresaActionState = { error: null };

interface TenantOption {
  id: string;
  name: string;
}

export function EmpresaForm({ tenants }: { tenants: TenantOption[] }) {
  const [state, formAction, isPending] = useActionState(
    createEmpresaAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="tenantId">Sindicato *</Label>
        <Select name="tenantId" defaultValue={tenants[0]?.id}>
          <SelectTrigger id="tenantId" className="w-full">
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="razaoSocial">Razão social *</Label>
          <Input id="razaoSocial" name="razaoSocial" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="nomeFantasia">Nome fantasia</Label>
          <Input id="nomeFantasia" name="nomeFantasia" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="cnpj">CNPJ *</Label>
          <Input id="cnpj" name="cnpj" placeholder="00.000.000/0000-00" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="cnae">CNAE</Label>
          <Input id="cnae" name="cnae" placeholder="00.00-0-00" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="segmento">Segmento</Label>
          <Input id="segmento" name="segmento" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="enquadramento">Enquadramento sindical</Label>
          <Input id="enquadramento" name="enquadramento" />
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Cadastrando..." : "Cadastrar empresa"}
        </Button>
      </div>
    </form>
  );
}
