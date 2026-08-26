"use client";

import { useTransition } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/design-system/empty-state";
import { StatusBadge } from "@/components/design-system/status-badge";
import { Timeline, type TimelineItem } from "@/components/design-system/timeline";
import {
  dossieStatusOptions,
  nivelConfiancaOptions,
  scoreClassificacaoOptions,
} from "@/lib/validation/dossie-cadastral";
import { consultarDossieCadastralAction } from "./dossie-actions";

const STATUS_LABEL = Object.fromEntries(dossieStatusOptions.map((o) => [o.value, o.label]));
const SCORE_LABEL = Object.fromEntries(
  scoreClassificacaoOptions.map((o) => [o.value, o.label]),
);
const NIVEL_LABEL = Object.fromEntries(nivelConfiancaOptions.map((o) => [o.value, o.label]));

const STATUS_TONE: Record<string, "positive" | "neutral" | "warning" | "negative" | "info"> = {
  novo: "neutral",
  pesquisa_iniciada: "info",
  cadastro_validado: "positive",
  conflito_identificado: "warning",
  revisao_cadastral: "negative",
};

const SCORE_TONE: Record<string, "positive" | "neutral" | "warning" | "negative" | "info"> = {
  excelente: "positive",
  alta: "positive",
  media: "warning",
  baixa: "negative",
  insuficiente: "negative",
};

const NIVEL_TONE: Record<string, "positive" | "neutral" | "warning" | "negative" | "info"> = {
  confirmado: "positive",
  provavel: "info",
  nao_confirmado: "neutral",
  conflitante: "negative",
  desatualizado: "warning",
};

interface EvidenciaItem {
  id: string;
  tipo: string;
  campo: string | null;
  valor: string | null;
  nivel_confianca: string;
  observacao: string | null;
  consultado_em: string;
}

type DossieData = {
  status: string;
  score_confiabilidade: number | null;
  score_classificacao: string | null;
  ultima_consulta_em: string | null;
} | null;

export function DossieCadastralSection({
  empresaId,
  dossie,
  evidencias,
}: {
  empresaId: string;
  dossie: DossieData;
  evidencias: EvidenciaItem[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleConsultar() {
    startTransition(async () => {
      const result = await consultarDossieCadastralAction(empresaId);
      if (result.success) {
        toast.success("Consulta cadastral concluída.");
      } else {
        toast.error(result.error ?? "Não foi possível consultar.");
      }
    });
  }

  const timelineItems: TimelineItem[] = evidencias.map((e) => ({
    id: e.id,
    label: `${e.campo ?? e.tipo} — ${NIVEL_LABEL[e.nivel_confianca] ?? e.nivel_confianca}${e.valor ? `: ${e.valor}` : ""}`,
    description: e.observacao ?? undefined,
    timestamp: e.consultado_em,
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">
          Inteligência cadastral
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            (Owner · Fase 1 — consulta oficial de CNPJ)
          </span>
        </CardTitle>
        <Button variant="outline" size="sm" onClick={handleConsultar} disabled={isPending}>
          <ShieldCheck className="h-4 w-4" />
          {isPending ? "Consultando..." : "Consultar CNPJ oficial"}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!dossie ? (
          <EmptyState
            icon={ShieldCheck}
            title="Nenhuma consulta realizada ainda"
            description="Consulte a Receita Federal (via BrasilAPI/Minha Receita) para validar o cadastro desta empresa."
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Status:</span>
                <StatusBadge
                  label={STATUS_LABEL[dossie.status] ?? dossie.status}
                  tone={STATUS_TONE[dossie.status] ?? "neutral"}
                />
              </div>
              {dossie.score_classificacao ? (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Score cadastral:</span>
                  <StatusBadge
                    label={`${dossie.score_confiabilidade ?? 0}/100 — ${SCORE_LABEL[dossie.score_classificacao] ?? dossie.score_classificacao}`}
                    tone={SCORE_TONE[dossie.score_classificacao] ?? "neutral"}
                  />
                </div>
              ) : null}
              {dossie.ultima_consulta_em ? (
                <span className="text-muted-foreground">
                  Última consulta: {new Date(dossie.ultima_consulta_em).toLocaleString("pt-BR")}
                </span>
              ) : null}
            </div>

            {evidencias.some((e) => e.nivel_confianca === "conflitante") ? (
              <div className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <h3 className="text-xs font-medium text-destructive">
                  Conflitos identificados — cadastro GSBC diverge da Receita Federal
                </h3>
                <ul className="flex flex-col gap-1.5">
                  {evidencias
                    .filter((e) => e.nivel_confianca === "conflitante")
                    .map((e) => (
                      <li key={e.id} className="flex items-center gap-2 text-sm">
                        <StatusBadge
                          label={NIVEL_LABEL[e.nivel_confianca] ?? e.nivel_confianca}
                          tone={NIVEL_TONE[e.nivel_confianca] ?? "neutral"}
                        />
                        <span className="text-muted-foreground">{e.observacao}</span>
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}

            <div>
              <h3 className="mb-2 text-xs font-medium text-muted-foreground">
                Evidências e timeline da pesquisa
              </h3>
              <Timeline items={timelineItems} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
