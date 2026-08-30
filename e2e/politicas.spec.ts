import { expect, test } from "@playwright/test";
import { loginAs, SINDICATO_EMAIL, STAFF_EMAIL } from "./helpers/auth";

/**
 * Policy Engine (STG-11, ver docs/roadmap-stagings.md) — o ciclo
 * completo (desconto -> aguardando aprovação -> aprovar/rejeitar, os
 * dois níveis de segurança do gate, a varredura de acordo inadimplente
 * e o toggle ativa/desativa) é verificado manualmente ao vivo com
 * fixtures construídas pra isso — regra 92, ver
 * docs/rodadas/rodada-27-policy-engine.md. Aqui cobrimos só o que não
 * muda dado em staging: a página existe, lista as 5 políticas, e
 * continua exclusiva de staff GSBC.
 */

test("staff GSBC vê a página de Políticas com as 5 políticas registradas", async ({ page }) => {
  await loginAs(page, STAFF_EMAIL);
  await page.goto("/backoffice/politicas");

  await expect(page.getByRole("heading", { name: "Políticas" })).toBeVisible();
  const policyTitles = page.locator('[data-slot="card-title"]');
  await expect(policyTitles.filter({ hasText: /^Desconto exige aprovação$/ })).toBeVisible();
  await expect(policyTitles.filter({ hasText: /^Acordo inadimplente cria item de trabalho$/ })).toBeVisible();
  await expect(policyTitles.filter({ hasText: /^Pagamento identificado pausa cobrança$/ })).toBeVisible();
  await expect(policyTitles.filter({ hasText: /^Contestação suspende automação$/ })).toBeVisible();
  await expect(policyTitles.filter({ hasText: /^Régua avança por agendamento$/ })).toBeVisible();
});

test("nav lateral tem o item Políticas pra staff", async ({ page }) => {
  await loginAs(page, STAFF_EMAIL);
  await expect(page.getByRole("link", { name: "Políticas" })).toBeVisible();
});

test("sindicato não vê o menu Políticas nem acessa a rota", async ({ page }) => {
  await loginAs(page, SINDICATO_EMAIL);

  await expect(page.getByRole("link", { name: "Políticas" })).toHaveCount(0);

  await page.goto("/backoffice/politicas");
  await page.waitForURL("**/backoffice");
});
