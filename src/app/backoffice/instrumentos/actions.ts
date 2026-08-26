"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAuditEvent } from "@/lib/audit/log";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  addClausulaSchema,
  addObrigacaoSchema,
  createInstrumentoSchema,
  updateInstrumentoSchema,
} from "@/lib/validation/instrumento";

export interface InstrumentoActionState {
  error: string | null;
}

function emptyToNull(value: string | undefined): string | null {
  return value && value.trim() !== "" ? value : null;
}

export async function createInstrumentoAction(
  _prevState: InstrumentoActionState,
  formData: FormData,
): Promise<InstrumentoActionState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return { error: "Apenas a equipe GSBC pode cadastrar instrumentos." };
  }

  const parsed = createInstrumentoSchema.safeParse({
    tenantId: formData.get("tenantId"),
    empresaId: formData.get("empresaId") || undefined,
    tipo: formData.get("tipo"),
    numero: formData.get("numero") || undefined,
    titulo: formData.get("titulo"),
    dataBase: formData.get("dataBase") || undefined,
    vigenciaInicio: formData.get("vigenciaInicio") || undefined,
    vigenciaFim: formData.get("vigenciaFim") || undefined,
    origem: formData.get("origem") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { data: created, error } = await supabase
    .from("instrumentos")
    .insert({
      tenant_id: input.tenantId,
      empresa_id: emptyToNull(input.empresaId),
      tipo: input.tipo,
      numero: input.numero || null,
      titulo: input.titulo,
      data_base: emptyToNull(input.dataBase),
      vigencia_inicio: emptyToNull(input.vigenciaInicio),
      vigencia_fim: emptyToNull(input.vigenciaFim),
      origem: input.origem || null,
    })
    .select("id")
    .single();

  if (error || !created) {
    return { error: "Não foi possível cadastrar o instrumento." };
  }

  await logAuditEvent({
    tenantId: input.tenantId,
    action: "instrumento.created",
    entityType: "instrumento",
    entityId: created.id,
    newData: { titulo: input.titulo, tipo: input.tipo },
  });

  revalidatePath("/backoffice/instrumentos");
  redirect(`/backoffice/instrumentos/${created.id}`);
}

export async function updateInstrumentoAction(
  _prevState: InstrumentoActionState,
  formData: FormData,
): Promise<InstrumentoActionState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return { error: "Apenas a equipe GSBC pode editar o instrumento." };
  }

  const parsed = updateInstrumentoSchema.safeParse({
    instrumentoId: formData.get("instrumentoId"),
    empresaId: formData.get("empresaId") || undefined,
    tipo: formData.get("tipo"),
    numero: formData.get("numero") || undefined,
    titulo: formData.get("titulo"),
    dataBase: formData.get("dataBase") || undefined,
    vigenciaInicio: formData.get("vigenciaInicio") || undefined,
    vigenciaFim: formData.get("vigenciaFim") || undefined,
    origem: formData.get("origem") || undefined,
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { data: before } = await supabase
    .from("instrumentos")
    .select("tenant_id, titulo, status")
    .eq("id", input.instrumentoId)
    .single();

  const { error } = await supabase
    .from("instrumentos")
    .update({
      empresa_id: emptyToNull(input.empresaId),
      tipo: input.tipo,
      numero: input.numero || null,
      titulo: input.titulo,
      data_base: emptyToNull(input.dataBase),
      vigencia_inicio: emptyToNull(input.vigenciaInicio),
      vigencia_fim: emptyToNull(input.vigenciaFim),
      origem: input.origem || null,
      status: input.status,
    })
    .eq("id", input.instrumentoId);

  if (error) {
    return { error: "Não foi possível salvar as alterações." };
  }

  await logAuditEvent({
    tenantId: before?.tenant_id ?? null,
    action: "instrumento.updated",
    entityType: "instrumento",
    entityId: input.instrumentoId,
    oldData: before ?? null,
    newData: { titulo: input.titulo, status: input.status },
  });

  revalidatePath(`/backoffice/instrumentos/${input.instrumentoId}`);
  revalidatePath("/backoffice/instrumentos");
  return { error: null };
}

export interface SimpleActionState {
  error: string | null;
  success: boolean;
}

export async function addClausulaAction(
  _prevState: SimpleActionState,
  formData: FormData,
): Promise<SimpleActionState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return {
      error: "Apenas a equipe GSBC pode adicionar cláusulas.",
      success: false,
    };
  }

  const parsed = addClausulaSchema.safeParse({
    instrumentoId: formData.get("instrumentoId"),
    numero: formData.get("numero") || undefined,
    titulo: formData.get("titulo"),
    texto: formData.get("texto") || undefined,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      success: false,
    };
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { data: instrumento } = await supabase
    .from("instrumentos")
    .select("tenant_id")
    .eq("id", input.instrumentoId)
    .single();

  const { error } = await supabase.from("clausulas").insert({
    instrumento_id: input.instrumentoId,
    numero: input.numero || null,
    titulo: input.titulo,
    texto: input.texto || null,
  });

  if (error) {
    return { error: "Não foi possível adicionar a cláusula.", success: false };
  }

  await logAuditEvent({
    tenantId: instrumento?.tenant_id ?? null,
    action: "clausula.added",
    entityType: "instrumento",
    entityId: input.instrumentoId,
    newData: { titulo: input.titulo },
  });

  revalidatePath(`/backoffice/instrumentos/${input.instrumentoId}`);
  return { error: null, success: true };
}

export async function addObrigacaoAction(
  _prevState: SimpleActionState,
  formData: FormData,
): Promise<SimpleActionState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return {
      error: "Apenas a equipe GSBC pode adicionar obrigações.",
      success: false,
    };
  }

  const parsed = addObrigacaoSchema.safeParse({
    instrumentoId: formData.get("instrumentoId"),
    clausulaId: formData.get("clausulaId") || undefined,
    empresaId: formData.get("empresaId"),
    fundamento: formData.get("fundamento") || undefined,
    descricao: formData.get("descricao"),
    periodicidade: formData.get("periodicidade"),
    periodoInicio: formData.get("periodoInicio") || undefined,
    periodoFim: formData.get("periodoFim") || undefined,
    vencimento: formData.get("vencimento") || undefined,
    valorReferencia: formData.get("valorReferencia") || undefined,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      success: false,
    };
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { data: instrumento } = await supabase
    .from("instrumentos")
    .select("tenant_id")
    .eq("id", input.instrumentoId)
    .single();

  if (!instrumento) {
    return { error: "Instrumento não encontrado.", success: false };
  }

  const valor = input.valorReferencia
    ? Number.parseFloat(input.valorReferencia.replace(",", "."))
    : null;

  const { data: created, error } = await supabase
    .from("obrigacoes")
    .insert({
      tenant_id: instrumento.tenant_id,
      instrumento_id: input.instrumentoId,
      clausula_id: emptyToNull(input.clausulaId),
      empresa_id: input.empresaId,
      fundamento: input.fundamento || null,
      descricao: input.descricao,
      periodicidade: input.periodicidade,
      periodo_inicio: emptyToNull(input.periodoInicio),
      periodo_fim: emptyToNull(input.periodoFim),
      vencimento: emptyToNull(input.vencimento),
      valor_referencia: valor,
    })
    .select("id")
    .single();

  if (error || !created) {
    return { error: "Não foi possível adicionar a obrigação.", success: false };
  }

  await logAuditEvent({
    tenantId: instrumento.tenant_id,
    action: "obrigacao.created",
    entityType: "obrigacao",
    entityId: created.id,
    newData: { descricao: input.descricao, empresa_id: input.empresaId },
  });

  revalidatePath(`/backoffice/instrumentos/${input.instrumentoId}`);
  revalidatePath(`/backoffice/empresas/${input.empresaId}`);
  return { error: null, success: true };
}
