"use server";

import { revalidatePath } from "next/cache";
import { logAuditEvent } from "@/lib/audit/log";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { valorReferenciaCobranca } from "@/lib/finance/referencia";
import { getPaymentProvider } from "@/lib/payments/registry";
import { buildSimulatedWebhookPayload } from "@/lib/payments/mock-provider";
import type { PaymentChargeTipo } from "@/types/database.types";

export interface PaymentChargeActionState {
  error: string | null;
  success: boolean;
}

export async function criarChargeAction(cobrancaId: string, tipo: PaymentChargeTipo): Promise<PaymentChargeActionState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return { error: "Apenas a equipe GSBC pode gerar cobranças digitais.", success: false };
  }

  const supabase = await createClient();

  const { data: cobranca } = await supabase
    .from("cobrancas")
    .select("tenant_id, empresa_id, valor_cobranca, empresas(razao_social, cnpj), negociacoes(status, valor_atual)")
    .eq("id", cobrancaId)
    .single();

  if (!cobranca) {
    return { error: "Cobrança não encontrada.", success: false };
  }

  const empresa = Array.isArray(cobranca.empresas) ? cobranca.empresas[0] : cobranca.empresas;
  const negociacao = Array.isArray(cobranca.negociacoes)
    ? cobranca.negociacoes.find((n) => n.status === "aceita") ?? cobranca.negociacoes[0]
    : cobranca.negociacoes;
  const valorReferencia = valorReferenciaCobranca(cobranca.valor_cobranca, negociacao);
  const provider = getPaymentProvider("mock");

  const result = await provider.createCharge({
    internalId: cobrancaId,
    valor: valorReferencia,
    tipo,
    descricao: `Cobrança GSBC — ${empresa?.razao_social ?? "empresa"}`,
    payerName: empresa?.razao_social ?? "",
    payerDocument: empresa?.cnpj ?? "",
  });

  const { error } = await supabase.from("payment_charges").insert({
    tenant_id: cobranca.tenant_id,
    empresa_id: cobranca.empresa_id,
    cobranca_id: cobrancaId,
    provider: "mock",
    tipo,
    valor: valorReferencia,
    status: result.status,
    external_id: result.externalId,
    external_status: result.externalStatus,
    qr_code: result.qrCode ?? null,
    linha_digitavel: result.linhaDigitavel ?? null,
    boleto_url: result.boletoUrl ?? null,
    expires_at: result.expiresAt ?? null,
    created_by: user.id,
  });

  if (error) {
    return { error: "Não foi possível registrar a cobrança gerada.", success: false };
  }

  await logAuditEvent({
    tenantId: cobranca.tenant_id,
    action: "payment_charge.criada",
    entityType: "cobranca",
    entityId: cobrancaId,
    newData: { tipo, provider: "mock", external_id: result.externalId },
  });

  revalidatePath(`/backoffice/cobrancas/${cobrancaId}`);
  return { error: null, success: true };
}

/**
 * Só existe pra testar o pipeline real de webhook (assinatura,
 * idempotência, mapeamento de status) sem depender de um provider de
 * verdade — dispara um HTTP POST assinado pro nosso próprio endpoint,
 * exatamente como o provider faria. Staff-only, e a UI deixa claro que
 * é simulação (ver contatos-section/payment-charges-section).
 */
export async function simularWebhookAction(
  chargeId: string,
  statusExterno: "PAGA" | "EXPIRADA" | "CANCELADA" | "ESTORNADA",
): Promise<PaymentChargeActionState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return { error: "Apenas a equipe GSBC pode simular confirmações de pagamento.", success: false };
  }

  const supabase = await createClient();
  const { data: charge } = await supabase
    .from("payment_charges")
    .select("id, cobranca_id, external_id, provider")
    .eq("id", chargeId)
    .single();

  if (!charge || !charge.external_id) {
    return { error: "Cobrança (charge) não encontrada.", success: false };
  }

  const { body, signature } = buildSimulatedWebhookPayload(charge.external_id, statusExterno);

  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/payments/${charge.provider}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-webhook-signature": signature },
    body,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    return { error: payload.error ?? "Falha ao enviar a confirmação simulada.", success: false };
  }

  revalidatePath(`/backoffice/cobrancas/${charge.cobranca_id}`);
  return { error: null, success: true };
}
