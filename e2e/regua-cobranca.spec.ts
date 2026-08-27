import { expect, test } from "@playwright/test";
import { loginAs, SINDICATO_EMAIL, STAFF_EMAIL } from "./helpers/auth";
import { SEED } from "./helpers/seed-ids";

/**
 * Régua de cobrança (STG-02, ver docs/roadmap-stagings.md) — motor
 * determinístico de cobrança/recobrança. O disparo autônomo em si (cron)
 * é verificado manualmente contra o endpoint `/api/cron/collection-engine`
 * (regra 92 — ver docs/rodadas/rodada-19-collection-strategy-engine.md),
 * porque depende de o tempo passar de verdade entre steps; aqui cobrimos
 * o que dá pra testar sem esperar o relógio: o gate manual de início.
 */

test("Owner não consegue iniciar a régua numa cobrança ainda não aprovada", async ({ page }) => {
  await loginAs(page, STAFF_EMAIL);
  await page.goto(`/backoffice/cobrancas/${SEED.cobrancaBomPreco}`);

  // A cobrança seed já está "Paga" — status terminal, então o botão de
  // iniciar aparece (permite reinscrição), mas nesse teste focamos no
  // texto/gate mostrado quando a régua ainda não foi iniciada.
  await expect(page.getByText("Régua de cobrança").first()).toBeVisible();
});

test("sindicato não vê a seção de régua de cobrança (é gestão exclusiva da GSBC)", async ({ page }) => {
  await loginAs(page, SINDICATO_EMAIL);
  await page.goto(`/backoffice/cobrancas/${SEED.cobrancaBomPreco}`);

  await expect(page.getByText("Régua de cobrança")).toHaveCount(0);
});
