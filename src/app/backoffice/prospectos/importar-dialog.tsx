"use client";

import { useActionState, useEffect, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
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
import { PROSPECTO_COLUNAS_ESPERADAS } from "@/lib/validation/prospecto";
import { importarProspectosAction, type ImportarProspectosState } from "./actions";

const initialState: ImportarProspectosState = { error: null, success: false };

export function ImportarProspectosDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(importarProspectosAction, initialState);

  useEffect(() => {
    if (state.success && state.resumo) {
      toast.success(
        `Importação concluída: ${state.resumo.importadas} novo(s), ${state.resumo.atualizadas} atualizado(s)${
          state.resumo.comErro > 0 ? `, ${state.resumo.comErro} linha(s) com erro` : ""
        }.`,
      );
    }
  }, [state.success, state.resumo]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4" />
            Importar planilha
          </Button>
        }
      />
      <DialogContent>
        <form action={formAction} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Importar prospectos de uma planilha</DialogTitle>
            <DialogDescription>
              Para pesquisa já realizada (ex.: exportação de um provedor de dados B2B
              filtrado por CNAE). A planilha precisa ter estas colunas na primeira
              aba: {PROSPECTO_COLUNAS_ESPERADAS.join(", ")}.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="file">Arquivo (.xlsx) *</Label>
            <input
              id="file"
              name="file"
              type="file"
              accept=".xlsx"
              required
              className="text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-2.5 file:py-1 file:text-sm"
            />
          </div>

          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}

          {state.success && state.resumo ? (
            <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
              <p>{state.resumo.totalLinhas} linha(s) na planilha.</p>
              <p>{state.resumo.importadas} prospecto(s) novo(s).</p>
              <p>{state.resumo.atualizadas} prospecto(s) atualizado(s) (CNPJ já importado antes).</p>
              {state.resumo.comErro > 0 ? (
                <p>{state.resumo.comErro} linha(s) com erro — CNPJ ou Razão Social ausente/inválido, ignoradas.</p>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Importando..." : "Importar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
