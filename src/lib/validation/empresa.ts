import { z } from "zod";
import { formatCnpj, isValidCnpj } from "@/lib/cnpj/cnpj";

const cnpjSchema = z
  .string()
  .trim()
  .refine(
    isValidCnpj,
    "CNPJ inválido. Informe 12 caracteres alfanuméricos e 2 dígitos verificadores.",
  )
  .transform(formatCnpj);

export const createEmpresaSchema = z.object({
  tenantId: z.string().guid("Selecione um sindicato válido."),
  razaoSocial: z.string().trim().min(3, "Informe a razão social completa."),
  nomeFantasia: z.string().trim().optional(),
  cnpj: cnpjSchema,
  cnae: z.string().trim().optional(),
  segmento: z.string().trim().optional(),
  enquadramento: z.string().trim().optional(),
});

export type CreateEmpresaInput = z.infer<typeof createEmpresaSchema>;

export const updateEmpresaSchema = createEmpresaSchema
  .omit({ tenantId: true })
  .extend({
    empresaId: z.string().guid(),
  });

export type UpdateEmpresaInput = z.infer<typeof updateEmpresaSchema>;

export const addEmpresaContatoSchema = z.object({
  empresaId: z.string().guid(),
  nome: z.string().trim().min(2, "Informe o nome do contato."),
  cargo: z.string().trim().optional(),
  email: z
    .string()
    .trim()
    .email("E-mail inválido.")
    .optional()
    .or(z.literal("")),
  telefone: z.string().trim().optional(),
  principal: z.boolean().optional(),
});

export type AddEmpresaContatoInput = z.infer<typeof addEmpresaContatoSchema>;
