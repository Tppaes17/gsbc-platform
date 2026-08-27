import "server-only";
import type { PaymentChargeStatus, PaymentChargeTipo, PaymentProviderName } from "@/types/database.types";

/**
 * PaymentProvider (STG-06) — a abstração que o roadmap pede
 * ("Abstração: PaymentProvider. Adapter: ProviderXAdapter"). Toda
 * integração real futura (Efí, Asaas, Pagar.me, etc.) implementa esta
 * mesma interface — o resto do sistema (charge creation, webhook
 * processing, UI) nunca conhece detalhes de um provider específico.
 *
 * internal_id (payment_charges.id) e external_id (o que o provider
 * retorna) são deliberadamente dois campos diferentes, nunca
 * confundidos — regra explícita do roadmap.
 */

export interface CreateChargeInput {
  internalId: string;
  valor: number;
  tipo: PaymentChargeTipo;
  descricao: string;
  payerName: string;
  payerDocument: string;
  expiresInSeconds?: number;
}

export interface ChargeResult {
  externalId: string;
  status: PaymentChargeStatus;
  externalStatus: string;
  qrCode?: string;
  linhaDigitavel?: string;
  boletoUrl?: string;
  expiresAt?: string;
}

export interface RefundResult {
  refundId: string;
  status: string;
}

export interface WebhookEvent {
  externalEventId: string;
  chargeExternalId: string;
  status: PaymentChargeStatus;
  externalStatus: string;
  occurredAt: string;
}

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  createCharge(input: CreateChargeInput): Promise<ChargeResult>;
  getCharge(externalId: string): Promise<ChargeResult>;
  cancelCharge(externalId: string): Promise<void>;
  refundPayment(externalId: string, valor?: number): Promise<RefundResult>;
  /** Sempre chamar antes de confiar em qualquer coisa do corpo do webhook (regra de segurança do roadmap). */
  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean;
  parseWebhookEvent(rawBody: string): WebhookEvent;
}
