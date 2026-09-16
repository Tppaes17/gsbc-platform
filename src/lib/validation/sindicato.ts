import { z } from "zod";
import { formatCnpj, isValidCnpj } from "@/lib/cnpj/cnpj";

const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const cnpjSchema = z
  .string()
  .trim()
  .refine(
    isValidCnpj,
    "CNPJ inválido. Informe 12 caracteres alfanuméricos e 2 dígitos verificadores.",
  )
  .transform(formatCnpj);

export const createSindicatoSchema = z.object({
  razaoSocial: z.string().trim().min(3, "Informe a razão social completa."),
  nomeFantasia: z.string().trim().optional(),
  cnpj: cnpjSchema,
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
