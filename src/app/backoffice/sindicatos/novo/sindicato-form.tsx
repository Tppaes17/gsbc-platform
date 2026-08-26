"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSindicatoAction, type SindicatoActionState } from "../actions";

const initialState: SindicatoActionState = { error: null };

const DIACRITICS_PATTERN = new RegExp("[\\u0300-\\u036f]", "g");

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS_PATTERN, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function SindicatoForm() {
  const [state, formAction, isPending] = useActionState(
    createSindicatoAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
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
          <Label htmlFor="slug">Identificador (URL) *</Label>
          <Input
            id="slug"
            name="slug"
            placeholder="sindicato-comercio-sp"
            required
            onChange={(e) => {
              e.target.value = slugify(e.target.value);
            }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="categoria">Categoria</Label>
          <Input id="categoria" name="categoria" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="baseTerritorial">Base territorial</Label>
          <Input id="baseTerritorial" name="baseTerritorial" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="emailInstitucional">E-mail institucional</Label>
          <Input
            id="emailInstitucional"
            name="emailInstitucional"
            type="email"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="telefone">Telefone</Label>
          <Input id="telefone" name="telefone" />
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Cadastrando..." : "Cadastrar sindicato"}
        </Button>
      </div>
    </form>
  );
}
