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
    if (error.message.includes("aguardando aprovação de desconto")) {
      return {
        error: "Esta negociação está aguardando aprovação de desconto — decida isso antes de novos movimentos.",
        success: false,
      };
    }
    return { error: "Não foi possível registrar o movimento.", success: false };
  }

  // A cascata pra 'agreement_reached' (aceite sem desconto, ou dentro do
  // limite da política) e a transição pra 'aguardando_aprovacao' (STG-11
  // — desconto acima do limite) já acontecem dentro de
  // register_negociacao_evento() — nada a fazer aqui.

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

export interface DecidirDescontoState {
  error: string | null;
  success: boolean;
}

export async function decidirDescontoNegociacaoAction(
  _prevState: DecidirDescontoState,
  formData: FormData,
): Promise<DecidirDescontoState> {
  const user = await requireCurrentUser();
  if (!user.isOwner) {
    return { error: "Apenas o Owner pode aprovar ou rejeitar um desconto.", success: false };
  }

  const negociacaoId = formData.get("negociacaoId");
  const aprovado = formData.get("aprovado");
  const motivo = formData.get("motivo");

  if (typeof negociacaoId !== "string" || !negociacaoId) {
    return { error: "Negociação inválida.", success: false };
  }
  if (aprovado !== "true" && aprovado !== "false") {
    return { error: "Decisão inválida.", success: false };
  }
  if (typeof motivo !== "string" || motivo.trim().length < 5) {
    return { error: "Justifique a decisão (mínimo 5 caracteres).", success: false };
  }

  const supabase = await createClient();

  const { data: negociacao } = await supabase
    .from("negociacoes")
    .select("tenant_id, empresa_id, cobranca_id")
    .eq("id", negociacaoId)
    .single();

  if (!negociacao) {
    return { error: "Negociação não encontrada.", success: false };
  }

  const isAprovado = aprovado === "true";

  const { error } = await supabase.rpc("decidir_aprovacao_desconto", {
    p_negociacao_id: negociacaoId,
    p_aprovado: isAprovado,
    p_motivo: motivo,
  });

  if (error) {
    return { error: "Não foi possível registrar a decisão.", success: false };
  }

  await logAuditEvent({
    tenantId: negociacao.tenant_id,
    action: isAprovado ? "negociacao.desconto_aprovado" : "negociacao.desconto_rejeitado",
    entityType: "negociacao",
    entityId: negociacaoId,
    newData: { motivo },
  });

  revalidatePath(`/backoffice/negociacoes/${negociacaoId}`);
  revalidatePath("/backoffice/negociacoes");
  revalidatePath(`/backoffice/cobrancas/${negociacao.cobranca_id}`);
  revalidatePath(`/backoffice/empresas/${negociacao.empresa_id}`);
  return { error: null, success: true };
}
