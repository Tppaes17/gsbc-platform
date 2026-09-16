import { z } from "zod";
import { cnpjDisplayPattern, formatCnpj } from "@/lib/cnpj/cnpj";

export const promoverProspectoSchema = z.object({
  dossieId: z.string().guid(),
  tenantId: z.string().guid("Selecione um sindicato válido."),
  razaoSocial: z.string().trim().min(3, "Informe a razão social completa."),
  nomeFantasia: z.string().trim().optional(),
  cnae: z.string().trim().optional(),
  segmento: z.string().trim().optional(),
  enquadramento: z.string().trim().optional(),
});

export type PromoverProspectoInput = z.infer<typeof promoverProspectoSchema>;

export function formatarCnpj(cnpj: string): string {
  return formatCnpj(cnpj);
}

export const cnpjFormatadoPattern = cnpjDisplayPattern;
