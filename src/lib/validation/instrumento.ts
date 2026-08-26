import { z } from "zod";

export const instrumentoTipoOptions = [
  { value: "cct", label: "CCT — Convenção Coletiva de Trabalho" },
  { value: "act", label: "ACT — Acordo Coletivo de Trabalho" },
  { value: "termo_aditivo", label: "Termo Aditivo" },
  { value: "outro", label: "Outro" },
] as const;

export const createInstrumentoSchema = z.object({
  tenantId: z.string().guid("Selecione um sindicato válido."),
  empresaId: z.string().guid().optional().or(z.literal("")),
  tipo: z.enum(["cct", "act", "termo_aditivo", "outro"]),
  numero: z.string().trim().optional(),
  titulo: z.string().trim().min(3, "Informe o título do instrumento."),
  dataBase: z.string().trim().optional().or(z.literal("")),
  vigenciaInicio: z.string().trim().optional().or(z.literal("")),
  vigenciaFim: z.string().trim().optional().or(z.literal("")),
  origem: z.string().trim().optional(),
});

export type CreateInstrumentoInput = z.infer<typeof createInstrumentoSchema>;

export const updateInstrumentoSchema = createInstrumentoSchema
  .omit({ tenantId: true })
  .extend({
    instrumentoId: z.string().guid(),
    status: z.enum(["draft", "active", "expired", "revoked"]),
  });

export type UpdateInstrumentoInput = z.infer<typeof updateInstrumentoSchema>;

export const addClausulaSchema = z.object({
  instrumentoId: z.string().guid(),
  numero: z.string().trim().optional(),
  titulo: z.string().trim().min(2, "Informe o título da cláusula."),
  texto: z.string().trim().optional(),
});

export type AddClausulaInput = z.infer<typeof addClausulaSchema>;

export const addObrigacaoSchema = z.object({
  instrumentoId: z.string().guid(),
  clausulaId: z.string().guid().optional().or(z.literal("")),
  empresaId: z.string().guid("Selecione uma empresa válida."),
  fundamento: z.string().trim().optional(),
  descricao: z.string().trim().min(3, "Descreva a obrigação."),
  periodicidade: z.enum(["unica", "mensal", "anual", "outra"]),
  periodoInicio: z.string().trim().optional().or(z.literal("")),
  periodoFim: z.string().trim().optional().or(z.literal("")),
  vencimento: z.string().trim().optional().or(z.literal("")),
  valorReferencia: z.string().trim().optional().or(z.literal("")),
});

export type AddObrigacaoInput = z.infer<typeof addObrigacaoSchema>;
