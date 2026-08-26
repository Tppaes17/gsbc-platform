"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAuditEvent } from "@/lib/audit/log";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  createSindicatoSchema,
  updateSindicatoSchema,
} from "@/lib/validation/sindicato";

export interface SindicatoActionState {
  error: string | null;
}

export async function createSindicatoAction(
  _prevState: SindicatoActionState,
  formData: FormData,
): Promise<SindicatoActionState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return { error: "Apenas a equipe GSBC pode cadastrar sindicatos." };
  }

  const parsed = createSindicatoSchema.safeParse({
    razaoSocial: formData.get("razaoSocial"),
    nomeFantasia: formData.get("nomeFantasia") || undefined,
    cnpj: formData.get("cnpj"),
    slug: formData.get("slug"),
    categoria: formData.get("categoria") || undefined,
    baseTerritorial: formData.get("baseTerritorial") || undefined,
    emailInstitucional: formData.get("emailInstitucional") || undefined,
    telefone: formData.get("telefone") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { data: tenantId, error } = await supabase.rpc(
    "create_sindicato_tenant",
    {
      p_name: input.nomeFantasia?.trim() || input.razaoSocial,
      p_slug: input.slug,
      p_razao_social: input.razaoSocial,
      p_nome_fantasia: input.nomeFantasia || null,
      p_cnpj: input.cnpj,
      p_categoria: input.categoria || null,
      p_base_territorial: input.baseTerritorial || null,
      p_email_institucional: input.emailInstitucional || null,
      p_telefone: input.telefone || null,
    },
  );

  if (error) {
    if (error.message.includes("duplicate key") && error.message.includes("slug")) {
      return { error: "Já existe um sindicato com esse identificador." };
    }
    if (error.message.includes("duplicate key") && error.message.includes("cnpj")) {
      return { error: "Já existe um sindicato com esse CNPJ." };
    }
    return { error: "Não foi possível cadastrar o sindicato." };
  }

  await logAuditEvent({
    tenantId,
    action: "sindicato.created",
    entityType: "sindicato",
    entityId: tenantId,
    newData: { razao_social: input.razaoSocial, cnpj: input.cnpj },
  });

  revalidatePath("/backoffice/sindicatos");
  redirect(`/backoffice/sindicatos/${tenantId}`);
}

export async function updateSindicatoAction(
  _prevState: SindicatoActionState,
  formData: FormData,
): Promise<SindicatoActionState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return { error: "Apenas a equipe GSBC pode editar dados do sindicato." };
  }

  const parsed = updateSindicatoSchema.safeParse({
    tenantId: formData.get("tenantId"),
    razaoSocial: formData.get("razaoSocial"),
    nomeFantasia: formData.get("nomeFantasia") || undefined,
    cnpj: formData.get("cnpj"),
    categoria: formData.get("categoria") || undefined,
    baseTerritorial: formData.get("baseTerritorial") || undefined,
    emailInstitucional: formData.get("emailInstitucional") || undefined,
    telefone: formData.get("telefone") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { data: before } = await supabase
    .from("sindicatos")
    .select("razao_social, nome_fantasia, cnpj, categoria, base_territorial, email_institucional, telefone")
    .eq("tenant_id", input.tenantId)
    .single();

  const { error } = await supabase
    .from("sindicatos")
    .update({
      razao_social: input.razaoSocial,
      nome_fantasia: input.nomeFantasia || null,
      cnpj: input.cnpj,
      categoria: input.categoria || null,
      base_territorial: input.baseTerritorial || null,
      email_institucional: input.emailInstitucional || null,
      telefone: input.telefone || null,
    })
    .eq("tenant_id", input.tenantId);

  if (error) {
    return { error: "Não foi possível salvar as alterações." };
  }

  await logAuditEvent({
    tenantId: input.tenantId,
    action: "sindicato.updated",
    entityType: "sindicato",
    entityId: input.tenantId,
    oldData: before ?? null,
    newData: { razao_social: input.razaoSocial, cnpj: input.cnpj },
  });

  revalidatePath(`/backoffice/sindicatos/${input.tenantId}`);
  revalidatePath("/backoffice/sindicatos");
  return { error: null };
}

export async function completeOnboardingAction(tenantId: string) {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    throw new Error("Apenas a equipe GSBC pode concluir o onboarding.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("tenants")
    .update({ onboarding_status: "active" })
    .eq("id", tenantId)
    .eq("onboarding_status", "onboarding");

  if (error) {
    throw new Error("Não foi possível concluir o onboarding.");
  }

  await logAuditEvent({
    tenantId,
    action: "sindicato.onboarding_completed",
    entityType: "tenant",
    entityId: tenantId,
    newData: { onboarding_status: "active" },
  });

  revalidatePath(`/backoffice/sindicatos/${tenantId}`);
  revalidatePath("/backoffice/sindicatos");
}
