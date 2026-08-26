"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { EmptyState } from "@/components/design-system/empty-state";
import { StatusBadge } from "@/components/design-system/status-badge";
import { addObrigacaoAction, type SimpleActionState } from "../actions";

interface Obrigacao {
  id: string;
  descricao: string;
  periodicidade: string;
  vencimento: string | null;
  valor_referencia: number | null;
  status: string;
  empresaNome: string;
  clausulaTitulo: string | null;
  cobrancaId: string | null;
}

interface Option {
  id: string;
  nome: string;
}

const STATUS_CONFIG: Record<string, { label: string; tone: "positive" | "neutral" | "warning" | "negative" | "info" }> = {
  pending_validation: { label: "Aguardando validação", tone: "info" },
  validated: { label: "Validada", tone: "positive" },
  contested: { label: "Contestada", tone: "warning" },
  fulfilled: { label: "Cumprida", tone: "positive" },
  cancelled: { label: "Cancelada", tone: "neutral" },
};

const PERIODICIDADE_LABEL: Record<string, string> = {
  unica: "Única",
  mensal: "Mensal",
  anual: "Anual",
  outra: "Outra",
};

const initialState: SimpleActionState = { error: null, success: false };

function formatCurrency(value: number | null) {
  if (value === null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

export function ObrigacoesSection({
  instrumentoId,
  instrumentoEmpresaId,
  empresas,
  clausulas,
  obrigacoes,
  canManage,
}: {
  instrumentoId: string;
  instrumentoEmpresaId: string | null;
  empresas: Option[];
  clausulas: Option[];
  obrigacoes: Obrigacao[];
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [empresaId, setEmpresaId] = useState(instrumentoEmpresaId ?? "");
  const [clausulaId, setClausulaId] = useState("");
  const [state, formAction, isPending] = useActionState(
    addObrigacaoAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      toast.success("Obrigação adicionada.");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
  }, [state.success]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">Obrigações</CardTitle>
        {canManage ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4" />
                  Adicionar obrigação
                </Button>
              }
            />
            <DialogContent>
              <form action={formAction} className="flex flex-col gap-4">
                <input type="hidden" name="instrumentoId" value={instrumentoId} />
                <input type="hidden" name="empresaId" value={empresaId} />
                <input type="hidden" name="clausulaId" value={clausulaId} />

                <DialogHeader>
                  <DialogTitle>Adicionar obrigação</DialogTitle>
                  <DialogDescription>
                    O que a empresa deveria cumprir a partir desta cláusula.
                  </DialogDescription>
                </DialogHeader>

                {instrumentoEmpresaId ? (
                  <div className="flex flex-col gap-2">
                    <Label>Empresa</Label>
                    <p className="text-sm text-muted-foreground">
                      {empresas.find((e) => e.id === instrumentoEmpresaId)?.nome ??
                        "—"}{" "}
                      (definida pelo instrumento — ACT restrito)
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="empresaSelect">Empresa *</Label>
                    <Select
                      value={empresaId}
                      onValueChange={(value) => setEmpresaId(value as string)}
                    >
                      <SelectTrigger id="empresaSelect" className="w-full">
                        <SelectValue placeholder="Selecione uma empresa">
                          {(value: string | null) =>
                            empresas.find((e) => e.id === value)?.nome ??
                            "Selecione uma empresa"
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
                )}

                {clausulas.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="clausulaSelect">Cláusula de origem</Label>
                    <Select
                      value={clausulaId}
                      onValueChange={(value) => setClausulaId(value as string)}
                    >
                      <SelectTrigger id="clausulaSelect" className="w-full">
                        <SelectValue placeholder="Nenhuma">
                          {(value: string | null) =>
                            clausulas.find((c) => c.id === value)?.nome ??
                            "Nenhuma"
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {clausulas.map((clausula) => (
                          <SelectItem key={clausula.id} value={clausula.id}>
                            {clausula.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                <div className="flex flex-col gap-2">
                  <Label htmlFor="fundamento">Fundamento</Label>
                  <Input
                    id="fundamento"
                    name="fundamento"
                    placeholder="Ex.: Cláusula 5ª da CCT-2026/001"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="descricao">Descrição *</Label>
                  <Input id="descricao" name="descricao" required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="periodicidade">Periodicidade *</Label>
                    <Select name="periodicidade" defaultValue="unica">
                      <SelectTrigger id="periodicidade" className="w-full">
                        <SelectValue>
                          {(value: string | null) =>
                            PERIODICIDADE_LABEL[value ?? ""] ?? value
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unica">Única</SelectItem>
                        <SelectItem value="mensal">Mensal</SelectItem>
                        <SelectItem value="anual">Anual</SelectItem>
                        <SelectItem value="outra">Outra</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="valorReferencia">Valor de referência</Label>
                    <Input
                      id="valorReferencia"
                      name="valorReferencia"
                      inputMode="decimal"
                      placeholder="0,00"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="periodoInicio">Período — início</Label>
                    <Input id="periodoInicio" name="periodoInicio" type="date" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="periodoFim">Período — fim</Label>
                    <Input id="periodoFim" name="periodoFim" type="date" />
                  </div>
                  <div className="flex flex-col gap-2 col-span-2">
                    <Label htmlFor="vencimento">Vencimento</Label>
                    <Input id="vencimento" name="vencimento" type="date" />
                  </div>
                </div>

                {state.error ? (
                  <p role="alert" className="text-sm text-destructive">
                    {state.error}
                  </p>
                ) : null}

                <DialogFooter>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Adicionando..." : "Adicionar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        ) : null}
      </CardHeader>
      <CardContent>
        {obrigacoes.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Nenhuma obrigação cadastrada"
            description="Obrigações originadas deste instrumento aparecerão aqui."
          />
        ) : (
          <ul className="flex flex-col gap-4">
            {obrigacoes.map((obrigacao) => {
              const config = STATUS_CONFIG[obrigacao.status] ?? {
                label: obrigacao.status,
                tone: "neutral" as const,
              };
              return (
                <li
                  key={obrigacao.id}
                  className="flex flex-col gap-1 border-b pb-3 text-sm last:border-b-0 last:pb-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{obrigacao.descricao}</span>
                    <StatusBadge label={config.label} tone={config.tone} />
                  </div>
                  <span className="text-muted-foreground">
                    {obrigacao.empresaNome}
                    {obrigacao.clausulaTitulo
                      ? ` · ${obrigacao.clausulaTitulo}`
                      : ""}
                    {" · "}
                    {PERIODICIDADE_LABEL[obrigacao.periodicidade] ??
                      obrigacao.periodicidade}
                    {" · Vencimento: "}
                    {formatDate(obrigacao.vencimento)}
                    {" · "}
                    {formatCurrency(obrigacao.valor_referencia)}
                  </span>
                  {canManage ? (
                    <Link
                      href={
                        obrigacao.cobrancaId
                          ? `/backoffice/cobrancas/${obrigacao.cobrancaId}`
                          : `/backoffice/cobrancas/novo?obrigacaoId=${obrigacao.id}`
                      }
                      className="text-sm text-primary hover:underline"
                    >
                      {obrigacao.cobrancaId ? "Ver cobrança" : "Gerar cobrança"}
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
