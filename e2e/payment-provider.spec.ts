import { expect, test } from "@playwright/test";
import { loginAs, SINDICATO_EMAIL, STAFF_EMAIL } from "./helpers/auth";
import { SEED } from "./helpers/seed-ids";

/**
 * Payment Provider Integration (STG-06, ver docs/roadmap-stagings.md) —
 * o ciclo completo (criar charge -> webhook assinado -> idempotência ->
 * fora de ordem -> pagamento registrado) é verificado manualmente ao
 * vivo, com curl direto no endpoint real
 * (`/api/webhooks/payments/mock`) — regra 92, ver
 * docs/rodadas/rodada-23-payment-provider.md. Aqui cobrimos só o que
 * não muda dado em staging: a seção existe, o aviso de simulação
 * aparece, e é exclusiva de staff (mesmo padrão de régua de cobrança,
 * Rodada 19 — ferramenta operacional, não transparência).
 */

test("staff GSBC vê a seção de cobrança via provider com aviso de simulação", async ({ page }) => {
  await loginAs(page, STAFF_EMAIL);
  await page.goto(`/backoffice/cobrancas/${SEED.cobrancaBomPreco}`);

  await expect(page.getByText("Cobrança via provider de pagamento").first()).toBeVisible();
  await expect(
    page.getByText("Nenhum provider de pagamento real está conectado"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Gerar Pix" })).toBeVisible();
});

test("sindicato não vê a seção de cobrança via provider (gestão exclusiva da GSBC)", async ({
  page,
}) => {
  await loginAs(page, SINDICATO_EMAIL);
  await page.goto(`/backoffice/cobrancas/${SEED.cobrancaBomPreco}`);

  await expect(page.getByText("Cobrança via provider de pagamento")).toHaveCount(0);
});

test("webhook rejeita assinatura inválida", async ({ request }) => {
  const response = await request.post("/api/webhooks/payments/mock", {
    headers: { "x-webhook-signature": "assinatura-forjada" },
    data: { event_id: "e2e_test", charge_external_id: "mock_charge_inexistente", status: "PAGA" },
  });

  expect(response.status()).toBe(401);
});

test("webhook rejeita corpo não JSON sem erro 500", async ({ request }) => {
  const response = await request.post("/api/webhooks/payments/mock", {
    headers: {
      "content-type": "application/json",
      "x-webhook-signature": "assinatura-forjada",
    },
    data: "not-json",
  });

  expect(response.status()).toBe(401);
});

test("webhook rejeita provider desconhecido", async ({ request }) => {
  const response = await request.post("/api/webhooks/payments/provider-inexistente", {
    data: {},
  });

  expect(response.status()).toBe(404);
});
