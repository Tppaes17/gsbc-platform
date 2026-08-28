import { cobrancaStatusOptions } from "@/lib/validation/cobranca";

export const CONTESTACAO_EVENTO_LABEL: Record<string, string> = {
  abertura: "Contestação aberta",
  em_analise: "Em análise",
  procedente: "Procedente",
  parcialmente_procedente: "Parcialmente procedente",
  improcedente: "Improcedente",
  inconclusiva: "Inconclusiva",
  observacao: "Observação",
};

export const ESCALONAMENTO_EVENTO_LABEL: Record<string, string> = {
  criacao: "Escalonamento iniciado",
  submissao_aprovacao: "Submetido para aprovação",
  aprovacao: "Aprovado pelo Jurídico",
  rejeicao: "Rejeitado pelo Jurídico",
  documento_emitido: "Documento emitido",
  envio: "Envio registrado",
  resultado: "Resultado registrado",
  observacao: "Observação",
};

// 'contestada' não entra em cobrancaStatusOptions de propósito — só é
// alcançável via abrir_contestacao() (garante que sempre existe uma
// contestação/evidência por trás, nunca uma mudança de status "solta").
// Aqui é só pra exibir o rótulo quando a cobrança já estiver nesse status.
export const STATUS_LABEL: Record<string, string> = {
  ...Object.fromEntries(cobrancaStatusOptions.map((o) => [o.value, o.label])),
  contestada: "Contestada",
};

export const STATUS_TONE: Record<string, "positive" | "neutral" | "warning" | "negative" | "info"> = {
  draft: "neutral",
  pending_validation: "info",
  approved: "info",
  notified: "info",
  contacted: "info",
  negotiating: "warning",
  agreement_reached: "positive",
  partially_paid: "warning",
  paid: "positive",
  overdue: "negative",
  suspended: "neutral",
  cancelled: "neutral",
  legal_escalation: "negative",
  closed: "neutral",
  contestada: "negative",
};

export function statusLabel(status: string) {
  return STATUS_LABEL[status] ?? status;
}
