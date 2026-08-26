"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAuditEvent } from "@/lib/audit/log";
import { requireCurrentUser } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email/send";
import { createClient } from "@/lib/supabase/server";
import {
  changeStatusSchema,
  createCobrancaSchema,
  parseCurrency,
  updateCobrancaSchema,
} from "@/lib/validation/cobranca";
import { sendNotificacaoSchema } from "@/lib/validation/notificacao";

export interface CobrancaActionState {
  error: string | null;
}

function emptyToNull(value: string | undefined): string | null {
  return value && value.trim() !== "" ? value : null;
}

export async function createCobrancaAction(
  _prevState: CobrancaActionState,
  formData: FormData,
): Promise<CobrancaActionState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return { error: "Apenas a equipe GSBC pode gerar cobranças." };
  }

  const parsed = createCobrancaSchema.safeParse({
    obrigacaoId: formData.get("obrigacaoId"),
    valorPrincipal: formData.get("valorPrincipal"),
    vencimento: formData.get("vencimento") || undefined,
    prioridade: formData.get("prioridade"),
    responsavelId: formData.get("responsavelId") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { data: obrigacao } = await supabase
    .from("obrigacoes")
    .select("tenant_id, empresa_id, vencimento")
    .eq("id", input.obrigacaoId)
    .single();

  if (!obrigacao) {
    return { error: "Obrigação não encontrada." };
  }

  const { data: created, error } = await supabase
    .from("cobrancas")
    .insert({
      tenant_id: obrigacao.tenant_id,
      empresa_id: obrigacao.empresa_id,
      obrigacao_id: input.obrigacaoId,
      valor_principal: parseCurrency(input.valorPrincipal),
      vencimento: emptyToNull(input.vencimento) ?? obrigacao.vencimento,
      prioridade: input.prioridade,
      responsavel_id: emptyToNull(input.responsavelId),
    })
    .select("id, status")
    .single();

  if (error || !created) {
    if (error?.message.includes("duplicate key")) {
      return { error: "Esta obrigação já tem uma cobrança gerada." };
    }
    return { error: "Não foi possível gerar a cobrança." };
  }

  await supabase.from("cobranca_eventos").insert({
    cobranca_id: created.id,
    from_status: null,
    to_status: created.status,
    reason: "Cobrança criada a partir da obrigação.",
  });

  await logAuditEvent({
    tenantId: obrigacao.tenant_id,
    action: "cobranca.created",
    entityType: "cobranca",
    entityId: created.id,
    newData: { obrigacao_id: input.obrigacaoId },
  });

  revalidatePath("/backoffice/cobrancas");
  revalidatePath(`/backoffice/empresas/${obrigacao.empresa_id}`);
  redirect(`/backoffice/cobrancas/${created.id}`);
}

export async function updateCobrancaAction(
  _prevState: CobrancaActionState,
  formData: FormData,
): Promise<CobrancaActionState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return { error: "Apenas a equipe GSBC pode editar a cobrança." };
  }

  const parsed = updateCobrancaSchema.safeParse({
    cobrancaId: formData.get("cobrancaId"),
    valorAtualizacao: formData.get("valorAtualizacao") || undefined,
    vencimento: formData.get("vencimento") || undefined,
    prioridade: formData.get("prioridade"),
    responsavelId: formData.get("responsavelId") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { data: before } = await supabase
    .from("cobrancas")
    .select("tenant_id, valor_atualizacao, vencimento, prioridade, responsavel_id")
    .eq("id", input.cobrancaId)
    .single();

  const { error } = await supabase
    .from("cobrancas")
    .update({
      valor_atualizacao: input.valorAtualizacao
        ? parseCurrency(input.valorAtualizacao)
        : 0,
      vencimento: emptyToNull(input.vencimento),
      prioridade: input.prioridade,
      responsavel_id: emptyToNull(input.responsavelId),
    })
    .eq("id", input.cobrancaId);

  if (error) {
    return { error: "Não foi possível salvar as alterações." };
  }

  await logAuditEvent({
    tenantId: before?.tenant_id ?? null,
    action: "cobranca.updated",
    entityType: "cobranca",
    entityId: input.cobrancaId,
    oldData: before ?? null,
    newData: {
      valor_atualizacao: input.valorAtualizacao || null,
      vencimento: input.vencimento || null,
      prioridade: input.prioridade,
    },
  });

  revalidatePath(`/backoffice/cobrancas/${input.cobrancaId}`);
  revalidatePath("/backoffice/cobrancas");
  return { error: null };
}

export interface ChangeStatusState {
  error: string | null;
  success: boolean;
}

export async function changeCobrancaStatusAction(
  _prevState: ChangeStatusState,
  formData: FormData,
): Promise<ChangeStatusState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return {
      error: "Apenas a equipe GSBC pode mudar o status da cobrança.",
      success: false,
    };
  }

  const parsed = changeStatusSchema.safeParse({
    cobrancaId: formData.get("cobrancaId"),
    newStatus: formData.get("newStatus"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      success: false,
    };
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { data: cobranca } = await supabase
    .from("cobrancas")
    .select("tenant_id, status")
    .eq("id", input.cobrancaId)
    .single();

  if (!cobranca) {
    return { error: "Cobrança não encontrada.", success: false };
  }

  const { error } = await supabase.rpc("change_cobranca_status", {
    p_cobranca_id: input.cobrancaId,
    p_new_status: input.newStatus,
    p_reason: input.reason,
  });

  if (error) {
    return { error: "Não foi possível mudar o status.", success: false };
  }

  await logAuditEvent({
    tenantId: cobranca.tenant_id,
    action: "cobranca.status_changed",
    entityType: "cobranca",
    entityId: input.cobrancaId,
    oldData: { status: cobranca.status },
    newData: { status: input.newStatus, reason: input.reason },
  });

  revalidatePath(`/backoffice/cobrancas/${input.cobrancaId}`);
  revalidatePath("/backoffice/cobrancas");
  return { error: null, success: true };
}

export interface SendNotificacaoState {
  error: string | null;
  success: boolean;
}

function formatCurrencyBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateBR(value: string | null) {
  if (!value) return "a definir";
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

export async function sendNotificacaoAction(
  _prevState: SendNotificacaoState,
  formData: FormData,
): Promise<SendNotificacaoState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return {
      error: "Apenas a equipe GSBC pode enviar notificações.",
      success: false,
    };
  }

  const parsed = sendNotificacaoSchema.safeParse({
    cobrancaId: formData.get("cobrancaId"),
    mensagem: formData.get("mensagem") || undefined,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      success: false,
    };
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { data: cobranca } = await supabase
    .from("cobrancas")
    .select(
      "tenant_id, empresa_id, valor_cobranca, vencimento, empresas(razao_social, nome_fantasia), tenants(name), obrigacoes(descricao)",
    )
    .eq("id", input.cobrancaId)
    .single();

  if (!cobranca) {
    return { error: "Cobrança não encontrada.", success: false };
  }

  const empresa = Array.isArray(cobranca.empresas) ? cobranca.empresas[0] : cobranca.empresas;
  const tenant = Array.isArray(cobranca.tenants) ? cobranca.tenants[0] : cobranca.tenants;
  const obrigacao = Array.isArray(cobranca.obrigacoes)
    ? cobranca.obrigacoes[0]
    : cobranca.obrigacoes;
  const empresaNome = empresa?.nome_fantasia ?? empresa?.razao_social ?? "empresa";

  const { data: contatos } = await supabase
    .from("empresa_contatos")
    .select("email, principal")
    .eq("empresa_id", cobranca.empresa_id)
    .not("email", "is", null)
    .order("principal", { ascending: false })
    .limit(1);

  const destinatario = contatos?.[0]?.email;

  if (!destinatario) {
    return {
      error: "Esta empresa não tem um contato com e-mail cadastrado.",
      success: false,
    };
  }

  const assunto = `${tenant?.name ?? "GSBC"} — Notificação sobre pendência: ${obrigacao?.descricao ?? "obrigação"}`;
  const valorFormatado = formatCurrencyBRL(cobranca.valor_cobranca);
  const vencimentoFormatado = formatDateBR(cobranca.vencimento);
  const mensagemExtra = input.mensagem?.trim();

  const text = [
    `Prezados, ${empresaNome},`,
    "",
    `Referente à obrigação "${obrigacao?.descricao ?? "—"}", identificamos uma pendência no valor de ${valorFormatado}, com vencimento em ${vencimentoFormatado}.`,
    mensagemExtra ? `\n${mensagemExtra}` : null,
    "",
    `Em nome de ${tenant?.name ?? "GSBC"}, solicitamos a regularização o quanto antes. Para tratar diretamente sobre este assunto, entre em contato com a GSBC.`,
    "",
    "Atenciosamente,",
    "GSBC — Gestora Sindical de Benefícios & Compliance",
  ]
    .filter((line) => line !== null)
    .join("\n");

  const html = `
    <p>Prezados, ${empresaNome},</p>
    <p>Referente à obrigação "<strong>${obrigacao?.descricao ?? "—"}</strong>", identificamos uma pendência no valor de <strong>${valorFormatado}</strong>, com vencimento em <strong>${vencimentoFormatado}</strong>.</p>
    ${mensagemExtra ? `<p>${mensagemExtra}</p>` : ""}
    <p>Em nome de ${tenant?.name ?? "GSBC"}, solicitamos a regularização o quanto antes. Para tratar diretamente sobre este assunto, entre em contato com a GSBC.</p>
    <p>Atenciosamente,<br>GSBC — Gestora Sindical de Benefícios &amp; Compliance</p>
  `;

  let sendError: string | null = null;
  try {
    await sendEmail({ to: destinatario, subject: assunto, text, html });
  } catch {
    sendError = "Falha no envio do e-mail (verifique a configuração de SMTP).";
  }

  await supabase.from("notificacoes").insert({
    tenant_id: cobranca.tenant_id,
    empresa_id: cobranca.empresa_id,
    cobranca_id: input.cobrancaId,
    destinatario_email: destinatario,
    assunto,
    status: sendError ? "falha" : "enviada",
    erro: sendError,
    enviado_por: user.id,
  });

  await logAuditEvent({
    tenantId: cobranca.tenant_id,
    action: sendError ? "notificacao.falha" : "notificacao.enviada",
    entityType: "cobranca",
    entityId: input.cobrancaId,
    newData: { destinatario, assunto },
  });

  revalidatePath(`/backoffice/cobrancas/${input.cobrancaId}`);

  if (sendError) {
    return { error: sendError, success: false };
  }
  return { error: null, success: true };
}
