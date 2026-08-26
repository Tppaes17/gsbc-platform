import { z } from "zod";

export const documentoCategoriaOptions = [
  { value: "instrumento", label: "Instrumento" },
  { value: "notificacao", label: "Notificação" },
  { value: "acordo", label: "Acordo" },
  { value: "comprovante", label: "Comprovante" },
  { value: "outro", label: "Outro" },
] as const;

const categoriaValues = [
  "instrumento",
  "notificacao",
  "acordo",
  "comprovante",
  "outro",
] as const;

export const MAX_DOCUMENTO_SIZE_BYTES = 50 * 1024 * 1024;

export const uploadDocumentoSchema = z.object({
  empresaId: z.string().guid(),
  categoria: z.enum(categoriaValues),
});

export type UploadDocumentoInput = z.infer<typeof uploadDocumentoSchema>;
