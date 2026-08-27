"use server";

import { revalidatePath } from "next/cache";
import { logAuditEvent } from "@/lib/audit/log";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { MAX_DOCUMENTO_SIZE_BYTES } from "@/lib/validation/documento";
import {
  abrirContestacaoSchema,
  adicionarComentarioSchema,
  registrarResultadoSchema,
} from "@/lib/validation/contestacao";
import { parseCurrency } from "@/lib/validation/cobranca";

export interface ContestacaoActionState {
  error: string | null;
  success: boolean;
}

const BUCKET = "documentos-empresas";

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
}

export async function abrirContestacaoAction(
  _prevState: ContestacaoActionState,
  formData: FormData,
): Promise<ContestacaoActionState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return { error: "Apenas a equipe GSBC pode registrar uma contestação.", success: false };
  }

  const parsed = abrirContestacaoSchema.safeParse({
    cobrancaId: formData.get("cobrancaId"),
    tipo: formData.get("tipo"),
    motivo: formData.get("motivo"),
    valorAlegado: formData.get("valorAlegado") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", success: false };
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { data: contestacaoId, error } = await supabase.rpc("abrir_contestacao", {
    p_cobranca_id: input.cobrancaId,
    p_tipo: input.tipo,
    p_motivo: input.motivo,
    p_valor_alegado: input.valorAlegado ? parseCurrency(input.valorAlegado) : null,
  });

  if (error || !contestacaoId) {
    if (error?.message.includes("Já existe uma contestação em aberto")) {
      return { error: "Já existe uma contestação em aberto para esta cobrança.", success: false };
    }
    return { error: "Não foi possível abrir a contestação.", success: false };
  }

  const { data: cobranca } = await supabase
    .from("cobrancas")
    .select("tenant_id")
    .eq("id", input.cobrancaId)
    .single();

  await logAuditEvent({
    tenantId: cobranca?.tenant_id ?? null,
    action: "contestacao.aberta",
    entityType: "contestacao",
    entityId: contestacaoId,
    newData: { cobranca_id: input.cobrancaId, tipo: input.tipo },
  });

  revalidatePath(`/backoffice/cobrancas/${input.cobrancaId}`);
  return { error: null, success: true };
}

export async function registrarResultadoContestacaoAction(
  _prevState: ContestacaoActionState,
  formData: FormData,
): Promise<ContestacaoActionState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return { error: "Apenas a equipe GSBC pode registrar o resultado da contestação.", success: false };
  }

  const parsed = registrarResultadoSchema.safeParse({
    contestacaoId: formData.get("contestacaoId"),
    tipo: formData.get("tipo"),
    descricao: formData.get("descricao"),
    valor: formData.get("valor") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", success: false };
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { data: contestacao } = await supabase
    .from("contestacoes")
    .select("tenant_id, cobranca_id")
    .eq("id", input.contestacaoId)
    .single();

  if (!contestacao) {
    return { error: "Contestação não encontrada.", success: false };
  }

  const { error } = await supabase.rpc("register_contestacao_evento", {
    p_contestacao_id: input.contestacaoId,
    p_tipo: input.tipo,
    p_descricao: input.descricao,
    p_valor: input.valor ? parseCurrency(input.valor) : null,
  });

  if (error) {
    return { error: "Não foi possível registrar o resultado.", success: false };
  }

  await logAuditEvent({
    tenantId: contestacao.tenant_id,
    action: "contestacao.evento_registrado",
    entityType: "contestacao",
    entityId: input.contestacaoId,
    newData: { tipo: input.tipo },
  });

  revalidatePath(`/backoffice/cobrancas/${contestacao.cobranca_id}`);
  return { error: null, success: true };
}

export async function adicionarComentarioEvidenciaAction(
  _prevState: ContestacaoActionState,
  formData: FormData,
): Promise<ContestacaoActionState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return { error: "Apenas a equipe GSBC pode adicionar evidências.", success: false };
  }

  const parsed = adicionarComentarioSchema.safeParse({
    contestacaoId: formData.get("contestacaoId"),
    comentario: formData.get("comentario"),
    fundamento: formData.get("fundamento") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", success: false };
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { data: contestacao } = await supabase
    .from("contestacoes")
    .select("cobranca_id")
    .eq("id", input.contestacaoId)
    .single();

  if (!contestacao) {
    return { error: "Contestação não encontrada.", success: false };
  }

  const { error } = await supabase.from("contestacao_evidencias").insert({
    contestacao_id: input.contestacaoId,
    tipo: "comentario",
    comentario: input.comentario,
    fundamento: input.fundamento || null,
    user_id: user.id,
  });

  if (error) {
    return { error: "Não foi possível adicionar o comentário.", success: false };
  }

  revalidatePath(`/backoffice/cobrancas/${contestacao.cobranca_id}`);
  return { error: null, success: true };
}

export async function adicionarDocumentoEvidenciaAction(
  _prevState: ContestacaoActionState,
  formData: FormData,
): Promise<ContestacaoActionState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return { error: "Apenas a equipe GSBC pode adicionar evidências.", success: false };
  }

  const contestacaoId = formData.get("contestacaoId");
  if (typeof contestacaoId !== "string" || !contestacaoId) {
    return { error: "Contestação inválida.", success: false };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo.", success: false };
  }
  if (file.size > MAX_DOCUMENTO_SIZE_BYTES) {
    return { error: "Arquivo maior que o limite de 50MB.", success: false };
  }

  const supabase = await createClient();

  const { data: contestacao } = await supabase
    .from("contestacoes")
    .select("tenant_id, empresa_id, cobranca_id")
    .eq("id", contestacaoId)
    .single();

  if (!contestacao) {
    return { error: "Contestação não encontrada.", success: false };
  }

  const storagePath = `${contestacao.empresa_id}/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: file.type || undefined });

  if (uploadError) {
    return { error: "Não foi possível enviar o arquivo.", success: false };
  }

  const { data: documento, error: documentoError } = await supabase
    .from("documentos")
    .insert({
      tenant_id: contestacao.tenant_id,
      empresa_id: contestacao.empresa_id,
      storage_path: storagePath,
      nome_arquivo: file.name,
      categoria: "contestacao",
      tamanho_bytes: file.size,
      uploaded_by: user.id,
    })
    .select("id")
    .single();

  if (documentoError || !documento) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return { error: "Não foi possível registrar o documento.", success: false };
  }

  const fundamento = formData.get("fundamento");
  const { error: evidenciaError } = await supabase.from("contestacao_evidencias").insert({
    contestacao_id: contestacaoId,
    tipo: "documento",
    documento_id: documento.id,
    fundamento: typeof fundamento === "string" && fundamento ? fundamento : null,
    user_id: user.id,
  });

  if (evidenciaError) {
    return { error: "Documento enviado, mas não foi possível vinculá-lo à contestação.", success: false };
  }

  revalidatePath(`/backoffice/cobrancas/${contestacao.cobranca_id}`);
  return { error: null, success: true };
}
