"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Send, Sparkles, ThumbsDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/design-system/empty-state";
import { StatusBadge } from "@/components/design-system/status-badge";
import { ACAO_SUGERIDA_OPTIONS } from "@/lib/ai/collections-copilot-options";
import {
  enviarRascunhoNotificacaoAction,
  marcarDecisaoCollectionsAction,
  sugerirAcaoCobrancaAction,
} from "./collections-copilot-actions";

const ACAO_LABEL: Record<string, string> = Object.fromEntries(
  ACAO_SUGERIDA_OPTIONS.map((o) => [o.value, o.label]),
);

const ACAO_TONE: Record<string, "positive" | "neutral" | "warning" | "negative" | "info"> = {
  enviar_notificacao: "info",
  iniciar_negociacao: "info",
  aguardar: "neutral",
  escalar: "warning",
  nenhuma_acao_necessaria: "positive",
};

export function CollectionsCopilotSection({
  cobrancaId,
  aiConfigured,
}: {
  cobrancaId: string;
  aiConfigured: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [interacaoId, setInteracaoId] = useState<string | null>(null);
  const [acaoSugerida, setAcaoSugerida] = useState<string | null>(null);
  const [justificativa, setJustificativa] = useState<string | null>(null);
  const [rascunhoOriginal, setRascunhoOriginal] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState("");
  const [parseOk, setParseOk] = useState(true);
  const [decidido, setDecidido] = useState(false);
  const [enviado, setEnviado] = useState(false);

  function handleSugerir() {
    startTransition(async () => {
      const result = await sugerirAcaoCobrancaAction(cobrancaId);
      if (result.success && result.resultado) {
        setInteracaoId(result.interacaoId);
        setAcaoSugerida(result.resultado.acaoSugerida);
        setJustificativa(result.resultado.justificativa);
        setRascunhoOriginal(result.resultado.rascunhoNotificacao);
        setRascunho(result.resultado.rascunhoNotificacao ?? "");
        setParseOk(result.resultado.parseOk);
        setDecidido(false);
        setEnviado(false);
      } else {
        toast.error(result.error ?? "Não foi possível gerar a sugestão.");
      }
    });
  }

  function handleDescartar() {
    if (!interacaoId) return;
    startTransition(async () => {
      const result = await marcarDecisaoCollectionsAction(interacaoId, "rejeitado");
      if (result.success) {
        setDecidido(true);
        toast.success("Sugestão descartada.");
      } else {
        toast.error(result.error ?? "Não foi possível registrar a decisão.");
      }
    });
  }

  function handleEnviar() {
    if (!interacaoId || !rascunho.trim()) return;
    startTransition(async () => {
      const result = await enviarRascunhoNotificacaoAction(
        cobrancaId,
        interacaoId,
        rascunho,
        rascunhoOriginal,
      );
      if (result.success) {
        setEnviado(true);
        toast.success("Notificação enviada.");
      } else {
        toast.error(result.error ?? "Não foi possível enviar a notificação.");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">
          Collections Copilot
          <span className="ml-2 text-xs font-normal text-muted-foreground">Assistente de leitura</span>
        </CardTitle>
        {aiConfigured ? (
          <Button variant="outline" size="sm" onClick={handleSugerir} disabled={isPending}>
            <Sparkles className="h-4 w-4" />
            {isPending ? "Gerando..." : acaoSugerida ? "Gerar nova sugestão" : "Sugerir ação"}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!aiConfigured ? (
          <EmptyState
            icon={Sparkles}
            title="IA não configurada"
            description="O assistente de leitura ainda não está disponível neste ambiente."
            density="compact"
          />
        ) : !acaoSugerida ? (
          <EmptyState
            icon={Sparkles}
            title="Nenhuma sugestão gerada ainda"
            description="Pede uma sugestão de próxima ação pra esta cobrança, a partir do status, notificações e eventos já registrados. O copilot nunca envia nada sozinho — toda ação passa por revisão humana antes de acontecer (regra 8: IA não tem autoridade)."
          />
        ) : !parseOk ? (
          <p className="text-sm text-destructive">
            A IA respondeu em um formato inesperado — tente gerar novamente.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Ação sugerida:</span>
                <StatusBadge
                  label={ACAO_LABEL[acaoSugerida] ?? acaoSugerida}
                  tone={ACAO_TONE[acaoSugerida] ?? "neutral"}
                />
              </div>
            </div>

            {justificativa ? <p className="text-sm">{justificativa}</p> : null}

            {acaoSugerida === "enviar_notificacao" && !enviado ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="rascunho">Rascunho — parágrafo adicional da notificação</Label>
                <Textarea
                  id="rascunho"
                  rows={4}
                  value={rascunho}
                  onChange={(e) => setRascunho(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Este texto é inserido dentro do modelo de e-mail já existente (saudação, valor,
                  vencimento e fechamento continuam vindo do modelo padrão). Revise antes de
                  enviar — pode editar livremente.
                </p>
                <div>
                  <Button size="sm" onClick={handleEnviar} disabled={isPending || !rascunho.trim()}>
                    <Send className="h-4 w-4" />
                    {isPending ? "Enviando..." : "Usar rascunho e enviar"}
                  </Button>
                </div>
              </div>
            ) : null}

            {enviado ? (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Notificação enviada com este rascunho.
              </p>
            ) : null}

            <p className="text-xs text-muted-foreground">
              Sugestão gerada por IA a partir do estado atual da cobrança — não é uma decisão
              nem uma conclusão jurídica.
            </p>

            {!decidido && !enviado && acaoSugerida !== "enviar_notificacao" ? (
              <div>
                <Button variant="outline" size="sm" onClick={handleDescartar} disabled={isPending}>
                  <ThumbsDown className="h-4 w-4" />
                  Descartar sugestão
                </Button>
              </div>
            ) : null}

            {decidido ? (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Feedback registrado.
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
