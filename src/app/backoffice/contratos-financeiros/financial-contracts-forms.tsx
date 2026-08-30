"use client";

import { useActionState, useEffect, useRef } from "react";
import { Save, SplitSquareHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createFinancialContractAction,
  createFinancialSplitRuleAction,
  type FinancialContractActionState,
} from "./actions";

export interface SindicatoOption {
  id: string;
  label: string;
}

export interface ContractOption {
  id: string;
  label: string;
}

const initialState: FinancialContractActionState = { error: null, success: false };
const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

export function FinancialContractsForms({
  sindicatos,
  contracts,
}: {
  sindicatos: SindicatoOption[];
  contracts: ContractOption[];
}) {
  const router = useRouter();
  const contractFormRef = useRef<HTMLFormElement>(null);
  const splitFormRef = useRef<HTMLFormElement>(null);
  const [contractState, contractAction, isCreatingContract] = useActionState(
    createFinancialContractAction,
    initialState,
  );
  const [splitState, splitAction, isCreatingSplit] = useActionState(
    createFinancialSplitRuleAction,
    initialState,
  );

  useEffect(() => {
    if (contractState.success) {
      toast.success("Contrato financeiro validado.");
      contractFormRef.current?.reset();
      router.refresh();
    }
  }, [contractState.success, router]);

  useEffect(() => {
    if (splitState.success) {
      toast.success("Versão de split criada.");
      splitFormRef.current?.reset();
      router.refresh();
    }
  }, [splitState.success, router]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Validar contrato financeiro</CardTitle>
        </CardHeader>
        <CardContent>
          <form ref={contractFormRef} action={contractAction} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="sindicatoId">Sindicato *</Label>
                <select id="sindicatoId" name="sindicatoId" required className={selectClassName}>
                  <option value="">Selecione</option>
                  {sindicatos.map((sindicato) => (
                    <option key={sindicato.id} value={sindicato.id}>
                      {sindicato.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="titulo">Título *</Label>
                <Input id="titulo" name="titulo" required minLength={3} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="vigenciaInicio">Início *</Label>
                <Input id="vigenciaInicio" name="vigenciaInicio" type="date" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="vigenciaFim">Fim</Label>
                <Input id="vigenciaFim" name="vigenciaFim" type="date" />
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="observacao">Observação</Label>
                <Textarea id="observacao" name="observacao" rows={3} />
              </div>
            </div>
            {contractState.error ? (
              <p role="alert" className="text-sm text-destructive">
                {contractState.error}
              </p>
            ) : null}
            <Button type="submit" disabled={isCreatingContract || sindicatos.length === 0}>
              <Save className="h-4 w-4" />
              {isCreatingContract ? "Validando..." : "Validar contrato"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Criar versão de split</CardTitle>
        </CardHeader>
        <CardContent>
          <form ref={splitFormRef} action={splitAction} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="flex flex-col gap-2 sm:col-span-4">
                <Label htmlFor="contractId">Contrato validado *</Label>
                <select id="contractId" name="contractId" required className={selectClassName}>
                  <option value="">Selecione</option>
                  {contracts.map((contract) => (
                    <option key={contract.id} value={contract.id}>
                      {contract.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="effectiveFrom">Vigência da regra *</Label>
                <Input id="effectiveFrom" name="effectiveFrom" type="date" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="gsbcPercent">GSBC % *</Label>
                <Input id="gsbcPercent" name="gsbcPercent" inputMode="decimal" defaultValue="20" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="sindicatoPercent">Sindicato % *</Label>
                <Input id="sindicatoPercent" name="sindicatoPercent" inputMode="decimal" defaultValue="80" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="terceirosPercent">Terceiros % *</Label>
                <Input id="terceirosPercent" name="terceirosPercent" inputMode="decimal" defaultValue="0" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="providerFeePercent">Provider % *</Label>
                <Input id="providerFeePercent" name="providerFeePercent" inputMode="decimal" defaultValue="0" required />
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="providerFeeFixed">Taxa fixa</Label>
                <Input id="providerFeeFixed" name="providerFeeFixed" inputMode="decimal" defaultValue="0" />
              </div>
              <div className="flex flex-col gap-2 sm:col-span-4">
                <Label htmlFor="splitObservacao">Observação</Label>
                <Textarea id="splitObservacao" name="observacao" rows={3} />
              </div>
            </div>
            {splitState.error ? (
              <p role="alert" className="text-sm text-destructive">
                {splitState.error}
              </p>
            ) : null}
            <Button type="submit" disabled={isCreatingSplit || contracts.length === 0}>
              <SplitSquareHorizontal className="h-4 w-4" />
              {isCreatingSplit ? "Criando..." : "Criar versão"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
