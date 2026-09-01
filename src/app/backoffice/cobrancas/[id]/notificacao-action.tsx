"use client";

import { useActionState, useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ActionConsequencePanel } from "@/components/design-system/action-consequence-panel";
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
import { Textarea } from "@/components/ui/textarea";
import { sendNotificacaoAction, type SendNotificacaoState } from "../actions";

const initialState: SendNotificacaoState = { error: null, success: false };

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

/**
 * Monta o mesmo texto que sendNotificacaoAction envia de verdade
 * (src/app/backoffice/cobrancas/actions.ts) — só pra preview antes do
 * envio (Stage 7 da revisão de design, Seção 25 do master prompt).
 * Não é o template real, é uma cópia fiel dele pra exibição; a lógica
 * de envio em si continua inteiramente na Server Action, intocada.
 */
function montarPreview(params: {
  empresaNome: string;
  tenantNome: string;
  obrigacaoDescricao: string;
  valorCobranca: number;
  vencimento: string | null;
  mensagemExtra: string;
}) {
  const {
    empresaNome,
    tenantNome,
    obrigacaoDescricao,
    valorCobranca,
    vencimento,
    mensagemExtra,
  } = params;
  const valorFormatado = formatCurrency(valorCobranca);
  const vencimentoFormatado = formatDate(vencimento);
  const mensagem = mensagemExtra.trim();

  return [
    `Prezados, ${empresaNome},`,
    "",
    `Referente à obrigação "${obrigacaoDescricao}", identificamos uma pendência no valor de ${valorFormatado}, com vencimento em ${vencimentoFormatado}.`,
    mensagem ? `\n${mensagem}` : null,
    "",
    `Em nome de ${tenantNome}, solicitamos a regularização o quanto antes. Para tratar diretamente sobre este assunto, entre em contato com a GSBC.`,
    "",
    "Atenciosamente,",
    "GSBC — Gestora Sindical de Benefícios & Compliance",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

export function NotificacaoAction({
  cobrancaId,
  destinatarioEmail,
  empresaNome,
  tenantNome,
  obrigacaoDescricao,
  valorCobranca,
  vencimento,
}: {
  cobrancaId: string;
  destinatarioEmail: string | null;
  empresaNome: string;
  tenantNome: string;
  obrigacaoDescricao: string;
  valorCobranca: number;
  vencimento: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [state, formAction, isPending] = useActionState(
    sendNotificacaoAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      toast.success("Notificação enviada.");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
  }, [state.success]);

  if (!destinatarioEmail) {
    return (
      <Button
        variant="outline"
        disabled
        title="Cadastre um contato com e-mail nesta empresa"
      >
        <Mail className="h-4 w-4" />
        Enviar notificação
      </Button>
    );
  }

  const assunto = `${tenantNome} — Notificação sobre pendência: ${obrigacaoDescricao}`;
  const preview = montarPreview({
    empresaNome,
    tenantNome,
    obrigacaoDescricao,
    valorCobranca,
    vencimento,
    mensagemExtra: mensagem,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline">
            <Mail className="h-4 w-4" />
            Enviar notificação
          </Button>
        }
      />
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="cobrancaId" value={cobrancaId} />

          <DialogHeader>
            <DialogTitle>Enviar notificação por e-mail</DialogTitle>
            <DialogDescription>
              Revise o preview abaixo antes de enviar — o conteúdo final é
              exatamente este.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1 rounded-md border bg-muted/30 p-3 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-muted-foreground">Destinatário</span>
              <span className="font-medium text-foreground">
                {destinatarioEmail}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-muted-foreground">Canal</span>
              <span className="font-medium text-foreground">E-mail</span>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-muted-foreground">Assunto</span>
              <span className="max-w-[70%] text-right font-medium text-foreground">
                {assunto}
              </span>
            </div>
          </div>

          <ActionConsequencePanel
            items={[
              {
                label: "Efeito externo",
                value: "Envia e-mail para o contato cadastrado",
                emphasis: true,
              },
              {
                label: "Efeito financeiro",
                value: "Não registra pagamento nem baixa a cobrança",
              },
              {
                label: "Reversibilidade",
                value:
                  "Envio não pode ser desfeito; nova correção exige novo contato",
              },
              {
                label: "Auditoria",
                value: "Tentativa, destinatário e resultado ficam registrados",
              },
              {
                label: "Falha parcial",
                value: "Erro de envio preserva a cobrança sem avançar status",
              },
            ]}
          />

          <div className="flex flex-col gap-2">
            <Label htmlFor="mensagem">Mensagem adicional (opcional)</Label>
            <Textarea
              id="mensagem"
              name="mensagem"
              rows={3}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">
              Conteúdo (preview)
            </Label>
            <pre className="max-h-48 overflow-y-auto rounded-md border bg-muted/30 p-3 text-xs whitespace-pre-wrap text-foreground">
              {preview}
            </pre>
          </div>

          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Enviando..." : "Enviar e registrar tentativa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
