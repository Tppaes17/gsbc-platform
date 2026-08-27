"use server";

import { revalidatePath } from "next/cache";
import { logAuditEvent } from "@/lib/audit/log";
import { requireCurrentUser } from "@/lib/auth/session";
import { isEscalationApprover } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { MAX_DOCUMENTO_SIZE_BYTES } from "@/lib/validation/documento";
import {
  decidirAprovacaoSchema,
  iniciarEscalonamentoSchema,
  registrarEnvioFisicoSchema,
  registrarResultadoEscalonamentoSchema,
} from "@/lib/validation/escalonamento";
import { gerarNotificacaoExtrajudicialPdf, TEMPLATE_VERSAO } from "@/lib/escalonamento/documento-template";

export interface EscalonamentoActionState {
  error: string | null;
  success: boolean;
}

const BUCKET = "documentos-empresas";

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
}

export async function iniciarEscalonamentoAction(
  _prevState: EscalonamentoActionState,
  formData: FormData,
): Promise<EscalonamentoActionState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return { error: "Apenas a equipe GSBC pode iniciar um escalonamento.", success: false };
  }

  const parsed = iniciarEscalonamentoSchema.safeParse({
    cobrancaId: formData.get("cobrancaId"),
    motivo: formData.get("motivo"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", success: false };
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { data: escalonamentoId, error } = await supabase.rpc("iniciar_escalonamento", {
    p_cobranca_id: input.cobrancaId,
    p_motivo: input.motivo,
  });

  if (error || !escalonamentoId) {
    if (error?.message.includes("Já existe um escalonamento em andamento")) {
      return { error: "Já existe um escalonamento em andamento para esta cobrança.", success: false };
    }
    if (error?.message.includes("não é elegível")) {
      return { error: error.message.replace(/^.*ERROR:\s*/, ""), success: false };
    }
    return { error: "Não foi possível iniciar o escalonamento.", success: false };
  }

  const { data: cobranca } = await supabase
    .from("cobrancas")
    .select("tenant_id")
    .eq("id", input.cobrancaId)
    .single();

  await logAuditEvent({
    tenantId: cobranca?.tenant_id ?? null,
    action: "escalonamento.iniciado",
    entityType: "escalonamento",
    entityId: escalonamentoId,
    newData: { cobranca_id: input.cobrancaId },
  });

  revalidatePath(`/backoffice/cobrancas/${input.cobrancaId}`);
  return { error: null, success: true };
}

export async function submeterParaAprovacaoAction(
  _prevState: EscalonamentoActionState,
  formData: FormData,
): Promise<EscalonamentoActionState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return { error: "Apenas a equipe GSBC pode submeter para aprovação.", success: false };
  }

  const escalonamentoId = formData.get("escalonamentoId");
  if (typeof escalonamentoId !== "string" || !escalonamentoId) {
    return { error: "Escalonamento inválido.", success: false };
  }

  const supabase = await createClient();

  const { data: escalonamento } = await supabase
    .from("escalonamentos")
    .select("tenant_id, cobranca_id")
    .eq("id", escalonamentoId)
    .single();

  if (!escalonamento) {
    return { error: "Escalonamento não encontrado.", success: false };
  }

  const { error } = await supabase.rpc("submeter_para_aprovacao", {
    p_escalonamento_id: escalonamentoId,
  });

  if (error) {
    return { error: "Não foi possível submeter para aprovação.", success: false };
  }

  await logAuditEvent({
    tenantId: escalonamento.tenant_id,
    action: "escalonamento.submetido_aprovacao",
    entityType: "escalonamento",
    entityId: escalonamentoId,
  });

  revalidatePath(`/backoffice/cobrancas/${escalonamento.cobranca_id}`);
  return { error: null, success: true };
}

export async function decidirAprovacaoAction(
  _prevState: EscalonamentoActionState,
  formData: FormData,
): Promise<EscalonamentoActionState> {
  const user = await requireCurrentUser();
  if (!isEscalationApprover(user)) {
    return { error: "Apenas o papel Jurídico pode aprovar ou rejeitar um escalonamento.", success: false };
  }

  const parsed = decidirAprovacaoSchema.safeParse({
    escalonamentoId: formData.get("escalonamentoId"),
    aprovado: formData.get("aprovado"),
    motivo: formData.get("motivo"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", success: false };
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { data: escalonamento } = await supabase
    .from("escalonamentos")
    .select("tenant_id, cobranca_id")
    .eq("id", input.escalonamentoId)
    .single();

  if (!escalonamento) {
    return { error: "Escalonamento não encontrado.", success: false };
  }

  const aprovado = input.aprovado === "true";

  const { error } = await supabase.rpc("decidir_aprovacao", {
    p_escalonamento_id: input.escalonamentoId,
    p_aprovado: aprovado,
    p_motivo: input.motivo,
  });

  if (error) {
    return { error: "Não foi possível registrar a decisão.", success: false };
  }

  await logAuditEvent({
    tenantId: escalonamento.tenant_id,
    action: aprovado ? "escalonamento.aprovado" : "escalonamento.rejeitado",
    entityType: "escalonamento",
    entityId: input.escalonamentoId,
    newData: { motivo: input.motivo },
  });

  revalidatePath(`/backoffice/cobrancas/${escalonamento.cobranca_id}`);
  return { error: null, success: true };
}

export async function gerarDocumentoAction(
  _prevState: EscalonamentoActionState,
  formData: FormData,
): Promise<EscalonamentoActionState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return { error: "Apenas a equipe GSBC pode gerar o documento.", success: false };
  }

  const escalonamentoId = formData.get("escalonamentoId");
  if (typeof escalonamentoId !== "string" || !escalonamentoId) {
    return { error: "Escalonamento inválido.", success: false };
  }

  const supabase = await createClient();

  const { data: escalonamento } = await supabase
    .from("escalonamentos")
    .select(
      "tenant_id, empresa_id, cobranca_id, motivo, empresas(razao_social, nome_fantasia, cnpj, endereco), cobrancas(valor_cobranca, vencimento, obrigacoes(descricao)), tenants(name)",
    )
    .eq("id", escalonamentoId)
    .single();

  if (!escalonamento) {
    return { error: "Escalonamento não encontrado.", success: false };
  }

  const empresa = Array.isArray(escalonamento.empresas) ? escalonamento.empresas[0] : escalonamento.empresas;
  const cobranca = Array.isArray(escalonamento.cobrancas) ? escalonamento.cobrancas[0] : escalonamento.cobrancas;
  const tenant = Array.isArray(escalonamento.tenants) ? escalonamento.tenants[0] : escalonamento.tenants;
  const obrigacao = cobranca
    ? Array.isArray(cobranca.obrigacoes)
      ? cobranca.obrigacoes[0]
      : cobranca.obrigacoes
    : null;

  if (!empresa || !cobranca) {
    return { error: "Dados da cobrança/empresa incompletos.", success: false };
  }

  const endereco = empresa.endereco as Record<string, unknown> | null;
  const enderecoTexto = endereco
    ? [endereco.logradouro, endereco.cidade, endereco.uf].filter(Boolean).join(", ") || null
    : null;

  const dadosGeracao = {
    sindicatoNome: tenant?.name ?? "GSBC",
    empresaRazaoSocial: empresa.razao_social,
    empresaCnpj: empresa.cnpj,
    empresaEndereco: enderecoTexto,
    obrigacaoDescricao: obrigacao?.descricao ?? "—",
    valorCobranca: cobranca.valor_cobranca,
    vencimento: cobranca.vencimento,
    motivoEscalonamento: escalonamento.motivo,
    emissorNome: user.fullName,
    emitidoEm: new Date().toISOString(),
    cobrancaId: escalonamento.cobranca_id,
    escalonamentoId,
  };

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await gerarNotificacaoExtrajudicialPdf(dadosGeracao);
  } catch {
    return { error: "Não foi possível gerar o PDF do documento.", success: false };
  }

  const storagePath = `${escalonamento.empresa_id}/notificacao-extrajudicial-${escalonamentoId}-v${TEMPLATE_VERSAO}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, pdfBuffer, { contentType: "application/pdf", upsert: true });

  if (uploadError) {
    return { error: "Não foi possível enviar o documento gerado.", success: false };
  }

  const { data: documento, error: documentoError } = await supabase
    .from("documentos")
    .insert({
      tenant_id: escalonamento.tenant_id,
      empresa_id: escalonamento.empresa_id,
      storage_path: storagePath,
      nome_arquivo: `Notificação extrajudicial — ${empresa.razao_social}.pdf`,
      categoria: "notificacao",
      tamanho_bytes: pdfBuffer.byteLength,
      uploaded_by: user.id,
    })
    .select("id")
    .single();

  if (documentoError || !documento) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return { error: "Não foi possível registrar o documento.", success: false };
  }

  const { error: registroError } = await supabase.rpc("registrar_documento_emitido", {
    p_escalonamento_id: escalonamentoId,
    p_documento_id: documento.id,
    p_template_versao: TEMPLATE_VERSAO,
    p_dados_geracao: dadosGeracao,
  });

  if (registroError) {
    return { error: "Documento gerado, mas não foi possível vinculá-lo ao escalonamento.", success: false };
  }

  await logAuditEvent({
    tenantId: escalonamento.tenant_id,
    action: "escalonamento.documento_emitido",
    entityType: "escalonamento",
    entityId: escalonamentoId,
    newData: { documento_id: documento.id, template_versao: TEMPLATE_VERSAO },
  });

  revalidatePath(`/backoffice/cobrancas/${escalonamento.cobranca_id}`);
  return { error: null, success: true };
}

export async function registrarEnvioEmailAction(
  _prevState: EscalonamentoActionState,
  formData: FormData,
): Promise<EscalonamentoActionState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return { error: "Apenas a equipe GSBC pode registrar um envio.", success: false };
  }

  const escalonamentoId = formData.get("escalonamentoId");
  if (typeof escalonamentoId !== "string" || !escalonamentoId) {
    return { error: "Escalonamento inválido.", success: false };
  }

  const supabase = await createClient();

  const { data: escalonamento } = await supabase
    .from("escalonamentos")
    .select(
      "tenant_id, empresa_id, cobranca_id, cobrancas(vencimento), escalonamento_documentos(documento_id, documentos(storage_path, nome_arquivo))",
    )
    .eq("id", escalonamentoId)
    .single();

  if (!escalonamento) {
    return { error: "Escalonamento não encontrado.", success: false };
  }

  const ultimoDocumento = Array.isArray(escalonamento.escalonamento_documentos)
    ? escalonamento.escalonamento_documentos[escalonamento.escalonamento_documentos.length - 1]
    : escalonamento.escalonamento_documentos;
  const documento = ultimoDocumento
    ? Array.isArray(ultimoDocumento.documentos)
      ? ultimoDocumento.documentos[0]
      : ultimoDocumento.documentos
    : null;

  if (!documento) {
    return { error: "Nenhum documento emitido para este escalonamento ainda.", success: false };
  }

  const { data: contatos } = await supabase
    .from("empresa_contatos")
    .select("email, principal")
    .eq("empresa_id", escalonamento.empresa_id)
    .not("email", "is", null)
    .order("principal", { ascending: false })
    .limit(1);

  const destinatario = contatos?.[0]?.email;
  if (!destinatario) {
    return { error: "Esta empresa não tem um contato com e-mail cadastrado.", success: false };
  }

  const { data: fileData, error: downloadError } = await supabase.storage
    .from(BUCKET)
    .download(documento.storage_path);

  if (downloadError || !fileData) {
    return { error: "Não foi possível recuperar o documento para anexar ao e-mail.", success: false };
  }

  const pdfBuffer = Buffer.from(await fileData.arrayBuffer());

  let sendError: string | null = null;
  try {
    await sendEmail({
      to: destinatario,
      subject: "Notificação extrajudicial de cobrança",
      text: "Segue em anexo notificação extrajudicial referente a pendência financeira. Este é um documento formal — solicitamos atenção ao prazo indicado.",
      html: "<p>Segue em anexo notificação extrajudicial referente a pendência financeira. Este é um documento formal — solicitamos atenção ao prazo indicado.</p>",
      attachments: [{ filename: documento.nome_arquivo, content: pdfBuffer, contentType: "application/pdf" }],
    });
  } catch {
    sendError = "Falha no envio do e-mail (verifique a configuração de SMTP).";
  }

  const { data: envioId, error: registroError } = await supabase.rpc("registrar_envio", {
    p_escalonamento_id: escalonamentoId,
    p_canal: "email",
    p_destinatario: destinatario,
    p_delivery_status: sendError ? "falha" : "entregue",
    p_erro: sendError,
    p_comprovante_documento_id: null,
  });

  if (registroError || !envioId) {
    return { error: "Envio realizado, mas não foi possível registrar a evidência.", success: false };
  }

  await logAuditEvent({
    tenantId: escalonamento.tenant_id,
    action: sendError ? "escalonamento.envio_falhou" : "escalonamento.enviado",
    entityType: "escalonamento",
    entityId: escalonamentoId,
    newData: { canal: "email", destinatario },
  });

  revalidatePath(`/backoffice/cobrancas/${escalonamento.cobranca_id}`);

  if (sendError) {
    return { error: sendError, success: false };
  }
  return { error: null, success: true };
}

export async function registrarEnvioFisicoAction(
  _prevState: EscalonamentoActionState,
  formData: FormData,
): Promise<EscalonamentoActionState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return { error: "Apenas a equipe GSBC pode registrar um envio.", success: false };
  }

  const parsed = registrarEnvioFisicoSchema.safeParse({
    escalonamentoId: formData.get("escalonamentoId"),
    canal: formData.get("canal"),
    destinatario: formData.get("destinatario"),
    deliveryStatus: formData.get("deliveryStatus"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", success: false };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Anexe o comprovante do envio (AR, protocolo de cartório, etc.).", success: false };
  }
  if (file.size > MAX_DOCUMENTO_SIZE_BYTES) {
    return { error: "Arquivo maior que o limite de 50MB.", success: false };
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { data: escalonamento } = await supabase
    .from("escalonamentos")
    .select("tenant_id, empresa_id, cobranca_id")
    .eq("id", input.escalonamentoId)
    .single();

  if (!escalonamento) {
    return { error: "Escalonamento não encontrado.", success: false };
  }

  const storagePath = `${escalonamento.empresa_id}/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: file.type || undefined });

  if (uploadError) {
    return { error: "Não foi possível enviar o comprovante.", success: false };
  }

  const { data: documento, error: documentoError } = await supabase
    .from("documentos")
    .insert({
      tenant_id: escalonamento.tenant_id,
      empresa_id: escalonamento.empresa_id,
      storage_path: storagePath,
      nome_arquivo: file.name,
      categoria: "comprovante",
      tamanho_bytes: file.size,
      uploaded_by: user.id,
    })
    .select("id")
    .single();

  if (documentoError || !documento) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return { error: "Não foi possível registrar o comprovante.", success: false };
  }

  const { data: envioId, error: registroError } = await supabase.rpc("registrar_envio", {
    p_escalonamento_id: input.escalonamentoId,
    p_canal: input.canal,
    p_destinatario: input.destinatario,
    p_delivery_status: input.deliveryStatus,
    p_erro: null,
    p_comprovante_documento_id: documento.id,
  });

  if (registroError || !envioId) {
    return { error: "Comprovante enviado, mas não foi possível registrar a evidência.", success: false };
  }

  await logAuditEvent({
    tenantId: escalonamento.tenant_id,
    action: "escalonamento.enviado",
    entityType: "escalonamento",
    entityId: input.escalonamentoId,
    newData: { canal: input.canal, destinatario: input.destinatario },
  });

  revalidatePath(`/backoffice/cobrancas/${escalonamento.cobranca_id}`);
  return { error: null, success: true };
}

export async function registrarResultadoEscalonamentoAction(
  _prevState: EscalonamentoActionState,
  formData: FormData,
): Promise<EscalonamentoActionState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return { error: "Apenas a equipe GSBC pode registrar o resultado.", success: false };
  }

  const parsed = registrarResultadoEscalonamentoSchema.safeParse({
    escalonamentoId: formData.get("escalonamentoId"),
    descricao: formData.get("descricao"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", success: false };
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { data: escalonamento } = await supabase
    .from("escalonamentos")
    .select("tenant_id, cobranca_id")
    .eq("id", input.escalonamentoId)
    .single();

  if (!escalonamento) {
    return { error: "Escalonamento não encontrado.", success: false };
  }

  const { error } = await supabase.rpc("registrar_resultado", {
    p_escalonamento_id: input.escalonamentoId,
    p_descricao: input.descricao,
  });

  if (error) {
    return { error: "Não foi possível registrar o resultado.", success: false };
  }

  await logAuditEvent({
    tenantId: escalonamento.tenant_id,
    action: "escalonamento.concluido",
    entityType: "escalonamento",
    entityId: input.escalonamentoId,
    newData: { descricao: input.descricao },
  });

  revalidatePath(`/backoffice/cobrancas/${escalonamento.cobranca_id}`);
  return { error: null, success: true };
}
