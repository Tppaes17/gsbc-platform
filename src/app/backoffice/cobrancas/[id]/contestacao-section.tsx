"use client";

import { useActionState, useEffect, useState } from "react";
import { Download, FileWarning, MessageSquarePlus, PlusCircle, ScaleIcon } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/design-system/empty-state";
import { StatusBadge } from "@/components/design-system/status-badge";
import { Timeline, type TimelineItem } from "@/components/design-system/timeline";
import {
  contestacaoTipoOptions,
  resultadoOptions,
} from "@/lib/validation/contestacao";
import {
  abrirContestacaoAction,
  adicionarComentarioEvidenciaAction,
  adicionarDocumentoEvidenciaAction,
  registrarResultadoContestacaoAction,
  type ContestacaoActionState,
} from "./contestacao-actions";

const TIPO_LABEL = Object.fromEntries(contestacaoTipoOptions.map((o) => [o.value, o.label]));

const STATUS_LABEL: Record<string, string> = {
  aberta: "Aberta",
  em_analise: "Em análise",
  procedente: "Procedente",
  parcialmente_procedente: "Parcialmente procedente",
  improcedente: "Improcedente",
  inconclusiva: "Inconclusiva",
};

const STATUS_TONE: Record<string, "positive" | "neutral" | "warning" | "negative" | "info"> = {
  aberta: "negative",
  em_analise: "warning",
  procedente: "positive",
  parcialmente_procedente: "warning",
  improcedente: "neutral",
  inconclusiva: "neutral",
};

const STATUS_ABERTOS = new Set(["aberta", "em_analise"]);

const initialState: ContestacaoActionState = { error: null, success: false };

interface ContestacaoData {
  id: string;
  tipo: string;
  status: string;
  motivo: string;
  valor_alegado: number | null;
  aberta_em: string;
}

interface EvidenciaData {
  id: string;
  tipo: string;
  comentario: string | null;
  fundamento: string | null;
  created_at: string;
  userNome: string | null;
  documentoNome: string | null;
  documentoUrl: string | null;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function AbrirContestacaoDialog({ cobrancaId }: { cobrancaId: string }) {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState("outros");
  const [state, formAction, isPending] = useActionState(abrirContestacaoAction, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success("Contestação aberta — a cobrança foi pausada.");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
  }, [state.success]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setTipo("outros");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <PlusCircle className="h-4 w-4" />
            Abrir contestação
          </Button>
        }
      />
      <DialogContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="cobrancaId" value={cobrancaId} />
          <input type="hidden" name="tipo" value={tipo} />

          <DialogHeader>
            <DialogTitle>Abrir contestação</DialogTitle>
            <DialogDescription>
              Pausa a régua de cobrança imediatamente — a cobrança muda para
              &quot;Contestada&quot; e a mudança fica registrada na timeline.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="tipoSelect">Tipo *</Label>
            <Select value={tipo} onValueChange={(value) => setTipo(value as string)}>
              <SelectTrigger id="tipoSelect" className="w-full">
                <SelectValue>
                  {(value: string | null) => TIPO_LABEL[value ?? ""] ?? value}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {contestacaoTipoOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="motivo">Motivo *</Label>
            <Textarea id="motivo" name="motivo" rows={3} required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="valorAlegado">Valor alegado</Label>
            <Input id="valorAlegado" name="valorAlegado" inputMode="decimal" placeholder="0,00" />
          </div>

          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Abrir contestação"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ComentarioEvidenciaDialog({ contestacaoId }: { contestacaoId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    adicionarComentarioEvidenciaAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      toast.success("Comentário adicionado.");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <MessageSquarePlus className="h-4 w-4" />
            Comentário
          </Button>
        }
      />
      <DialogContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="contestacaoId" value={contestacaoId} />
          <DialogHeader>
            <DialogTitle>Adicionar comentário</DialogTitle>
            <DialogDescription>Evidência textual, fica anexada à contestação.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="comentario">Comentário *</Label>
            <Textarea id="comentario" name="comentario" rows={3} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="fundamento">Fundamento</Label>
            <Input id="fundamento" name="fundamento" placeholder="Base legal ou factual" />
          </div>
          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DocumentoEvidenciaDialog({ contestacaoId }: { contestacaoId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    adicionarDocumentoEvidenciaAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      toast.success("Documento anexado.");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <FileWarning className="h-4 w-4" />
            Documento
          </Button>
        }
      />
      <DialogContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="contestacaoId" value={contestacaoId} />
          <DialogHeader>
            <DialogTitle>Anexar documento</DialogTitle>
            <DialogDescription>Limite de 50MB por arquivo.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="file">Arquivo *</Label>
            <input
              id="file"
              name="file"
              type="file"
              required
              className="text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-2.5 file:py-1 file:text-sm"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="fundamentoDoc">Fundamento</Label>
            <Input id="fundamentoDoc" name="fundamento" placeholder="Base legal ou factual" />
          </div>
          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Enviando..." : "Anexar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RegistrarResultadoDialog({ contestacaoId }: { contestacaoId: string }) {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState("em_analise");
  const [state, formAction, isPending] = useActionState(
    registrarResultadoContestacaoAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      toast.success("Resultado registrado.");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
  }, [state.success]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setTipo("em_analise");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button size="sm">
            <ScaleIcon className="h-4 w-4" />
            Registrar resultado
          </Button>
        }
      />
      <DialogContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="contestacaoId" value={contestacaoId} />
          <input type="hidden" name="tipo" value={tipo} />

          <DialogHeader>
            <DialogTitle>Registrar resultado da análise</DialogTitle>
            <DialogDescription>
              Não muda o status da cobrança automaticamente — use &quot;Mudar
              status&quot; depois de decidir o próximo passo (retomar cobrança,
              cancelar, etc.).
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="resultadoSelect">Resultado *</Label>
            <Select value={tipo} onValueChange={(value) => setTipo(value as string)}>
              <SelectTrigger id="resultadoSelect" className="w-full">
                <SelectValue>
                  {(value: string | null) =>
                    resultadoOptions.find((opt) => opt.value === value)?.label ?? value
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {resultadoOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="descricao">Fundamento da decisão *</Label>
            <Textarea id="descricao" name="descricao" rows={3} required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="valorResultado">Valor ajustado</Label>
            <Input id="valorResultado" name="valor" inputMode="decimal" placeholder="0,00" />
          </div>

          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ContestacaoSection({
  cobrancaId,
  contestacao,
  eventos,
  evidencias,
  canManage,
}: {
  cobrancaId: string;
  contestacao: ContestacaoData | null;
  eventos: TimelineItem[];
  evidencias: EvidenciaData[];
  canManage: boolean;
}) {
  const podeAbrirNova = !contestacao || !STATUS_ABERTOS.has(contestacao.status);
  const emAberto = contestacao && STATUS_ABERTOS.has(contestacao.status);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">
          Contestação
          <span className="ml-2 text-xs font-normal text-muted-foreground">(STG-04)</span>
        </CardTitle>
        {canManage && podeAbrirNova ? <AbrirContestacaoDialog cobrancaId={cobrancaId} /> : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!contestacao ? (
          <EmptyState
            icon={ScaleIcon}
            title="Nenhuma contestação registrada"
            description="Se a empresa questionar o enquadramento, valor, período ou qualquer outro aspecto da cobrança, registre aqui — a cobrança é pausada automaticamente enquanto a contestação estiver aberta."
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Status:</span>
                <StatusBadge
                  label={STATUS_LABEL[contestacao.status] ?? contestacao.status}
                  tone={STATUS_TONE[contestacao.status] ?? "neutral"}
                />
              </div>
              <span className="text-muted-foreground">
                Tipo: {TIPO_LABEL[contestacao.tipo] ?? contestacao.tipo}
              </span>
              {contestacao.valor_alegado ? (
                <span className="text-muted-foreground">
                  Valor alegado: {formatCurrency(contestacao.valor_alegado)}
                </span>
              ) : null}
            </div>

            <p className="text-sm">{contestacao.motivo}</p>

            {canManage && emAberto ? (
              <div className="flex flex-wrap gap-2">
                <ComentarioEvidenciaDialog contestacaoId={contestacao.id} />
                <DocumentoEvidenciaDialog contestacaoId={contestacao.id} />
                <RegistrarResultadoDialog contestacaoId={contestacao.id} />
              </div>
            ) : null}

            {evidencias.length > 0 ? (
              <div>
                <h3 className="mb-2 text-xs font-medium text-muted-foreground">Evidências</h3>
                <ul className="flex flex-col gap-2">
                  {evidencias.map((ev) => (
                    <li
                      key={ev.id}
                      className="flex items-center justify-between gap-3 border-b pb-2 text-sm last:border-b-0 last:pb-0"
                    >
                      <div className="flex flex-col">
                        <span>
                          {ev.tipo === "documento" ? ev.documentoNome : ev.comentario}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {ev.fundamento ? `${ev.fundamento} · ` : ""}
                          {ev.userNome ?? "—"} ·{" "}
                          {new Date(ev.created_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      {ev.tipo === "documento" && ev.documentoUrl ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          nativeButton={false}
                          aria-label={`Baixar ${ev.documentoNome ?? "documento"}`}
                          render={
                            <a href={ev.documentoUrl} target="_blank" rel="noreferrer" download>
                              <Download className="h-4 w-4" />
                            </a>
                          }
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div>
              <h3 className="mb-2 text-xs font-medium text-muted-foreground">
                Histórico da contestação
              </h3>
              <Timeline items={eventos} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
