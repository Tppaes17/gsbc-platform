import { expect, test } from "@playwright/test";
import { loginAs, STAFF_EMAIL } from "./helpers/auth";
import { createProspectosFixture } from "./helpers/prospectos-fixture";

/**
 * Promoção de Prospecto para Empresa (STG-01, ver docs/roadmap-stagings.md)
 * — elimina o recadastro manual: importa uma planilha (Rodada 16),
 * promove um dos prospectos resultantes e confirma que a empresa nasce
 * com o mesmo dossiê/evidências, sem recadastro.
 */

test("Owner promove um prospecto para empresa sem recadastro", async ({ page }, testInfo) => {
  const fixture = createProspectosFixture(testInfo);

  await loginAs(page, STAFF_EMAIL);

  await page.goto("/backoffice/prospectos");
  await page.getByRole("button", { name: "Importar planilha" }).click();
  await page.locator('input#file[type="file"]').setInputFiles(fixture.path);
  await page.getByRole("button", { name: "Importar" }).click();
  await expect(page.getByText(/2 prospecto\(s\) novo\(s\)/)).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Close" }).click();

  await page.getByText(fixture.nomeUm).click();
  await page.waitForURL("**/backoffice/prospectos/**");

  await page.getByRole("button", { name: "Promover para empresa" }).click();
  await expect(page.getByRole("heading", { name: "Promover prospecto para empresa" })).toBeVisible();
  await page.getByRole("button", { name: "Promover para empresa" }).last().click();

  await page.waitForURL("**/backoffice/empresas/**");
  await expect(page.getByRole("heading", { name: fixture.nomeUm })).toBeVisible();
  await expect(page.getByText("Inteligência cadastral")).toBeVisible();
  await expect(page.getByText(fixture.emailUm).first()).toBeVisible();

  await page.goto("/backoffice/empresas");
  await expect(page.getByText(fixture.nomeUm).first()).toBeVisible();

  await page.goto("/backoffice/prospectos");
  await expect(page.getByText(fixture.nomeUm)).toHaveCount(0);
});
