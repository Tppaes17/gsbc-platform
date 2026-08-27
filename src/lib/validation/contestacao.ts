import { z } from "zod";
import { parseCurrency } from "./cobranca";

export const contestacaoTipoOptions = [
  { value: "enquadramento", label: "Enquadramento" },
  { value: "aplicabilidade", label: "Aplicabilidade" },
  { value: "pagamento_ja_realizado", label: "Pagamento já realizado" },
  { value: "base_calculo", label: "Base de cálculo" },
  { value: "quantidade_empregados", label: "Quantidade de empregados" },
  { value: "valor", label: "Valor" },
  { value: "periodo", label: "Período" },
  { value: "dados_cadastrais", label: "Dados cadastrais" },
  { value: "outros", label: "Outros" },
] as const;

const tipoValues = contestacaoTipoOptions.map((o) => o.value) as [string, ...string[]];

export const resultadoOptions = [
  { value: "em_analise", label: "Colocar em análise" },
  { value: "procedente", label: "Procedente" },
  { value: "parcialmente_procedente", label: "Parcialmente procedente" },
  { value: "improcedente", label: "Improcedente" },
  { value: "inconclusiva", label: "Inconclusiva" },
] as const;

const resultadoValues = resultadoOptions.map((o) => o.value) as [string, ...string[]];

export const abrirContestacaoSchema = z.object({
  cobrancaId: z.string().guid(),
  tipo: z.enum(tipoValues),
  motivo: z.string().trim().min(10, "Descreva o motivo da contestação (mínimo 10 caracteres)."),
  valorAlegado: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || !Number.isNaN(parseCurrency(v)), "Valor inválido."),
});

export type AbrirContestacaoInput = z.infer<typeof abrirContestacaoSchema>;

export const registrarResultadoSchema = z.object({
  contestacaoId: z.string().guid(),
  tipo: z.enum(resultadoValues),
  descricao: z.string().trim().min(3, "Descreva o fundamento da decisão."),
  valor: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || !Number.isNaN(parseCurrency(v)), "Valor inválido."),
});

export type RegistrarResultadoInput = z.infer<typeof registrarResultadoSchema>;

export const adicionarComentarioSchema = z.object({
  contestacaoId: z.string().guid(),
  comentario: z.string().trim().min(3, "Escreva um comentário."),
  fundamento: z.string().trim().optional().or(z.literal("")),
});

export type AdicionarComentarioInput = z.infer<typeof adicionarComentarioSchema>;
