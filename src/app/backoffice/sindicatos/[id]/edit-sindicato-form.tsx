"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type SindicatoActionState,
  updateSindicatoAction,
} from "../actions";
import type { Database } from "@/types/database.types";

type SindicatoRow = Database["public"]["Tables"]["sindicatos"]["Row"];

const initialState: SindicatoActionState = { error: null };

export function EditSindicatoForm({
  sindicato,
  readOnly,
}: {
  sindicato: SindicatoRow;
  readOnly: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    updateSindicatoAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <input type="hidden" name="tenantId" value={sindicato.tenant_id} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="razaoSocial">Razão social *</Label>
          <Input
            id="razaoSocial"
            name="razaoSocial"
            defaultValue={sindicato.razao_social}
            disabled={readOnly}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="nomeFantasia">Nome fantasia</Label>
          <Input
            id="nomeFantasia"
            name="nomeFantasia"
            defaultValue={sindicato.nome_fantasia ?? ""}
            disabled={readOnly}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="cnpj">CNPJ *</Label>
          <Input
            id="cnpj"
            name="cnpj"
            defaultValue={sindicato.cnpj}
            disabled={readOnly}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="categoria">Categoria</Label>
          <Input
            id="categoria"
            name="categoria"
            defaultValue={sindicato.categoria ?? ""}
            disabled={readOnly}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="baseTerritorial">Base territorial</Label>
          <Input
            id="baseTerritorial"
            name="baseTerritorial"
            defaultValue={sindicato.base_territorial ?? ""}
            disabled={readOnly}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="emailInstitucional">E-mail institucional</Label>
          <Input
            id="emailInstitucional"
            name="emailInstitucional"
            type="email"
            defaultValue={sindicato.email_institucional ?? ""}
            disabled={readOnly}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="telefone">Telefone</Label>
          <Input
            id="telefone"
            name="telefone"
            defaultValue={sindicato.telefone ?? ""}
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
          Dados cadastrais são gerenciados exclusivamente pela equipe GSBC.
        </p>
      )}
    </form>
  );
}
