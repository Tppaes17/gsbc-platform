import { z } from "zod";

export const negociacaoStatusOptions = [
  { value: "aberta", label: "Aberta" },
  { value: "em_negociacao", label: "Em negociação" },
  { value: "aceita", label: "Aceita" },
  { value: "aguardando_aprovacao", label: "Aguardando aprovação (desconto)" },
  { value: "recusada", label: "Recusada" },
  { value: "encerrada", label: "Encerrada" },
] as const;

export const negociacaoEventoTipoOptions = [
  { value: "proposta_gsbc", label: "Proposta da GSBC" },
  { value: "contraproposta_empresa", label: "Contraproposta da empresa" },
  { value: "aceite", label: "Aceite" },
  { value: "recusa", label: "Recusa" },
  { value: "observacao", label: "Observação" },
] as const;

const tipoValues = [
  "proposta_gsbc",
  "contraproposta_empresa",
  "aceite",
  "recusa",
  "observacao",
] as const;

function parseCurrency(value: string) {
  return Number.parseFloat(value.replace(/\./g, "").replace(",", "."));
}

export const createNegociacaoSchema = z.object({
  cobrancaId: z.string().guid("Selecione uma cobrança válida."),
  responsavelId: z.string().guid().optional().or(z.literal("")),
});

export type CreateNegociacaoInput = z.infer<typeof createNegociacaoSchema>;

export const registerEventoSchema = z.object({
  negociacaoId: z.string().guid(),
  tipo: z.enum(tipoValues),
  valor: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || !Number.isNaN(parseCurrency(v)), "Valor inválido."),
  condicoes: z.string().trim().optional().or(z.literal("")),
});

export type RegisterEventoInput = z.infer<typeof registerEventoSchema>;

export { parseCurrency };
