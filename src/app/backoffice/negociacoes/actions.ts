"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAuditEvent } from "@/lib/audit/log";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  createNegociacaoSchema,
  parseCurrency,
  registerEventoSchema,
} from "@/lib/validation/negociacao";

export interface NegociacaoActionState {
  error: string | null;
}

function emptyToNull(value: string | undefined): string | null {
  return value && value.trim() !== "" ? value : null;
}

const VALOR_OBRIGATORIO = new Set(["proposta_gsbc", "contraproposta_empresa", "aceite"]);

export async function createNegociacaoAction(
  _prevState: NegociacaoActionState,
  formData: FormData,
): Promise<NegociacaoActionState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return { error: "Apenas a equipe GSBC pode iniciar uma negociação." };
  }

  const parsed = createNegociacaoSchema.safeParse({
    cobrancaId: formData.get("cobrancaId"),
    responsavelId: formData.get("responsavelId") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { data: cobranca } = await supabase
    .from("cobrancas")
    .select("tenant_id, empresa_id")
    .eq("id", input.cobrancaId)
    .single();

  if (!cobranca) {
    return { error: "Cobrança não encontrada." };
  }

  const { data: created, error } = await supabase
    .from("negociacoes")
    .insert({
      tenant_id: cobranca.tenant_id,
      empresa_id: cobranca.empresa_id,
      cobranca_id: input.cobrancaId,
      responsavel_id: emptyToNull(input.responsavelId),
    })
    .select("id")
    .single();

  if (error || !created) {
    if (error?.message.includes("duplicate key")) {
      return { error: "Esta cobrança já tem uma negociação iniciada." };
    }
    return { error: "Não foi possível iniciar a negociação." };
  }

  await supabase.rpc("change_cobranca_status", {
    p_cobranca_id: input.cobrancaId,
    p_new_status: "negotiating",
    p_reason: "Negociação iniciada.",
  });

  await logAuditEvent({
    tenantId: cobranca.tenant_id,
    action: "negociacao.created",
    entityType: "negociacao",
    entityId: created.id,
    newData: { cobranca_id: input.cobrancaId },
  });

  revalidatePath("/backoffice/negociacoes");
  revalidatePath(`/backoffice/cobrancas/${input.cobrancaId}`);
  revalidatePath(`/backoffice/empresas/${cobranca.empresa_id}`);
  redirect(`/backoffice/negociacoes/${created.id}`);
}

export interface RegisterEventoState {
  error: string | null;
  success: boolean;
}

export async function registerNegociacaoEventoAction(
  _prevState: RegisterEventoState,
  formData: FormData,
): Promise<RegisterEventoState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return {
      error: "Apenas a equipe GSBC pode registrar movimentos da negociação.",
      success: false,
    };
  }

  const parsed = registerEventoSchema.safeParse({
    negociacaoId: formData.get("negociacaoId"),
    tipo: formData.get("tipo"),
    valor: formData.get("valor") || undefined,
    condicoes: formData.get("condicoes") || undefined,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      success: false,
    };
  }

  const input = parsed.data;

  if (VALOR_OBRIGATORIO.has(input.tipo) && !input.valor) {
    return { error: "Informe o valor para este tipo de movimento.", success: false };
  }

  const supabase = await createClient();

  const { data: negociacao } = await supabase
    .from("negociacoes")
    .select("tenant_id, empresa_id, cobranca_id, status")
    .eq("id", input.negociacaoId)
    .single();

  if (!negociacao) {
    return { error: "Negociação não encontrada.", success: false };
  }

  const { error } = await supabase.rpc("register_negociacao_evento", {
    p_negociacao_id: input.negociacaoId,
    p_tipo: input.tipo,
    p_valor: input.valor ? parseCurrency(input.valor) : null,
    p_condicoes: emptyToNull(input.condicoes),
  });

  if (error) {
    return { error: "Não foi possível registrar o movimento.", success: false };
  }

  if (input.tipo === "aceite") {
    await supabase.rpc("change_cobranca_status", {
      p_cobranca_id: negociacao.cobranca_id,
      p_new_status: "agreement_reached",
      p_reason: "Acordo firmado na negociação.",
    });
  }

  await logAuditEvent({
    tenantId: negociacao.tenant_id,
    action: "negociacao.evento_registrado",
    entityType: "negociacao",
    entityId: input.negociacaoId,
    newData: { tipo: input.tipo, valor: input.valor || null },
  });

  revalidatePath(`/backoffice/negociacoes/${input.negociacaoId}`);
  revalidatePath("/backoffice/negociacoes");
  revalidatePath(`/backoffice/cobrancas/${negociacao.cobranca_id}`);
  revalidatePath(`/backoffice/empresas/${negociacao.empresa_id}`);
  return { error: null, success: true };
}
