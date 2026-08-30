import { z } from "zod";
import { parseCurrency } from "./pagamento";

function parsePercent(value: string) {
  return Number.parseFloat(value.replace(",", "."));
}

function percentSumIsValid(...values: string[]) {
  const total = values.reduce((sum, value) => sum + parsePercent(value), 0);
  return Math.abs(total - 100) < 0.0001;
}

const percentField = z
  .string()
  .trim()
  .min(1, "Informe o percentual.")
  .refine((v) => !Number.isNaN(parsePercent(v)), "Percentual inválido.")
  .refine((v) => parsePercent(v) >= 0 && parsePercent(v) <= 100, "Percentual deve ficar entre 0 e 100.");

const moneyField = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((v) => !v || (!Number.isNaN(parseCurrency(v)) && parseCurrency(v) >= 0), "Valor inválido.");

export const createFinancialContractSchema = z.object({
  sindicatoId: z.string().guid(),
  titulo: z.string().trim().min(3, "Informe um título para o contrato."),
  vigenciaInicio: z.string().trim().min(1, "Informe o início da vigência."),
  vigenciaFim: z.string().trim().optional().or(z.literal("")),
  observacao: z.string().trim().optional().or(z.literal("")),
});

export const createFinancialSplitRuleSchema = z
  .object({
    contractId: z.string().guid(),
    effectiveFrom: z.string().trim().min(1, "Informe o início da regra."),
    gsbcPercent: percentField,
    sindicatoPercent: percentField,
    terceirosPercent: percentField,
    providerFeePercent: percentField,
    providerFeeFixed: moneyField,
    observacao: z.string().trim().optional().or(z.literal("")),
  })
  .refine(
    (data) => percentSumIsValid(data.gsbcPercent, data.sindicatoPercent, data.terceirosPercent),
    "Os percentuais de GSBC, sindicato e terceiros devem somar 100.",
  );

export type CreateFinancialContractInput = z.infer<typeof createFinancialContractSchema>;
export type CreateFinancialSplitRuleInput = z.infer<typeof createFinancialSplitRuleSchema>;

export { parsePercent };
