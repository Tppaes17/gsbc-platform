import "server-only";
import type { PaymentProviderName } from "@/types/database.types";
import type { PaymentProvider } from "./provider";
import { mockPaymentProvider } from "./mock-provider";

/**
 * Resolve o adapter pelo nome do provider — único ponto que o resto do
 * sistema toca pra pegar um PaymentProvider. Quando um provider real
 * existir, adiciona-se um case aqui; nenhum outro arquivo muda.
 */
export function getPaymentProvider(name: PaymentProviderName): PaymentProvider {
  switch (name) {
    case "mock":
      return mockPaymentProvider;
    default:
      throw new Error(`Provider de pagamento desconhecido: ${name}`);
  }
}

/** Provider ativo por padrão — só 'mock' existe até um provider real ser conectado. */
export const ACTIVE_PAYMENT_PROVIDER: PaymentProviderName = "mock";
