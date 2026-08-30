"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { CheckCircle2, TrendingUp, XCircle } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/design-system/empty-state";
import { StatusBadge } from "@/components/design-system/status-badge";
import { Timeline, type TimelineItem } from "@/components/design-system/timeline";
import {
  avaliarOportunidadeAction,
  decidirOportunidadeAction,
  iniciarAnaliseOportunidadeAction,
  type OportunidadeActionState,
} from "../oportunidade-actions";

const STATUS_LABEL: Record<string, string> = {
  potencial: "Potencial",
  em_analise: "Em análise",
  validada: "Validada",
  descartada: "Descartada",
};

const STATUS_TONE: Record<string, "positive" | "neutral" | "warning" | "negative" | "info"> = {
  potencial: "neutral",
  em_analise: "warning",
  validada: "positive",
  descartada: "negative",
};

const FAIXA_TONE: Record<string, "positive" | "neutral" | "warning" | "negative" | "info"> = {
  alta: "positive",
  media: "warning",
  baixa: "negative",
};

const DIMENSAO_LABEL: Record<string, string> = {
  fit_territorial: "Fit territorial",
  fit_atividade: "Fit de atividade",
  qualidade_evidencias: "Qualidade das evidências",
  completude: "Completude dos dados",
  potencial_economico: "Potencial econômico",
  recencia: "Recência",
  qualidade_contato: "Qualidade de contato",
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface FatorItem {
  dimensao: string;
  pontos: number;
  peso_maximo: number;
  explicacao: string;
  source_type?: string;
  source_fields?: string[];
}

interface CandidatoItem {
  tenantId: string;
  tenantNome: string;
  fitTerritorial: number;
  fitAtividade: number;
  combinado: number;
}

interface InstrumentoItem {
  id: string;
  titulo: string;
  tipo: string;
  vigenciaFim: string | null;
}

interface OportunidadeData {
  id: string;
  status: string;
  score: number;
  prioridade: string;
  confianca: string;
  estimativaValor: number | null;
  estimativaMetodologia: string | null;
  tenantCandidatoNome: string | null;
  candidatosAvaliados: CandidatoItem[];
  instrumentosPotenciais: InstrumentoItem[];
  motivoDecisao: string | null;
}

const initialState: OportunidadeActionState = { error: null, success: false };

function AvaliarButton({ dossieId, jaAvaliada }: { dossieId: string; jaAvaliada: boolean }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await avaliarOportunidadeAction(dossieId);
      if (result.success) {
        toast.success("Oportunidade avaliada.");
      } else {
        toast.error(result.error ?? "Não foi possível avaliar.");
      }
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
      <TrendingUp className="h-4 w-4" />
      {isPending ? "Avaliando..." : jaAvaliada ? "Reavaliar" : "Avaliar oportunidade"}
    </Button>
  );
}

function IniciarAnaliseButton({ oportunidadeId }: { oportunidadeId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await iniciarAnaliseOportunidadeAction(oportunidadeId);
      if (result.success) {
        toast.success("Colocada em análise.");
      } else {
        toast.error(result.error ?? "Não foi possível colocar em análise.");
      }
    });
  }

  return (
    <Button size="sm" onClick={handleClick} disabled={isPending}>
      {isPending ? "Salvando..." : "Colocar em análise"}
    </Button>
  );
}

function DecidirDialog({
  oportunidadeId,
  decisao,
}: {
  oportunidadeId: string;
  decisao: "validada" | "descartada";
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(decidirOportunidadeAction, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success(decisao === "validada" ? "Oportunidade validada." : "Oportunidade descartada.");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
  }, [state.success, decisao]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant={decisao === "validada" ? "default" : "outline"}>
            {decisao === "validada" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {decisao === "validada" ? "Validar" : "Descartar"}
          </Button>
        }
      />
      <DialogContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="oportunidadeId" value={oportunidadeId} />
          <input type="hidden" name="decisao" value={decisao} />
          <DialogHeader>
            <DialogTitle>
              {decisao === "validada" ? "Validar oportunidade" : "Descartar oportunidade"}
            </DialogTitle>
            <DialogDescription>
              O score é uma sugestão — esta decisão é sempre humana (regra 8: IA não tem
              autoridade). Nunca vira obrigação jurídica confirmada por conta própria.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="motivo">Justificativa *</Label>
            <Textarea id="motivo" name="motivo" rows={3} required />
          </div>
          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function OportunidadeSection({
  dossieId,
  oportunidade,
  fatores,
  eventos,
}: {
  dossieId: string;
  oportunidade: OportunidadeData | null;
  fatores: FatorItem[];
  eventos: TimelineItem[];
}) {
  const podeReavaliar = !oportunidade || !["validada", "descartada"].includes(oportunidade.status);
  const outrosCandidatos = (oportunidade?.candidatosAvaliados ?? []).filter(
    (c) => c.combinado > 0 && c.tenantNome !== oportunidade?.tenantCandidatoNome,
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">
          Opportunity Engine
          <span className="ml-2 text-xs font-normal text-muted-foreground">(STG-10)</span>
        </CardTitle>
        {podeReavaliar ? (
          <AvaliarButton dossieId={dossieId} jaAvaliada={Boolean(oportunidade)} />
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!oportunidade ? (
          <EmptyState
            icon={TrendingUp}
            title="Ainda não avaliado"
            description="Calcule o Opportunity Score deste prospecto — fit territorial e de atividade contra os sindicatos cadastrados, potencial econômico estimado a partir do histórico, e um score explicável, dimensão por dimensão. É uma inferência, nunca uma obrigação jurídica confirmada."
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Status:</span>
                <StatusBadge
                  label={STATUS_LABEL[oportunidade.status] ?? oportunidade.status}
                  tone={STATUS_TONE[oportunidade.status] ?? "neutral"}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Score:</span>
                <StatusBadge label={`${oportunidade.score}/100`} tone={FAIXA_TONE[oportunidade.prioridade]} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Prioridade:</span>
                <StatusBadge
                  label={oportunidade.prioridade === "alta" ? "Alta" : oportunidade.prioridade === "media" ? "Média" : "Baixa"}
                  tone={FAIXA_TONE[oportunidade.prioridade]}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Confiança:</span>
                <StatusBadge
                  label={oportunidade.confianca === "alta" ? "Alta" : oportunidade.confianca === "media" ? "Média" : "Baixa"}
                  tone={FAIXA_TONE[oportunidade.confianca]}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Sindicato candidato:</span>
              <span className="font-medium">
                {oportunidade.tenantCandidatoNome ?? "Nenhum sindicato correspondente encontrado"}
              </span>
              {outrosCandidatos.length > 0 ? (
                <span className="text-xs text-muted-foreground">
                  Outros avaliados: {outrosCandidatos.map((c) => c.tenantNome).join(", ")}
                </span>
              ) : null}
            </div>

            <div className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">Estimativa econômica inferida:</span>
              <span className="font-medium">
                {oportunidade.estimativaValor !== null ? formatCurrency(oportunidade.estimativaValor) : "Não disponível"}
              </span>
              {oportunidade.estimativaMetodologia ? (
                <span className="text-xs text-muted-foreground">{oportunidade.estimativaMetodologia}</span>
              ) : null}
            </div>

            {oportunidade.instrumentosPotenciais.length > 0 ? (
              <div>
                <h3 className="mb-2 text-xs font-medium text-muted-foreground">
                  Instrumentos potenciais ({oportunidade.instrumentosPotenciais.length})
                </h3>
                <ul className="flex flex-col gap-1 text-sm">
                  {oportunidade.instrumentosPotenciais.map((i) => (
                    <li key={i.id} className="flex items-center justify-between border-b pb-1 last:border-b-0">
                      <span>{i.titulo}</span>
                      <span className="text-xs text-muted-foreground">
                        {i.tipo.toUpperCase()}
                        {i.vigenciaFim ? ` · vigente até ${new Date(i.vigenciaFim).toLocaleDateString("pt-BR")}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div>
              <h3 className="mb-2 text-xs font-medium text-muted-foreground">
                Por que este score? — detalhamento por dimensão
              </h3>
              <div className="flex flex-col gap-3">
                {fatores.map((f) => (
                  <div key={f.dimensao} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{DIMENSAO_LABEL[f.dimensao] ?? f.dimensao}</span>
                      <span className="text-muted-foreground">
                        {f.pontos}/{f.peso_maximo}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded bg-muted">
                      <div
                        className="h-full rounded bg-primary"
                        style={{ width: `${Math.round((f.pontos / f.peso_maximo) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{f.explicacao}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Proveniência:{" "}
                      {f.source_type === "observed_data" ? "dados observados" : "inferência derivada"}
                      {f.source_fields && f.source_fields.length > 0 ? ` · ${f.source_fields.join(", ")}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {oportunidade.motivoDecisao ? (
              <p className="text-sm text-muted-foreground">
                Justificativa da decisão: {oportunidade.motivoDecisao}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {oportunidade.status === "potencial" ? (
                <>
                  <IniciarAnaliseButton oportunidadeId={oportunidade.id} />
                  <DecidirDialog oportunidadeId={oportunidade.id} decisao="descartada" />
                </>
              ) : null}
              {oportunidade.status === "em_analise" ? (
                <>
                  <DecidirDialog oportunidadeId={oportunidade.id} decisao="validada" />
                  <DecidirDialog oportunidadeId={oportunidade.id} decisao="descartada" />
                </>
              ) : null}
            </div>

            <div>
              <h3 className="mb-2 text-xs font-medium text-muted-foreground">Histórico de avaliações</h3>
              <Timeline items={eventos} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
