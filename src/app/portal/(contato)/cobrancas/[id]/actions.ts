"use server";

import { revalidatePath } from "next/cache";
import { logAuditEvent } from "@/lib/audit/log";
import { requireCurrentPortalContato } from "@/lib/auth/portal-session";
import { createClient } from "@/lib/supabase/server";
import { MAX_DOCUMENTO_SIZE_BYTES } from "@/lib/validation/documento";
import { abrirContestacaoSchema, adicionarComentarioSchema } from "@/lib/validation/contestacao";
import { parseCurrency } from "@/lib/validation/cobranca";
import { z } from "zod";

export interface PortalActionState {
  error: string | null;
  success: boolean;
}

const BUCKET = "documentos-empresas";

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
}

/**
 * Toda action aqui é gated por requireCurrentPortalContato() — mas quem
 * de fato decide o que a empresa pode ver/escrever é o RLS aditivo
 * (migration 0023, is_empresa_contato()). Este arquivo nunca confia só na
 * própria checagem de aplicação (regra 2 do AGENTS.md).
 */

export async function abrirContestacaoPortalAction(
  _prevState: PortalActionState,
  formData: FormData,
): Promise<PortalActionState> {
  const contato = await requireCurrentPortalContato();

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

  await logAuditEvent({
    tenantId: contato.tenantId,
    action: "portal.contestacao.aberta",
    entityType: "contestacao",
    entityId: contestacaoId,
    newData: { cobranca_id: input.cobrancaId, tipo: input.tipo, por: "empresa" },
  });

  revalidatePath(`/portal/cobrancas/${input.cobrancaId}`);
  return { error: null, success: true };
}

export async function adicionarComentarioEvidenciaPortalAction(
  _prevState: PortalActionState,
  formData: FormData,
): Promise<PortalActionState> {
  await requireCurrentPortalContato();

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
  });

  if (error) {
    return { error: "Não foi possível adicionar o comentário.", success: false };
  }

  revalidatePath(`/portal/cobrancas/${contestacao.cobranca_id}`);
  return { error: null, success: true };
}

export async function adicionarDocumentoEvidenciaPortalAction(
  _prevState: PortalActionState,
  formData: FormData,
): Promise<PortalActionState> {
  const contato = await requireCurrentPortalContato();

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
  });

  if (evidenciaError) {
    return { error: "Documento enviado, mas não foi possível vinculá-lo à contestação.", success: false };
  }

  void contato;
  revalidatePath(`/portal/cobrancas/${contestacao.cobranca_id}`);
  return { error: null, success: true };
}

const responderPropostaSchema = z.object({
  negociacaoId: z.string().guid(),
  tipo: z.enum(["contraproposta_empresa", "aceite"]),
  valor: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || !Number.isNaN(parseCurrency(v)), "Valor inválido."),
  condicoes: z.string().trim().optional().or(z.literal("")),
});

export async function responderPropostaPortalAction(
  _prevState: PortalActionState,
  formData: FormData,
): Promise<PortalActionState> {
  await requireCurrentPortalContato();

  const parsed = responderPropostaSchema.safeParse({
    negociacaoId: formData.get("negociacaoId"),
    tipo: formData.get("tipo"),
    valor: formData.get("valor") || undefined,
    condicoes: formData.get("condicoes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", success: false };
  }

  const input = parsed.data;

  if (input.tipo === "contraproposta_empresa" && !input.valor) {
    return { error: "Informe o valor da contraproposta.", success: false };
  }

  const supabase = await createClient();

  const { data: negociacao } = await supabase
    .from("negociacoes")
    .select("cobranca_id")
    .eq("id", input.negociacaoId)
    .single();

  if (!negociacao) {
    return { error: "Negociação não encontrada.", success: false };
  }

  const { error } = await supabase.rpc("register_negociacao_evento", {
    p_negociacao_id: input.negociacaoId,
    p_tipo: input.tipo,
    p_valor: input.valor ? parseCurrency(input.valor) : null,
    p_condicoes: input.condicoes || null,
  });

  if (error) {
    if (error.message.includes("aguardando aprovação de desconto")) {
      return {
        error: "Esta negociação está aguardando aprovação interna da GSBC — aguarde antes de enviar uma nova resposta.",
        success: false,
      };
    }
    return { error: "Não foi possível registrar sua resposta.", success: false };
  }

  // Diferente da negociação registrada por staff (src/app/backoffice/
  // negociacoes/actions.ts), o aceite pelo portal NÃO muda o status da
  // cobrança sozinho — fica registrado no histórico da negociação
  // (negociacoes.status -> 'aceita'), e um humano da GSBC confirma o
  // acordo depois via "Mudar status". Mesmo princípio de "estado
  // consequente fica com humano" já usado no resultado de contestação
  // (Rodada 21) — aqui ainda mais estrito, porque é a própria contraparte
  // (não a GSBC) quem está afirmando o aceite.

  revalidatePath(`/portal/cobrancas/${negociacao.cobranca_id}`);
  return { error: null, success: true };
}
