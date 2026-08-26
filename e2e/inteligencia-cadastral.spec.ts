import { expect, test } from "@playwright/test";
import { loginAs, SINDICATO_EMAIL, STAFF_EMAIL } from "./helpers/auth";
import { SEED } from "./helpers/seed-ids";

/**
 * Fase 1 do Agente Autônomo de Inteligência Cadastral (Rodada 14) —
 * restrito a Owners (mapeados a gsbc_super_admin). Somente leitura para
 * fins de visibilidade; a consulta em si (que muta dados) é verificada
 * manualmente porque depende de uma chamada real à BrasilAPI.
 */

test("Owner vê a seção de inteligência cadastral na ficha da empresa", async ({ page }) => {
  await loginAs(page, STAFF_EMAIL);
  await page.goto(`/backoffice/empresas/${SEED.empresaBomPreco}`);

  await expect(page.getByText("Inteligência cadastral")).toBeVisible();
  await expect(page.getByRole("button", { name: "Consultar CNPJ oficial" })).toBeVisible();
});

test("sindicato não vê a seção de inteligência cadastral (Owner apenas)", async ({ page }) => {
  await loginAs(page, SINDICATO_EMAIL);
  await page.goto(`/backoffice/empresas/${SEED.empresaBomPreco}`);

  await expect(page.getByText("Inteligência cadastral")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Consultar CNPJ oficial" }),
  ).toHaveCount(0);
});
