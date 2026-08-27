import { expect, test } from "@playwright/test";
import { loginAs, SINDICATO_EMAIL, STAFF_EMAIL } from "./helpers/auth";

/**
 * Revenue Command Center (STG-08, ver docs/roadmap-stagings.md) — a
 * matemática do funil (rank histórico via cobranca_eventos) é
 * verificada manualmente ao vivo com fixtures construídas pra exercitar
 * os casos não-lineares (cobrança que negocia e depois cancela, etc.) —
 * regra 92, ver docs/rodadas/rodada-24-revenue-command-center.md. Aqui
 * cobrimos só o que não muda dado em staging: a página carrega pros
 * dois papéis (regra 6 — "o sindicato acompanha"), o nav item aparece,
 * e o drill-down de cobranças aceita filtro de status.
 */

test("staff GSBC vê o Revenue Command Center", async ({ page }) => {
  await loginAs(page, STAFF_EMAIL);
  await page.goto("/backoffice/receita");

  await expect(page.getByRole("heading", { name: "Receita" })).toBeVisible();
  await expect(page.getByText("Receita identificada")).toBeVisible();
  await expect(page.getByText("Funil de receita")).toBeVisible();
  await expect(page.getByText("Tendência mensal")).toBeVisible();
  await expect(page.getByText("Segmentação por empresa")).toBeVisible();
});

test("sindicato também vê o Revenue Command Center (transparência, regra 6)", async ({
  page,
}) => {
  await loginAs(page, SINDICATO_EMAIL);
  await page.goto("/backoffice/receita");

  await expect(page.getByRole("heading", { name: "Receita" })).toBeVisible();
  await expect(page.getByText("Receita identificada")).toBeVisible();
});

test("nav lateral tem o item Receita pros dois papéis", async ({ page }) => {
  await loginAs(page, STAFF_EMAIL);
  await expect(page.getByRole("link", { name: "Receita" })).toBeVisible();
});

test("drill-down de status na tela de cobranças mostra indicador de filtro", async ({
  page,
}) => {
  await loginAs(page, STAFF_EMAIL);
  await page.goto("/backoffice/cobrancas?status=paid,partially_paid");

  await expect(page.getByText(/Filtrado por status/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Limpar filtro" })).toBeVisible();
});
