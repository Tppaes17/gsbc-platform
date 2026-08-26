import { z } from "zod";

const cnpjPattern = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const createSindicatoSchema = z.object({
  razaoSocial: z.string().trim().min(3, "Informe a razão social completa."),
  nomeFantasia: z.string().trim().optional(),
  cnpj: z
    .string()
    .trim()
    .regex(cnpjPattern, "CNPJ deve estar no formato 00.000.000/0000-00."),
  slug: z
    .string()
    .trim()
    .min(3, "O identificador precisa ter ao menos 3 caracteres.")
    .regex(
      slugPattern,
      "Use apenas letras minúsculas, números e hífen (ex.: sindicato-comercio-sp).",
    ),
  categoria: z.string().trim().optional(),
  baseTerritorial: z.string().trim().optional(),
  emailInstitucional: z
    .string()
    .trim()
    .email("E-mail institucional inválido.")
    .optional()
    .or(z.literal("")),
  telefone: z.string().trim().optional(),
});

export type CreateSindicatoInput = z.infer<typeof createSindicatoSchema>;

export const updateSindicatoSchema = createSindicatoSchema
  .omit({ slug: true })
  .extend({
    // .guid(), não .uuid() — ver comentário em lib/validation/membership.ts.
    tenantId: z.string().guid(),
  });

export type UpdateSindicatoInput = z.infer<typeof updateSindicatoSchema>;
