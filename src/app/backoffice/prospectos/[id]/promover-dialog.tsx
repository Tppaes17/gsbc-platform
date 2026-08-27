"use client";

import { useActionState, useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import Link from "next/link";
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
  promoverProspectoAction,
  type PromoverProspectoState,
} from "../actions";

const initialState: PromoverProspectoState = {
  status: "idle",
  error: null,
  empresaExistente: null,
};

interface TenantOption {
  id: string;
  name: string;
}

export function PromoverProspectoDialog({
  dossieId,
  razaoSocial,
  cnaeSugerido,
  tenants,
}: {
  dossieId: string;
  razaoSocial: string;
  cnaeSugerido: string;
  tenants: TenantOption[];
}) {
  const [open, setOpen] = useState(false);
  const [tenantId, setTenantId] = useState(tenants[0]?.id);
  const [state, formAction, isPending] = useActionState(
    promoverProspectoAction,
    initialState,
  );

  if (tenants.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <ArrowRightLeft className="h-4 w-4" />
            Promover para empresa
          </Button>
        }
      />
      <DialogContent>
        {state.status === "duplicado" && state.empresaExistente ? (
          <div className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Já existe uma empresa com esse CNPJ</DialogTitle>
              <DialogDescription>
                <strong>{state.empresaExistente.razaoSocial}</strong> já está
                cadastrada em <strong>{state.empresaExistente.tenantNome}</strong>{" "}
                com o mesmo CNPJ. Promover este prospecto não cria uma empresa
                duplicada — escolha o que fazer.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                nativeButton={false}
                render={
                  <Link href={`/backoffice/empresas/${state.empresaExistente.id}`}>
                    Abrir empresa existente
                  </Link>
                }
              />
              <form action={formAction}>
                <input type="hidden" name="dossieId" value={dossieId} />
                <input type="hidden" name="tenantId" value={tenantId} />
                <input type="hidden" name="razaoSocial" value={razaoSocial} />
                <input type="hidden" name="confirmarAssociacao" value="true" />
                <Button
                  type="submit"
                  variant="outline"
                  disabled={isPending}
                  className="w-full"
                >
                  {isPending
                    ? "Associando..."
                    : "Associar evidências à empresa existente"}
                </Button>
              </form>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="dossieId" value={dossieId} />
            <input type="hidden" name="confirmarAssociacao" value="false" />

            <DialogHeader>
              <DialogTitle>Promover prospecto para empresa</DialogTitle>
              <DialogDescription>
                Cria uma empresa vinculada ao sindicato escolhido, preservando
                origem, evidências e score já coletados neste dossiê — sem
                recadastro manual.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-2">
              <Label htmlFor="tenantId">Sindicato *</Label>
              <Select
                name="tenantId"
                value={tenantId}
                onValueChange={(value) => setTenantId(value as string)}
              >
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
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="razaoSocial">Razão social *</Label>
                <Input
                  id="razaoSocial"
                  name="razaoSocial"
                  defaultValue={razaoSocial}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="nomeFantasia">Nome fantasia</Label>
                <Input id="nomeFantasia" name="nomeFantasia" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="cnae">CNAE</Label>
                <Input
                  id="cnae"
                  name="cnae"
                  defaultValue={cnaeSugerido}
                  placeholder="00.00-0-00"
                />
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

            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Promovendo..." : "Promover para empresa"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
