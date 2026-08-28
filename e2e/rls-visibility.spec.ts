import { expect, test } from "@playwright/test";
import { loginAs, SINDICATO_EMAIL, STAFF_EMAIL } from "./helpers/auth";
import { SEED } from "./helpers/seed-ids";

/**
 * Regressão de RLS/UI — regra 6 ("a GSBC executa, o sindicato
 * acompanha"): a equipe GSBC gerencia, o sindicato só lê o que é do
 * próprio tenant. Somente leitura — seguro rodar contra dados já
 * semeados sem precisar de `supabase db reset` antes.
 */

test.describe("Visão da equipe GSBC (staff)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, STAFF_EMAIL);
  });

  test("dashboard cumprimenta pelo primeiro nome e mostra todos os módulos no menu", async ({
    page,
  }) => {
    await expect(page.getByRole("heading", { name: "Olá, Admin" })).toBeVisible();
    for (const label of [
      "Sindicatos",
      "Empresas",
      "Instrumentos",
      "Cobranças",
      "Negociações",
      "Financeiro",
      "Usuários",
      "Auditoria",
    ]) {
      await expect(page.getByRole("link", { name: label, exact: true })).toBeVisible();
    }
  });

  test("pode gerenciar a cobrança: vê ações de mudar status e registrar pagamento", async ({
    page,
  }) => {
    await page.goto(`/backoffice/cobrancas/${SEED.cobrancaBomPreco}`);
    await expect(page.getByRole("button", { name: "Mudar status" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Registrar pagamento" }),
    ).toBeVisible();
  });

  test("relatório financeiro mostra a coluna Sindicato (visão cross-tenant)", async ({
    page,
  }) => {
    await page.goto("/backoffice/financeiro");
    await expect(page.getByRole("columnheader", { name: "Sindicato" })).toBeVisible();
  });
});

test.describe("Visão do sindicato (dirigente)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, SINDICATO_EMAIL);
  });

  test("dashboard cumprimenta pelo primeiro nome", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Olá, Dirigente" })).toBeVisible();
  });

  test("acompanha a cobrança mas não vê ações de gestão exclusivas da GSBC", async ({
    page,
  }) => {
    await page.goto(`/backoffice/cobrancas/${SEED.cobrancaBomPreco}`);
    // Dado real da cobrança continua visível — sindicato acompanha.
    await expect(page.getByText("Status:")).toBeVisible();
    await expect(page.getByText("Pagamentos")).toBeVisible();
    // Ações exclusivas da equipe GSBC não aparecem.
    await expect(page.getByRole("button", { name: "Mudar status" })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Registrar pagamento" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Enviar notificação" }),
    ).toHaveCount(0);
  });

  test("relatório financeiro não mostra a coluna Sindicato (escopo do próprio tenant)", async ({
    page,
  }) => {
    await page.goto("/backoffice/financeiro");
    await expect(page.getByRole("columnheader", { name: "Sindicato" })).toHaveCount(0);
  });

  test("responsável da cobrança (staff GSBC) aparece com nome, não em branco", async ({
    page,
  }) => {
    // Regressão do bug real corrigido na Rodada 5 (migration 0009):
    // nome de staff GSBC precisa ficar visível para o sindicato.
    await page.goto(`/backoffice/negociacoes/${SEED.negociacaoBomPreco}`);
    await expect(page.getByText("Sem responsável definido")).toHaveCount(0);
    await expect(page.getByText("Admin GSBC (Demo)", { exact: true })).toBeVisible();
  });
});
