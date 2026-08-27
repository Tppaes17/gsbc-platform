import { type NextRequest, NextResponse } from "next/server";
import { processPaymentWebhook } from "@/lib/payments/webhook-processor";
import type { PaymentProviderName } from "@/types/database.types";

const KNOWN_PROVIDERS: PaymentProviderName[] = ["mock"];

/**
 * Endpoint público de webhook (STG-06) — chamado pelo provider de
 * pagamento, nunca por um usuário logado. Sem sessão Supabase; toda
 * autorização vem da verificação de assinatura dentro de
 * processPaymentWebhook(), não de auth.uid()/RLS.
 *
 * Sempre responde 200 quando o evento foi ao menos persistido (mesmo
 * que ignorado/rejeitado depois) — só um erro de infraestrutura real
 * (provider desconhecido) deveria fazer o provider tentar de novo.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;

  if (!KNOWN_PROVIDERS.includes(provider as PaymentProviderName)) {
    return NextResponse.json({ error: "Provider desconhecido." }, { status: 404 });
  }

  const rawBody = await request.text();
  const signatureHeader = request.headers.get("x-webhook-signature");

  const result = await processPaymentWebhook(provider as PaymentProviderName, rawBody, signatureHeader);

  if (result.status === "invalid_signature") {
    return NextResponse.json({ error: result.message }, { status: 401 });
  }

  return NextResponse.json({ status: result.status, message: result.message });
}
