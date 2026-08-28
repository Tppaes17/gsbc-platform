import { z } from "zod";

export const documentoCategoriaOptions = [
  { value: "instrumento", label: "Instrumento" },
  { value: "notificacao", label: "Notificação" },
  { value: "acordo", label: "Acordo" },
  { value: "comprovante", label: "Comprovante" },
  { value: "contestacao", label: "Contestação" },
  { value: "outro", label: "Outro" },
] as const;

const categoriaValues = [
  "instrumento",
  "notificacao",
  "acordo",
  "comprovante",
  "contestacao",
  "outro",
] as const;

export const MAX_DOCUMENTO_SIZE_BYTES = 50 * 1024 * 1024;

export const DOCUMENTO_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

const DOCUMENTO_ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".txt",
  ".csv",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
]);

export const DOCUMENTO_ACCEPT = DOCUMENTO_ALLOWED_MIME_TYPES.join(",");

export function isAllowedDocumentoFile(file: File): boolean {
  if (DOCUMENTO_ALLOWED_MIME_TYPES.includes(file.type as (typeof DOCUMENTO_ALLOWED_MIME_TYPES)[number])) {
    return true;
  }

  const lastDot = file.name.lastIndexOf(".");
  if (lastDot === -1) return false;

  return DOCUMENTO_ALLOWED_EXTENSIONS.has(file.name.slice(lastDot).toLowerCase());
}

export const uploadDocumentoSchema = z.object({
  empresaId: z.string().guid(),
  categoria: z.enum(categoriaValues),
});

export type UploadDocumentoInput = z.infer<typeof uploadDocumentoSchema>;
