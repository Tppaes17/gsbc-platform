import { z } from "zod";

export const formaPagamentoOptions = [
  { value: "pix", label: "Pix" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência" },
  { value: "outro", label: "Outro" },
] as const;

const formaPagamentoValues = ["pix", "boleto", "transferencia", "outro"] as const;

function parseCurrency(value: string) {
  return Number.parseFloat(value.replace(/\./g, "").replace(",", "."));
}

export const registerPagamentoSchema = z.object({
  cobrancaId: z.string().guid(),
  valor: z
    .string()
    .trim()
    .min(1, "Informe o valor pago.")
    .refine((v) => !Number.isNaN(parseCurrency(v)) && parseCurrency(v) > 0, "Valor inválido."),
  dataPagamento: z.string().trim().min(1, "Informe a data do pagamento."),
  formaPagamento: z.enum(formaPagamentoValues),
  observacao: z.string().trim().optional().or(z.literal("")),
});

export type RegisterPagamentoInput = z.infer<typeof registerPagamentoSchema>;

export { parseCurrency };
