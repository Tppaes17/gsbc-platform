import { z } from "zod";

const cnpjPattern = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;

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

export function formatarCnpj(cnpjDigitos: string): string {
  return cnpjDigitos.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

export const cnpjFormatadoPattern = cnpjPattern;
