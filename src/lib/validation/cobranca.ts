import { z } from "zod";

export const cobrancaStatusOptions = [
  { value: "draft", label: "Rascunho" },
  { value: "pending_validation", label: "Aguardando validação" },
  { value: "approved", label: "Aprovada" },
  { value: "notified", label: "Notificada" },
  { value: "contacted", label: "Em contato" },
  { value: "negotiating", label: "Em negociação" },
  { value: "agreement_reached", label: "Acordo firmado" },
  { value: "partially_paid", label: "Parcialmente paga" },
  { value: "paid", label: "Paga" },
  { value: "overdue", label: "Vencida" },
  { value: "suspended", label: "Suspensa" },
  { value: "cancelled", label: "Cancelada" },
  { value: "legal_escalation", label: "Escalada jurídica" },
  { value: "closed", label: "Encerrada" },
] as const;

export const cobrancaPrioridadeOptions = [
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
] as const;

const statusValues = ["draft", "pending_validation", "approved", "notified",
  "contacted", "negotiating", "agreement_reached", "partially_paid", "paid",
  "overdue", "suspended", "cancelled", "legal_escalation", "closed",
] as const;
const prioridadeValues = ["low", "medium", "high"] as const;

function parseCurrency(value: string) {
  return Number.parseFloat(value.replace(/\./g, "").replace(",", "."));
}

export const createCobrancaSchema = z.object({
  obrigacaoId: z.string().guid("Selecione uma obrigação válida."),
  valorPrincipal: z
    .string()
    .trim()
    .min(1, "Informe o valor principal.")
    .refine((v) => !Number.isNaN(parseCurrency(v)), "Valor inválido."),
  vencimento: z.string().trim().optional().or(z.literal("")),
  prioridade: z.enum(prioridadeValues),
  responsavelId: z.string().guid().optional().or(z.literal("")),
});

export type CreateCobrancaInput = z.infer<typeof createCobrancaSchema>;

export const updateCobrancaSchema = z.object({
  cobrancaId: z.string().guid(),
  valorAtualizacao: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => !v || !Number.isNaN(parseCurrency(v)),
      "Valor inválido.",
    ),
  vencimento: z.string().trim().optional().or(z.literal("")),
  prioridade: z.enum(prioridadeValues),
  responsavelId: z.string().guid().optional().or(z.literal("")),
});

export type UpdateCobrancaInput = z.infer<typeof updateCobrancaSchema>;

export const changeStatusSchema = z.object({
  cobrancaId: z.string().guid(),
  newStatus: z.enum(statusValues),
  reason: z.string().trim().min(3, "Descreva o motivo da mudança de status."),
});

export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;

export { parseCurrency };
