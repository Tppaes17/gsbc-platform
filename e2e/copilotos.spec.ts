import { expect, test } from "@playwright/test";
import { loginAs, SINDICATO_EMAIL, STAFF_EMAIL } from "./helpers/auth";
import { SEED } from "./helpers/seed-ids";

/**
 * AI Copilots (STG-12, ver docs/roadmap-stagings.md) — Negotiation
 * Copilot e Collections Copilot. O ciclo completo de geração de
 * sugestão via IA depende de ANTHROPIC_API_KEY (não configurada em
 * staging nem localmente neste momento) e foi verificado manualmente
 * com fixtures construídas pra isso — ver
 * docs/rodadas/rodada-28-ai-copilot.md. Aqui cobrimos o que não
 * depende de chamada real de IA: as seções existem e são exclusivas
 * de staff GSBC, e o estado "IA não configurada" aparece claramente
 * em vez de falhar silenciosamente (regra 9 — não criar
 * funcionalidade falsa).
 */

test("staff GSBC vê o Negotiation Copilot na negociação, com aviso de IA não configurada", async ({
  page,
}) => {
  await loginAs(page, STAFF_EMAIL);
  await page.goto(`/backoffice/negociacoes/${SEED.negociacaoBomPreco}`);

  await expect(page.locator('[data-slot="card-title"]', { hasText: "Negotiation Copilot" })).toBeVisible();
  await expect(page.getByText("IA não configurada")).toBeVisible();
});

test("staff GSBC vê o Collections Copilot na cobrança, com aviso de IA não configurada", async ({
  page,
}) => {
  await loginAs(page, STAFF_EMAIL);
  await page.goto(`/backoffice/cobrancas/${SEED.cobrancaBomPreco}`);

  await expect(page.locator('[data-slot="card-title"]', { hasText: "Collections Copilot" })).toBeVisible();
  await expect(page.getByText("IA não configurada")).toBeVisible();
});

test("sindicato não vê o Negotiation Copilot", async ({ page }) => {
  await loginAs(page, SINDICATO_EMAIL);
  await page.goto(`/backoffice/negociacoes/${SEED.negociacaoBomPreco}`);

  await expect(page.getByText("Negotiation Copilot")).toHaveCount(0);
});

test("sindicato não vê o Collections Copilot", async ({ page }) => {
  await loginAs(page, SINDICATO_EMAIL);
  await page.goto(`/backoffice/cobrancas/${SEED.cobrancaBomPreco}`);

  await expect(page.getByText("Collections Copilot")).toHaveCount(0);
});
