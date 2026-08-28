"use client";

import { useActionState, useEffect, useState } from "react";
import { Download, FileWarning, Gavel, PlusCircle, Send, ShieldCheck } from "lucide-react";
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
import { canalEnvioOptions, deliveryStatusOptions } from "@/lib/validation/escalonamento";
import {
  decidirAprovacaoAction,
  gerarDocumentoAction,
  iniciarEscalonamentoAction,
  registrarEnvioEmailAction,
  registrarEnvioFisicoAction,
  registrarResultadoEscalonamentoAction,
  submeterParaAprovacaoAction,
  type EscalonamentoActionState,
} from "./escalonamento-actions";

const STATUS_LABEL: Record<string, string> = {
  em_revisao: "Em revisão",
  aguardando_aprovacao: "Aguardando aprovação",
  rejeitada: "Rejeitada",
  aprovada: "Aprovada",
  documento_emitido: "Documento emitido",
  enviada: "Enviada",
  concluida: "Concluída",
};

const STATUS_TONE: Record<string, "positive" | "neutral" | "warning" | "negative" | "info"> = {
  em_revisao: "neutral",
  aguardando_aprovacao: "warning",
  rejeitada: "negative",
  aprovada: "info",
  documento_emitido: "info",
  enviada: "positive",
  concluida: "positive",
};

const CANAL_LABEL: Record<string, string> = {
  email: "E-mail",
  correio_ar: "Correio (AR)",
  cartorio: "Cartório",
  outro: "Outro",
};

const DELIVERY_LABEL: Record<string, string> = {
  pendente: "Pendente",
  entregue: "Entregue",
  falha: "Falha",
  desconhecido: "Aguardando confirmação",
};

const initialState: EscalonamentoActionState = { error: null, success: false };

interface EscalonamentoData {
  id: string;
  status: string;
  motivo: string;
  motivoDecisao: string | null;
  iniciadoEm: string;
  aprovadoEm: string | null;
  concluidoEm: string | null;
}

interface DocumentoEmitidoData {
  id: string;
  nomeArquivo: string;
  url: string | null;
  templateVersao: number;
  createdAt: string;
}

interface EnvioData {
  id: string;
  canal: string;
  destinatario: string;
  deliveryStatus: string;
  erro: string | null;
  enviadoEm: string;
  comprovanteUrl: string | null;
}

function IniciarEscalonamentoDialog({ cobrancaId }: { cobrancaId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(iniciarEscalonamentoAction, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success("Escalonamento iniciado.");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <PlusCircle className="h-4 w-4" />
            Iniciar escalonamento
          </Button>
        }
      />
      <DialogContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="cobrancaId" value={cobrancaId} />
          <DialogHeader>
            <DialogTitle>Iniciar escalonamento</DialogTitle>
            <DialogDescription>
              Abre o caso pra revisão — ainda não envia nada. Notificação
              extrajudicial só sai depois de aprovação do Jurídico e emissão
              do documento formal.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="motivo">Motivo (critérios de escalonamento) *</Label>
            <Textarea id="motivo" name="motivo" rows={3} required />
          </div>
          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Iniciar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SubmeterParaAprovacaoButton({ escalonamentoId }: { escalonamentoId: string }) {
  const [state, formAction, isPending] = useActionState(submeterParaAprovacaoAction, initialState);

  useEffect(() => {
    if (state.success) toast.success("Submetido para aprovação do Jurídico.");
    if (state.error) toast.error(state.error);
  }, [state.success, state.error]);

  return (
    <form action={formAction}>
      <input type="hidden" name="escalonamentoId" value={escalonamentoId} />
      <Button type="submit" size="sm" disabled={isPending}>
        <Send className="h-4 w-4" />
        {isPending ? "Enviando..." : "Submeter para aprovação"}
      </Button>
    </form>
  );
}

function DecidirAprovacaoDialog({ escalonamentoId }: { escalonamentoId: string }) {
  const [open, setOpen] = useState(false);
  const [aprovado, setAprovado] = useState<"true" | "false">("true");
  const [state, formAction, isPending] = useActionState(decidirAprovacaoAction, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success("Decisão registrada.");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Gavel className="h-4 w-4" />
            Decidir aprovação
          </Button>
        }
      />
      <DialogContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="escalonamentoId" value={escalonamentoId} />
          <DialogHeader>
            <DialogTitle>Aprovar ou rejeitar escalonamento</DialogTitle>
            <DialogDescription>
              Decisão exclusiva do papel Jurídico — a notificação extrajudicial
              só pode ser gerada depois de aprovada.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={aprovado === "true" ? "default" : "outline"}
              size="sm"
              onClick={() => setAprovado("true")}
            >
              Aprovar
            </Button>
            <Button
              type="button"
              variant={aprovado === "false" ? "default" : "outline"}
              size="sm"
              onClick={() => setAprovado("false")}
            >
              Rejeitar
            </Button>
          </div>
          <input type="hidden" name="aprovado" value={aprovado} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="motivoDecisao">Justificativa *</Label>
            <Textarea id="motivoDecisao" name="motivo" rows={3} required />
          </div>
          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Confirmar decisão"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GerarDocumentoButton({ escalonamentoId }: { escalonamentoId: string }) {
  const [state, formAction, isPending] = useActionState(gerarDocumentoAction, initialState);

  useEffect(() => {
    if (state.success) toast.success("Documento gerado.");
    if (state.error) toast.error(state.error);
  }, [state.success, state.error]);

  return (
    <form action={formAction}>
      <input type="hidden" name="escalonamentoId" value={escalonamentoId} />
      <Button type="submit" size="sm" disabled={isPending}>
        <FileWarning className="h-4 w-4" />
        {isPending ? "Gerando..." : "Gerar documento (PDF)"}
      </Button>
    </form>
  );
}

function RegistrarEnvioEmailButton({ escalonamentoId }: { escalonamentoId: string }) {
  const [state, formAction, isPending] = useActionState(registrarEnvioEmailAction, initialState);

  useEffect(() => {
    if (state.success) toast.success("Notificação enviada por e-mail.");
    if (state.error) toast.error(state.error);
  }, [state.success, state.error]);

  return (
    <form action={formAction}>
      <input type="hidden" name="escalonamentoId" value={escalonamentoId} />
      <Button type="submit" variant="outline" size="sm" disabled={isPending}>
        <Send className="h-4 w-4" />
        {isPending ? "Enviando..." : "Enviar por e-mail"}
      </Button>
    </form>
  );
}

function RegistrarEnvioFisicoDialog({ escalonamentoId }: { escalonamentoId: string }) {
  const [open, setOpen] = useState(false);
  const [canal, setCanal] = useState<string>("correio_ar");
  const [deliveryStatus, setDeliveryStatus] = useState<string>("desconhecido");
  const [state, formAction, isPending] = useActionState(registrarEnvioFisicoAction, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success("Evidência de envio registrada.");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <ShieldCheck className="h-4 w-4" />
            Registrar envio físico
          </Button>
        }
      />
      <DialogContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="escalonamentoId" value={escalonamentoId} />
          <input type="hidden" name="canal" value={canal} />
          <input type="hidden" name="deliveryStatus" value={deliveryStatus} />
          <DialogHeader>
            <DialogTitle>Registrar envio por canal físico</DialogTitle>
            <DialogDescription>
              Pra carta com AR ou protocolo de cartório — anexe o comprovante,
              é a evidência com valor jurídico real.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="canalSelect">Canal *</Label>
            <Select value={canal} onValueChange={(v) => setCanal(v as string)}>
              <SelectTrigger id="canalSelect" className="w-full">
                <SelectValue>
                  {(value: string | null) =>
                    canalEnvioOptions.find((o) => o.value === value)?.label ?? value
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {canalEnvioOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="destinatario">Destinatário/endereço *</Label>
            <Input id="destinatario" name="destinatario" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="deliveryStatusSelect">Status de entrega *</Label>
            <Select value={deliveryStatus} onValueChange={(v) => setDeliveryStatus(v as string)}>
              <SelectTrigger id="deliveryStatusSelect" className="w-full">
                <SelectValue>
                  {(value: string | null) =>
                    deliveryStatusOptions.find((o) => o.value === value)?.label ?? value
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {deliveryStatusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="file">Comprovante (AR, protocolo) *</Label>
            <input
              id="file"
              name="file"
              type="file"
              required
              className="text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-2.5 file:py-1 file:text-sm"
            />
          </div>
          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Enviando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RegistrarResultadoDialog({ escalonamentoId }: { escalonamentoId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    registrarResultadoEscalonamentoAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      toast.success("Resultado registrado.");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm">Registrar resultado</Button>} />
      <DialogContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="escalonamentoId" value={escalonamentoId} />
          <DialogHeader>
            <DialogTitle>Registrar resultado</DialogTitle>
            <DialogDescription>
              Não muda o status da cobrança automaticamente — use &quot;Mudar
              status&quot; depois de decidir o próximo passo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="descricaoResultado">Resultado *</Label>
            <Textarea
              id="descricaoResultado"
              name="descricao"
              rows={3}
              placeholder="Ex.: empresa regularizou após notificação; sem resposta; encaminhado para ação judicial."
              required
            />
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

export function EscalonamentoSection({
  cobrancaId,
  escalonamento,
  eventos,
  documentos,
  envios,
  canManage,
  canApprove,
}: {
  cobrancaId: string;
  escalonamento: EscalonamentoData | null;
  eventos: TimelineItem[];
  documentos: DocumentoEmitidoData[];
  envios: EnvioData[];
  canManage: boolean;
  canApprove: boolean;
}) {
  const podeIniciarNovo = !escalonamento || escalonamento.status === "rejeitada" || escalonamento.status === "concluida";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">
          Escalonamento e notificação extrajudicial
          <span className="ml-2 text-xs font-normal text-muted-foreground">(STG-09)</span>
        </CardTitle>
        {canManage && podeIniciarNovo ? <IniciarEscalonamentoDialog cobrancaId={cobrancaId} /> : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!escalonamento ? (
          <EmptyState
            icon={Gavel}
            title="Nenhum escalonamento em andamento"
            description="Quando a sequência automática de cobrança se esgota sem resultado, a cobrança fica elegível — inicie aqui pra abrir o processo de notificação extrajudicial (exige aprovação do Jurídico antes de qualquer envio)."
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Status:</span>
                <StatusBadge
                  label={STATUS_LABEL[escalonamento.status] ?? escalonamento.status}
                  tone={STATUS_TONE[escalonamento.status] ?? "neutral"}
                />
              </div>
            </div>

            <p className="text-sm">{escalonamento.motivo}</p>

            {escalonamento.motivoDecisao ? (
              <p className="text-sm text-muted-foreground">
                Decisão do Jurídico: {escalonamento.motivoDecisao}
              </p>
            ) : null}

            {canManage ? (
              <div className="flex flex-wrap gap-2">
                {escalonamento.status === "em_revisao" ? (
                  <SubmeterParaAprovacaoButton escalonamentoId={escalonamento.id} />
                ) : null}

                {escalonamento.status === "aguardando_aprovacao" ? (
                  canApprove ? (
                    <DecidirAprovacaoDialog escalonamentoId={escalonamento.id} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Aguardando decisão do papel Jurídico.
                    </p>
                  )
                ) : null}

                {escalonamento.status === "aprovada" ? (
                  <GerarDocumentoButton escalonamentoId={escalonamento.id} />
                ) : null}

                {escalonamento.status === "documento_emitido" || escalonamento.status === "enviada" ? (
                  <>
                    <RegistrarEnvioEmailButton escalonamentoId={escalonamento.id} />
                    <RegistrarEnvioFisicoDialog escalonamentoId={escalonamento.id} />
                  </>
                ) : null}

                {escalonamento.status === "enviada" ? (
                  <RegistrarResultadoDialog escalonamentoId={escalonamento.id} />
                ) : null}
              </div>
            ) : null}

            {documentos.length > 0 ? (
              <div>
                <h3 className="mb-2 text-xs font-medium text-muted-foreground">Documentos emitidos</h3>
                <ul className="flex flex-col gap-2">
                  {documentos.map((doc) => (
                    <li
                      key={doc.id}
                      className="flex items-center justify-between gap-3 border-b pb-2 text-sm last:border-b-0 last:pb-0"
                    >
                      <div className="flex flex-col">
                        <span>{doc.nomeArquivo}</span>
                        <span className="text-xs text-muted-foreground">
                          Template v{doc.templateVersao} · {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      {doc.url ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          nativeButton={false}
                          aria-label={`Baixar ${doc.nomeArquivo}`}
                          render={
                            <a href={doc.url} target="_blank" rel="noreferrer" download>
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

            {envios.length > 0 ? (
              <div>
                <h3 className="mb-2 text-xs font-medium text-muted-foreground">Evidências de envio</h3>
                <ul className="flex flex-col gap-2">
                  {envios.map((envio) => (
                    <li
                      key={envio.id}
                      className="flex items-center justify-between gap-3 border-b pb-2 text-sm last:border-b-0 last:pb-0"
                    >
                      <div className="flex flex-col">
                        <span>
                          {CANAL_LABEL[envio.canal] ?? envio.canal} → {envio.destinatario}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {DELIVERY_LABEL[envio.deliveryStatus] ?? envio.deliveryStatus}
                          {envio.erro ? ` · ${envio.erro}` : ""} ·{" "}
                          {new Date(envio.enviadoEm).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      {envio.comprovanteUrl ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          nativeButton={false}
                          aria-label={`Baixar comprovante de envio para ${envio.destinatario}`}
                          render={
                            <a href={envio.comprovanteUrl} target="_blank" rel="noreferrer" download>
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
              <h3 className="mb-2 text-xs font-medium text-muted-foreground">Histórico do escalonamento</h3>
              <Timeline items={eventos} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
