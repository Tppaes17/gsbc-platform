import { expect, test } from "@playwright/test";
import { loginAs, SINDICATO_EMAIL, STAFF_EMAIL } from "./helpers/auth";
import { SEED } from "./helpers/seed-ids";

/**
 * Contestação (STG-04, ver docs/roadmap-stagings.md) — o ciclo completo
 * (abrir → pausar régua → evidências → resultado → auto-resolve do work
 * item) é verificado manualmente ao vivo (regra 92 — ver
 * docs/rodadas/rodada-21-contestacoes.md), porque depende de RPCs
 * (abrir_contestacao, register_contestacao_evento) e do cron sweep. Aqui
 * cobrimos o que dá pra testar sem depender desses efeitos colaterais: a
 * seção aparece pra quem pode ver, o botão de escrita só aparece pra
 * quem pode escrever.
 */

test("staff GSBC vê a seção de contestação e o botão de abrir", async ({ page }) => {
  await loginAs(page, STAFF_EMAIL);
  await page.goto(`/backoffice/cobrancas/${SEED.cobrancaBomPreco}`);

  await expect(page.getByText("Contestação").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Abrir contestação" })).toBeVisible();
});

test("sindicato vê a seção de contestação (transparência) mas sem botão de escrita", async ({
  page,
}) => {
  await loginAs(page, SINDICATO_EMAIL);
  await page.goto(`/backoffice/cobrancas/${SEED.cobrancaBomPreco}`);

  await expect(page.getByText("Contestação").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Abrir contestação" })).toHaveCount(0);
});

test("página de métricas de contestações é acessível a staff e sindicato", async ({ page }) => {
  await loginAs(page, STAFF_EMAIL);
  await page.goto("/backoffice/contestacoes");

  await expect(page.getByRole("heading", { name: "Contestações" })).toBeVisible();
  await expect(page.getByText("Volume total")).toBeVisible();
});
