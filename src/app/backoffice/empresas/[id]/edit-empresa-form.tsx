"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type EmpresaActionState,
  updateEmpresaAction,
} from "../actions";
import type { Database } from "@/types/database.types";

type EmpresaRow = Database["public"]["Tables"]["empresas"]["Row"];

const initialState: EmpresaActionState = { error: null };

export function EditEmpresaForm({
  empresa,
  readOnly,
}: {
  empresa: EmpresaRow;
  readOnly: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    updateEmpresaAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <input type="hidden" name="empresaId" value={empresa.id} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="razaoSocial">Razão social *</Label>
          <Input
            id="razaoSocial"
            name="razaoSocial"
            defaultValue={empresa.razao_social}
            disabled={readOnly}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="nomeFantasia">Nome fantasia</Label>
          <Input
            id="nomeFantasia"
            name="nomeFantasia"
            defaultValue={empresa.nome_fantasia ?? ""}
            disabled={readOnly}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="cnpj">CNPJ *</Label>
          <Input
            id="cnpj"
            name="cnpj"
            defaultValue={empresa.cnpj}
            disabled={readOnly}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="cnae">CNAE</Label>
          <Input
            id="cnae"
            name="cnae"
            defaultValue={empresa.cnae ?? ""}
            disabled={readOnly}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="segmento">Segmento</Label>
          <Input
            id="segmento"
            name="segmento"
            defaultValue={empresa.segmento ?? ""}
            disabled={readOnly}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="enquadramento">Enquadramento sindical</Label>
          <Input
            id="enquadramento"
            name="enquadramento"
            defaultValue={empresa.enquadramento ?? ""}
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
