import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrencyBRL } from "@/lib/format";
import type { Database, PaymentProviderName } from "@/types/database.types";
import { getPaymentProvider } from "./registry";

type PaymentChargeUpdate = Database["public"]["Tables"]["payment_charges"]["Update"];

export interface WebhookProcessResult {
  status: "processed" | "ignored" | "manual_review" | "invalid_signature" | "duplicate";
  message: string;
}

// Uma charge já paga/estornada é terminal na direção "sucesso" — um
// evento tardio de expirado/cancelado que chega depois (fora de ordem)
// nunca desfaz um pagamento que já aconteceu.
const STATUS_TERMINAL_SUCESSO = new Set(["paid", "refunded"]);

function safeJsonPayload(rawBody: string): Record<string, unknown> {
  if (!rawBody) return {};
  try {
    const parsed = JSON.parse(rawBody);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : { raw_body: rawBody };
  } catch {
    return { raw_body: rawBody, parse_error: "invalid_json" };
  }
}

/**
 * Processa um webhook de pagamento — o único caminho de entrada pra
 * qualquer confirmação externa virar estado interno. Sempre persiste o
 * evento bruto primeiro (auditoria/revisão manual independe do
 * resultado do processamento), sempre idempotente por
 * (provider, external_event_id) — retry e entrega duplicada do provider
 * nunca reprocessam.
 */
export async function processPaymentWebhook(
  providerName: PaymentProviderName,
  rawBody: string,
  signatureHeader: string | null,
): Promise<WebhookProcessResult> {
  const admin = createAdminClient();
  const provider = getPaymentProvider(providerName);
  const signatureValid = provider.verifyWebhookSignature(rawBody, signatureHeader);
  const payload = safeJsonPayload(rawBody);

  let event: ReturnType<typeof provider.parseWebhookEvent> | null = null;
  try {
    event = signatureValid ? provider.parseWebhookEvent(rawBody) : null;
  } catch {
    event = null;
  }

  // Persistência bruta ANTES de qualquer decisão — mesmo se a
  // assinatura for inválida ou o parse falhar, o evento fica registrado.
  const { data: inserted, error: insertError } = await admin
    .from("payment_webhook_events")
    .insert({
      provider: providerName,
      external_event_id: event?.externalEventId ?? `unparsed_${Date.now()}_${Math.random()}`,
      charge_external_id: event?.chargeExternalId ?? null,
      payload,
      signature_valid: signatureValid,
      processing_status: signatureValid ? "pending" : "error",
      processing_error: signatureValid ? null : "Assinatura inválida.",
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    // Conflito de idempotência (provider, external_event_id) já existe
    // — retry ou entrega duplicada do provider. Nunca reprocessa.
    if (insertError?.message.includes("duplicate key")) {
      return { status: "duplicate", message: "Evento já processado anteriormente." };
    }
    return { status: "manual_review", message: "Não foi possível registrar o evento." };
  }

  if (!signatureValid || !event) {
    return { status: "invalid_signature", message: "Assinatura do webhook inválida." };
  }

  const { data: charge } = await admin
    .from("payment_charges")
    .select("id, cobranca_id, valor, status, tipo")
    .eq("provider", providerName)
    .eq("external_id", event.chargeExternalId)
    .maybeSingle();

  if (!charge) {
    await admin
      .from("payment_webhook_events")
      .update({ processing_status: "manual_review", processing_error: "Charge não encontrada.", processed_at: new Date().toISOString() })
      .eq("id", inserted.id);
    return { status: "manual_review", message: "Evento referencia uma charge desconhecida." };
  }

  if (STATUS_TERMINAL_SUCESSO.has(charge.status) && event.status !== "refunded") {
    await admin
      .from("payment_webhook_events")
      .update({ processing_status: "ignored", processed_at: new Date().toISOString() })
      .eq("id", inserted.id);
    return { status: "ignored", message: "Charge já está num estado terminal de sucesso — evento fora de ordem ignorado." };
  }

  const updatePayload: PaymentChargeUpdate = {
    status: event.status,
    external_status: event.externalStatus,
  };
  if (event.status === "paid") updatePayload.paid_at = event.occurredAt;
  if (event.status === "cancelled") updatePayload.cancelled_at = event.occurredAt;

  let pagamentoId: string | null = null;
  if (event.status === "paid") {
    const { data: pagamentoIdResult, error: pagamentoError } = await admin.rpc("register_pagamento", {
      p_cobranca_id: charge.cobranca_id,
      p_valor: charge.valor,
      p_data_pagamento: event.occurredAt.slice(0, 10),
      p_forma_pagamento: charge.tipo,
      p_observacao: `Confirmado via webhook (simulação) — charge ${event.chargeExternalId}.`,
    });

    if (pagamentoError) {
      await admin
        .from("payment_webhook_events")
        .update({ processing_status: "error", processing_error: pagamentoError.message, processed_at: new Date().toISOString() })
        .eq("id", inserted.id);
      return { status: "manual_review", message: "Falha ao registrar o pagamento a partir do webhook." };
    }
    pagamentoId = pagamentoIdResult;
    updatePayload.pagamento_id = pagamentoId;
  }

  await admin.from("payment_charges").update(updatePayload).eq("id", charge.id);

  await admin
    .from("payment_webhook_events")
    .update({ processing_status: "processed", processed_at: new Date().toISOString() })
    .eq("id", inserted.id);

  return {
    status: "processed",
    message:
      event.status === "paid"
        ? `Pagamento de ${formatCurrencyBRL(charge.valor)} registrado.`
        : `Charge atualizada para ${event.status}.`,
  };
}
