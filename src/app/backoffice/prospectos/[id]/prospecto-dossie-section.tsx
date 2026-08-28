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
import { consultarProspectoAction } from "../actions";

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
  descartado_receita: "neutral",
};

const SCORE_TONE: Record<string, "positive" | "neutral" | "warning" | "negative" | "info"> = {
  excelente: "positive",
  alta: "positive",
  media: "warning",
  baixa: "negative",
  insuficiente: "negative",
};

interface EvidenciaItem {
  id: string;
  tipo: string;
  campo: string | null;
  valor: string | null;
  fonte: string;
  nivel_confianca: string;
  observacao: string | null;
  consultado_em: string;
}

type DossieData = {
  status: string;
  score_confiabilidade: number | null;
  score_classificacao: string | null;
  ultima_consulta_em: string | null;
  descartado_motivo: string | null;
};

export function ProspectoDossieSection({
  dossieId,
  dossie,
  evidencias,
  enriquecimentoWebConfigurado,
}: {
  dossieId: string;
  dossie: DossieData;
  evidencias: EvidenciaItem[];
  enriquecimentoWebConfigurado: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleConsultar() {
    startTransition(async () => {
      const result = await consultarProspectoAction(dossieId);
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
    description: [e.observacao, `fonte: ${e.fonte}`].filter(Boolean).join(" · "),
    timestamp: e.consultado_em,
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">
          Inteligência cadastral
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            (Owner · Receita Federal
            {enriquecimentoWebConfigurado ? " + enriquecimento web" : ""})
          </span>
        </CardTitle>
        <Button variant="outline" size="sm" onClick={handleConsultar} disabled={isPending}>
          <ShieldCheck className="h-4 w-4" />
          {isPending ? "Consultando..." : "Consultar CNPJ oficial"}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {dossie.status === "descartado_receita" && dossie.descartado_motivo ? (
          <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
            Descartado automaticamente: {dossie.descartado_motivo} O registro continua
            aqui pra consulta — nada foi apagado.
          </p>
        ) : null}
        {!enriquecimentoWebConfigurado ? (
          <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
            Enriquecimento web (site, e-mails, telefone, decisores, LinkedIn)
            ainda não está configurado — a consulta usa só a Receita
            Federal por enquanto. Configure <code>LEADCNPJ_API_KEY</code>{" "}
            para ativar a Fase 2.
          </p>
        ) : null}

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
          ) : (
            <span className="text-muted-foreground">
              Sem score — dado importado, ainda não confirmado contra a Receita Federal.
            </span>
          )}
          {dossie.ultima_consulta_em ? (
            <span className="text-muted-foreground">
              Última consulta oficial: {new Date(dossie.ultima_consulta_em).toLocaleString("pt-BR")}
            </span>
          ) : null}
        </div>

        {evidencias.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Nenhuma evidência registrada ainda"
            description="Consulte a Receita Federal (via BrasilAPI/Minha Receita) e, se configurado, o enriquecimento web (LeadCNPJ) para validar este prospecto."
          />
        ) : (
          <div>
            <h3 className="mb-2 text-xs font-medium text-muted-foreground">
              Evidências e timeline da pesquisa
            </h3>
            <Timeline items={timelineItems} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
