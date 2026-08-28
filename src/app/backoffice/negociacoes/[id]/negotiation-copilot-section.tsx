"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/design-system/empty-state";
import {
  gerarResumoNegociacaoAction,
  marcarDecisaoNegotiationAction,
} from "./negotiation-copilot-actions";

function renderComNegrito(texto: string) {
  const partes = texto.split(/(\*\*[^*]+\*\*)/g);
  return partes.map((parte, i) => {
    if (parte.startsWith("**") && parte.endsWith("**")) {
      return <strong key={i}>{parte.slice(2, -2)}</strong>;
    }
    return <span key={i}>{parte}</span>;
  });
}

export function NegotiationCopilotSection({
  negociacaoId,
  aiConfigured,
}: {
  negociacaoId: string;
  aiConfigured: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [output, setOutput] = useState<string | null>(null);
  const [interacaoId, setInteracaoId] = useState<string | null>(null);
  const [decidido, setDecidido] = useState(false);

  function handleGerar() {
    startTransition(async () => {
      const result = await gerarResumoNegociacaoAction(negociacaoId);
      if (result.success) {
        setOutput(result.output);
        setInteracaoId(result.interacaoId);
        setDecidido(false);
      } else {
        toast.error(result.error ?? "Não foi possível gerar o resumo.");
      }
    });
  }

  function handleDecisao(status: "aceito" | "rejeitado") {
    if (!interacaoId) return;
    startTransition(async () => {
      const result = await marcarDecisaoNegotiationAction(interacaoId, status);
      if (result.success) {
        setDecidido(true);
        toast.success(status === "aceito" ? "Resumo marcado como útil." : "Resumo descartado.");
      } else {
        toast.error(result.error ?? "Não foi possível registrar a decisão.");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">
          Negotiation Copilot
          <span className="ml-2 text-xs font-normal text-muted-foreground">(STG-12)</span>
        </CardTitle>
        {aiConfigured ? (
          <Button variant="outline" size="sm" onClick={handleGerar} disabled={isPending}>
            <Sparkles className="h-4 w-4" />
            {isPending ? "Gerando..." : output ? "Gerar novo resumo" : "Gerar resumo"}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!aiConfigured ? (
          <EmptyState
            icon={Sparkles}
            title="IA não configurada"
            description="Defina ANTHROPIC_API_KEY para ativar o Negotiation Copilot. Sem essa chave, nenhuma chamada de IA é feita."
          />
        ) : !output ? (
          <EmptyState
            icon={Sparkles}
            title="Nenhum resumo gerado ainda"
            description="Gera um resumo de leitura da timeline desta negociação — pendências e comparação de valores, a partir só do histórico de eventos já registrado. É uma sugestão de leitura, nunca uma decisão ou avaliação de mérito (regra 8: IA não tem autoridade)."
          />
        ) : (
          <>
            <div className="rounded-md border bg-muted/30 p-4 text-sm leading-relaxed whitespace-pre-wrap">
              {renderComNegrito(output)}
            </div>
            <p className="text-xs text-muted-foreground">
              Sugestão gerada por IA a partir do histórico de eventos desta negociação — não é
              conclusão jurídica nem avaliação de mérito do acordo.
            </p>
            {!decidido ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDecisao("aceito")}
                  disabled={isPending}
                >
                  <ThumbsUp className="h-4 w-4" />
                  Útil
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDecisao("rejeitado")}
                  disabled={isPending}
                >
                  <ThumbsDown className="h-4 w-4" />
                  Não útil
                </Button>
              </div>
            ) : (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Feedback registrado.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
