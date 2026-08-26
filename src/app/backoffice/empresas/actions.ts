"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAuditEvent } from "@/lib/audit/log";
import { requireCurrentUser } from "@/lib/auth/session";
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
