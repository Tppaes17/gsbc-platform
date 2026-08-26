import { z } from "zod";

const cnpjPattern = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;

export const createEmpresaSchema = z.object({
  tenantId: z.string().guid("Selecione um sindicato válido."),
  razaoSocial: z.string().trim().min(3, "Informe a razão social completa."),
  nomeFantasia: z.string().trim().optional(),
  cnpj: z
    .string()
    .trim()
    .regex(cnpjPattern, "CNPJ deve estar no formato 00.000.000/0000-00."),
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
