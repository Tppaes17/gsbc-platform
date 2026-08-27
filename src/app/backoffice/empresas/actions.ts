"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAuditEvent } from "@/lib/audit/log";
import { requireCurrentUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  addEmpresaContatoSchema,
  createEmpresaSchema,
  updateEmpresaSchema,
} from "@/lib/validation/empresa";

export interface EmpresaActionState {
  error: string | null;
}

export async function createEmpresaAction(
  _prevState: EmpresaActionState,
  formData: FormData,
): Promise<EmpresaActionState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return { error: "Apenas a equipe GSBC pode cadastrar empresas." };
  }

  const parsed = createEmpresaSchema.safeParse({
    tenantId: formData.get("tenantId"),
    razaoSocial: formData.get("razaoSocial"),
    nomeFantasia: formData.get("nomeFantasia") || undefined,
    cnpj: formData.get("cnpj"),
    cnae: formData.get("cnae") || undefined,
    segmento: formData.get("segmento") || undefined,
    enquadramento: formData.get("enquadramento") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { data: created, error } = await supabase
    .from("empresas")
    .insert({
      tenant_id: input.tenantId,
      razao_social: input.razaoSocial,
      nome_fantasia: input.nomeFantasia || null,
      cnpj: input.cnpj,
      cnae: input.cnae || null,
      segmento: input.segmento || null,
      enquadramento: input.enquadramento || null,
    })
    .select("id")
    .single();

  if (error || !created) {
    if (error?.message.includes("duplicate key")) {
      return { error: "Já existe uma empresa com esse CNPJ neste sindicato." };
    }
    return { error: "Não foi possível cadastrar a empresa." };
  }

  await logAuditEvent({
    tenantId: input.tenantId,
    action: "empresa.created",
    entityType: "empresa",
    entityId: created.id,
    newData: { razao_social: input.razaoSocial, cnpj: input.cnpj },
  });

  revalidatePath("/backoffice/empresas");
  redirect(`/backoffice/empresas/${created.id}`);
}

export async function updateEmpresaAction(
  _prevState: EmpresaActionState,
  formData: FormData,
): Promise<EmpresaActionState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return { error: "Apenas a equipe GSBC pode editar dados da empresa." };
  }

  const parsed = updateEmpresaSchema.safeParse({
    empresaId: formData.get("empresaId"),
    razaoSocial: formData.get("razaoSocial"),
    nomeFantasia: formData.get("nomeFantasia") || undefined,
    cnpj: formData.get("cnpj"),
    cnae: formData.get("cnae") || undefined,
    segmento: formData.get("segmento") || undefined,
    enquadramento: formData.get("enquadramento") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { data: before } = await supabase
    .from("empresas")
    .select("tenant_id, razao_social, nome_fantasia, cnpj, cnae, segmento, enquadramento")
    .eq("id", input.empresaId)
    .single();

  const { error } = await supabase
    .from("empresas")
    .update({
      razao_social: input.razaoSocial,
      nome_fantasia: input.nomeFantasia || null,
      cnpj: input.cnpj,
      cnae: input.cnae || null,
      segmento: input.segmento || null,
      enquadramento: input.enquadramento || null,
    })
    .eq("id", input.empresaId);

  if (error) {
    return { error: "Não foi possível salvar as alterações." };
  }

  await logAuditEvent({
    tenantId: before?.tenant_id ?? null,
    action: "empresa.updated",
    entityType: "empresa",
    entityId: input.empresaId,
    oldData: before ?? null,
    newData: { razao_social: input.razaoSocial, cnpj: input.cnpj },
  });

  revalidatePath(`/backoffice/empresas/${input.empresaId}`);
  revalidatePath("/backoffice/empresas");
  return { error: null };
}

export interface AddContatoState {
  error: string | null;
  success: boolean;
}

export async function addEmpresaContatoAction(
  _prevState: AddContatoState,
  formData: FormData,
): Promise<AddContatoState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return {
      error: "Apenas a equipe GSBC pode gerenciar contatos da empresa.",
      success: false,
    };
  }

  const parsed = addEmpresaContatoSchema.safeParse({
    empresaId: formData.get("empresaId"),
    nome: formData.get("nome"),
    cargo: formData.get("cargo") || undefined,
    email: formData.get("email") || undefined,
    telefone: formData.get("telefone") || undefined,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      success: false,
    };
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { data: empresa } = await supabase
    .from("empresas")
    .select("tenant_id")
    .eq("id", input.empresaId)
    .single();

  const { error } = await supabase.from("empresa_contatos").insert({
    empresa_id: input.empresaId,
    nome: input.nome,
    cargo: input.cargo || null,
    email: input.email || null,
    telefone: input.telefone || null,
  });

  if (error) {
    return { error: "Não foi possível adicionar o contato.", success: false };
  }

  await logAuditEvent({
    tenantId: empresa?.tenant_id ?? null,
    action: "empresa.contato_added",
    entityType: "empresa",
    entityId: input.empresaId,
    newData: { nome: input.nome },
  });

  revalidatePath(`/backoffice/empresas/${input.empresaId}`);
  return { error: null, success: true };
}

export interface PortalAccessState {
  error: string | null;
  success: boolean;
}

/**
 * Concede acesso ao Portal de Regularização Empresarial (STG-05) a um
 * contato específico — nunca automático (decisão confirmada com o
 * usuário). Mesmo padrão de inviteUserByEmail() já usado para membership
 * (src/app/backoffice/usuarios/actions.ts): cria (ou reaproveita) o
 * auth.users via convite por e-mail do próprio Supabase Auth — RLS
 * continua sendo a autoridade final (is_empresa_contato(), migration
 * 0023), nunca um token bespoke fora do Supabase Auth.
 */
export async function concederAcessoPortalAction(contatoId: string): Promise<PortalAccessState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return { error: "Apenas a equipe GSBC pode conceder acesso ao portal.", success: false };
  }

  const supabase = await createClient();

  const { data: contato } = await supabase
    .from("empresa_contatos")
    .select("empresa_id, nome, email, portal_access_status, empresas(tenant_id)")
    .eq("id", contatoId)
    .single();

  if (!contato) {
    return { error: "Contato não encontrado.", success: false };
  }
  if (!contato.email) {
    return { error: "Este contato não tem e-mail cadastrado.", success: false };
  }
  if (contato.portal_access_status !== "none") {
    return { error: "Este contato já tem acesso ao portal (ou convite pendente).", success: false };
  }

  const admin = createAdminClient();

  const { data: existingUser } = await admin
    .from("users")
    .select("id")
    .eq("email", contato.email)
    .maybeSingle();

  let userId = existingUser?.id;
  // Email já tinha conta confirmada (ex.: também é staff/membro de
  // sindicato) — não há link de convite pra clicar, então o gatilho de
  // "invited -> active" (email_confirmed_at) nunca dispararia; ativa direto.
  let jaConfirmado = false;

  if (!userId) {
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      contato.email,
      {
        data: { full_name: contato.nome },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/portal`,
      },
    );

    if (inviteError || !invited.user) {
      return {
        error: "Não foi possível enviar o convite. Verifique o e-mail informado.",
        success: false,
      };
    }

    userId = invited.user.id;
  } else {
    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    jaConfirmado = Boolean(authUser?.user?.email_confirmed_at);
  }

  const empresa = Array.isArray(contato.empresas) ? contato.empresas[0] : contato.empresas;

  const { error } = await supabase
    .from("empresa_contatos")
    .update({
      user_id: userId,
      portal_access_status: jaConfirmado ? "active" : "invited",
      portal_invited_at: new Date().toISOString(),
      portal_invited_by: user.id,
    })
    .eq("id", contatoId);

  if (error) {
    return { error: "Convite enviado, mas não foi possível vincular o acesso.", success: false };
  }

  await logAuditEvent({
    tenantId: empresa?.tenant_id ?? null,
    action: "portal.acesso_concedido",
    entityType: "empresa_contato",
    entityId: contatoId,
    newData: { email: contato.email },
  });

  revalidatePath(`/backoffice/empresas/${contato.empresa_id}`);
  return { error: null, success: true };
}
