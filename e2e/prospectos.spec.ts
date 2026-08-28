import { expect, test } from "@playwright/test";
import { loginAs, SINDICATO_EMAIL, STAFF_EMAIL } from "./helpers/auth";
import { createProspectosFixture } from "./helpers/prospectos-fixture";

/**
 * Prospectos (Rodada 16) — upload de planilha de pesquisa já realizada,
 * restrito a Owners (mapeados a gsbc_super_admin). O arquivo de teste
 * segue o template exato descoberto nas duas planilhas de referência do
 * usuário (colunas de PROSPECTO_COLUNAS_ESPERADAS).
 */

test("Owner vê o menu Prospectos e importa uma planilha", async ({ page }, testInfo) => {
  const fixture = createProspectosFixture(testInfo);

  await loginAs(page, STAFF_EMAIL);

  await expect(page.getByRole("link", { name: "Empresas Prospectadas" })).toBeVisible();
  await page.getByRole("link", { name: "Empresas Prospectadas" }).click();
  await page.waitForURL("**/backoffice/prospectos");

  await page.getByRole("button", { name: "Importar planilha" }).click();
  await page.locator('input#file[type="file"]').setInputFiles(fixture.path);
  await page.getByRole("button", { name: "Importar" }).click();

  await expect(page.getByText(/2 prospecto\(s\) novo\(s\)/)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("paragraph").filter({ hasText: "linha(s) com erro" })).toBeVisible();

  await page.getByRole("button", { name: "Close" }).click();

  await expect(page.getByText(fixture.nomeUm)).toBeVisible();
  await expect(page.getByText(fixture.nomeDois)).toBeVisible();

  await page.getByText(fixture.nomeUm).click();
  await page.waitForURL("**/backoffice/prospectos/**");
  await expect(page.getByText("Inteligência cadastral")).toBeVisible();
  await expect(page.getByRole("button", { name: "Consultar CNPJ oficial" })).toBeVisible();
});

test("sindicato não vê o menu Prospectos e não acessa a rota", async ({ page }) => {
  await loginAs(page, SINDICATO_EMAIL);

  await expect(page.getByRole("link", { name: "Empresas Prospectadas" })).toHaveCount(0);

  await page.goto("/backoffice/prospectos");
  await page.waitForURL("**/backoffice");
});
