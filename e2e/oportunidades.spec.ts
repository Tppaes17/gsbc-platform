import { expect, test } from "@playwright/test";
import { loginAs, SINDICATO_EMAIL, STAFF_EMAIL } from "./helpers/auth";

/**
 * Revenue Opportunity Engine (STG-10, ver docs/roadmap-stagings.md) — o
 * cálculo do score em si (fit territorial/atividade, potencial
 * econômico a partir de histórico real, explicabilidade por dimensão) é
 * verificado manualmente ao vivo com fixtures construídas pra isso —
 * regra 92, ver docs/rodadas/rodada-26-revenue-opportunity-engine.md.
 * Aqui cobrimos só o que não muda dado em staging: a seção existe na
 * ficha de um prospecto real, o módulo continua exclusivo de Owner
 * (mesmo gate de Prospectos, Rodada 14).
 */

test("Owner vê o Opportunity Engine na ficha de um prospecto", async ({ page }) => {
  await loginAs(page, STAFF_EMAIL);
  await page.goto("/backoffice/prospectos");

  await page.locator("table tbody tr").first().locator("a").first().click();
  await page.waitForURL("**/backoffice/prospectos/**");

  await expect(page.getByText("Opportunity Engine")).toBeVisible();
});

test("sindicato não acessa Prospectos nem o Opportunity Engine", async ({ page }) => {
  await loginAs(page, SINDICATO_EMAIL);

  await page.goto("/backoffice/prospectos");
  await page.waitForURL("**/backoffice");
});
