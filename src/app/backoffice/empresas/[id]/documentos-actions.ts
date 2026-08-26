"use server";

import { revalidatePath } from "next/cache";
import { logAuditEvent } from "@/lib/audit/log";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  MAX_DOCUMENTO_SIZE_BYTES,
  uploadDocumentoSchema,
} from "@/lib/validation/documento";

export interface DocumentoActionState {
  error: string | null;
  success: boolean;
}

const BUCKET = "documentos-empresas";

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
}

export async function uploadDocumentoAction(
  _prevState: DocumentoActionState,
  formData: FormData,
): Promise<DocumentoActionState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return { error: "Apenas a equipe GSBC pode enviar documentos.", success: false };
  }

  const parsed = uploadDocumentoSchema.safeParse({
    empresaId: formData.get("empresaId"),
    categoria: formData.get("categoria"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      success: false,
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo.", success: false };
  }
  if (file.size > MAX_DOCUMENTO_SIZE_BYTES) {
    return { error: "Arquivo maior que o limite de 50MB.", success: false };
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { data: empresa } = await supabase
    .from("empresas")
    .select("tenant_id")
    .eq("id", input.empresaId)
    .single();

  if (!empresa) {
    return { error: "Empresa não encontrada.", success: false };
  }

  const storagePath = `${input.empresaId}/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: file.type || undefined });

  if (uploadError) {
    return { error: "Não foi possível enviar o arquivo.", success: false };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("documentos")
    .insert({
      tenant_id: empresa.tenant_id,
      empresa_id: input.empresaId,
      storage_path: storagePath,
      nome_arquivo: file.name,
      categoria: input.categoria,
      tamanho_bytes: file.size,
      uploaded_by: user.id,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return { error: "Não foi possível registrar o documento.", success: false };
  }

  await logAuditEvent({
    tenantId: empresa.tenant_id,
    action: "documento.enviado",
    entityType: "documento",
    entityId: inserted.id,
    newData: { empresa_id: input.empresaId, nome_arquivo: file.name, categoria: input.categoria },
  });

  revalidatePath(`/backoffice/empresas/${input.empresaId}`);
  return { error: null, success: true };
}

export async function deleteDocumentoAction(documentoId: string) {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    throw new Error("Apenas a equipe GSBC pode remover documentos.");
  }

  const supabase = await createClient();

  const { data: documento } = await supabase
    .from("documentos")
    .select("tenant_id, empresa_id, storage_path, nome_arquivo")
    .eq("id", documentoId)
    .single();

  if (!documento) {
    throw new Error("Documento não encontrado.");
  }

  await supabase.storage.from(BUCKET).remove([documento.storage_path]);

  const { error } = await supabase.from("documentos").delete().eq("id", documentoId);

  if (error) {
    throw new Error("Não foi possível remover o documento.");
  }

  await logAuditEvent({
    tenantId: documento.tenant_id,
    action: "documento.removido",
    entityType: "documento",
    entityId: documentoId,
    oldData: { nome_arquivo: documento.nome_arquivo },
  });

  revalidatePath(`/backoffice/empresas/${documento.empresa_id}`);
}
