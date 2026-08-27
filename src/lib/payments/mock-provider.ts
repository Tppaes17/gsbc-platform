import "server-only";
import { createHmac, randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  ChargeResult,
  CreateChargeInput,
  PaymentProvider,
  RefundResult,
  WebhookEvent,
} from "./provider";

/**
 * Adapter de SIMULAÇÃO — nunca um provider real (decisão confirmada com
 * o usuário, STG-06: sem provider contratado ainda, constrói-se só a
 * abstração). Nenhuma cobrança real é gerada; nenhum dinheiro muda de
 * mão. Identificado como "mock" em todo lugar (banco, UI, logs) — nunca
 * deve ser confundido com um provider de verdade (regra 9 do
 * AGENTS.md). Trocar por um provider real é implementar esta mesma
 * interface (`PaymentProvider`) num novo adapter, sem tocar no resto do
 * sistema.
 *
 * Como não existe um sistema externo de verdade, o "estado do
 * provider" é a própria linha em payment_charges — getCharge() lê o que
 * já está no nosso banco em vez de chamar uma API de rede.
 */

function webhookSecret(): string {
  const secret = process.env.MOCK_PROVIDER_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("MOCK_PROVIDER_WEBHOOK_SECRET não configurado.");
  }
  return secret;
}

function signPayload(rawBody: string): string {
  return createHmac("sha256", webhookSecret()).update(rawBody).digest("hex");
}

export const mockPaymentProvider: PaymentProvider = {
  name: "mock",

  async createCharge(input: CreateChargeInput): Promise<ChargeResult> {
    const externalId = `mock_charge_${randomUUID()}`;
    const expiresAt = new Date(
      Date.now() + (input.expiresInSeconds ?? 3600) * 1000,
    ).toISOString();

    if (input.tipo === "pix") {
      return {
        externalId,
        status: "pending",
        externalStatus: "ATIVA",
        qrCode: `00020126SIMULACAO-PIX-${externalId}-VALOR${input.valor.toFixed(2)}`,
        expiresAt,
      };
    }

    return {
      externalId,
      status: "pending",
      externalStatus: "REGISTRADO",
      linhaDigitavel: `34191.79001 01043.510047 91020.150008 8 ${Date.now()}`,
      boletoUrl: `https://simulacao.invalid/boletos/${externalId}.pdf`,
      expiresAt,
    };
  },

  async getCharge(externalId: string): Promise<ChargeResult> {
    const admin = createAdminClient();
    const { data: charge } = await admin
      .from("payment_charges")
      .select("status, external_status, qr_code, linha_digitavel, boleto_url, expires_at")
      .eq("provider", "mock")
      .eq("external_id", externalId)
      .single();

    if (!charge) {
      throw new Error(`Charge simulada não encontrada: ${externalId}`);
    }

    return {
      externalId,
      status: charge.status,
      externalStatus: charge.external_status ?? charge.status,
      qrCode: charge.qr_code ?? undefined,
      linhaDigitavel: charge.linha_digitavel ?? undefined,
      boletoUrl: charge.boleto_url ?? undefined,
      expiresAt: charge.expires_at ?? undefined,
    };
  },

  async cancelCharge(): Promise<void> {
    // Simulação: o cancelamento em si só é refletido quando o teste
    // dispara um evento de webhook 'cancelled' (mesmo caminho que um
    // provider real usaria) — nada a fazer aqui além de existir.
  },

  async refundPayment(externalId: string): Promise<RefundResult> {
    return { refundId: `mock_refund_${externalId}_${randomUUID()}`, status: "pending" };
  },

  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
    if (!signatureHeader) return false;
    const expected = signPayload(rawBody);
    return expected === signatureHeader;
  },

  parseWebhookEvent(rawBody: string): WebhookEvent {
    const parsed = JSON.parse(rawBody) as {
      event_id: string;
      charge_external_id: string;
      status: string;
      occurred_at: string;
    };
    const statusMap: Record<string, WebhookEvent["status"]> = {
      PAGA: "paid",
      EXPIRADA: "expired",
      CANCELADA: "cancelled",
      ESTORNADA: "refunded",
      FALHA: "failed",
    };
    const status = statusMap[parsed.status];
    if (!status) {
      throw new Error(`Status de webhook desconhecido: ${parsed.status}`);
    }
    return {
      externalEventId: parsed.event_id,
      chargeExternalId: parsed.charge_external_id,
      status,
      externalStatus: parsed.status,
      occurredAt: parsed.occurred_at,
    };
  },
};

/**
 * Constrói e assina um payload de webhook simulado — usado só pela ação
 * de teste "Simular webhook" (staff, STG-06). Um provider real nunca
 * teria essa função no adapter; é o painel/sandbox deles que gera o
 * evento. Existe aqui só pra exercitar o endpoint de webhook de
 * verdade (assinatura, idempotência, mapeamento de status) sem depender
 * de infraestrutura externa.
 */
export function buildSimulatedWebhookPayload(
  chargeExternalId: string,
  statusExterno: "PAGA" | "EXPIRADA" | "CANCELADA" | "ESTORNADA" | "FALHA",
  eventId?: string,
): { body: string; signature: string } {
  const body = JSON.stringify({
    event_id: eventId ?? `mock_evt_${randomUUID()}`,
    charge_external_id: chargeExternalId,
    status: statusExterno,
    occurred_at: new Date().toISOString(),
  });
  return { body, signature: signPayload(body) };
}
