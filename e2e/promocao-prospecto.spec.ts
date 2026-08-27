import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginAs, STAFF_EMAIL } from "./helpers/auth";

/**
 * Promoção de Prospecto para Empresa (STG-01, ver docs/roadmap-stagings.md)
 * — elimina o recadastro manual: importa uma planilha (Rodada 16),
 * promove um dos prospectos resultantes e confirma que a empresa nasce
 * com o mesmo dossiê/evidências, sem recadastro.
 */

const SAMPLE_XLSX = path.join(__dirname, "fixtures", "prospectos-teste.xlsx");

test("Owner promove um prospecto para empresa sem recadastro", async ({ page }) => {
  await loginAs(page, STAFF_EMAIL);

  await page.goto("/backoffice/prospectos");
  await page.getByRole("button", { name: "Importar planilha" }).click();
  await page.locator('input#file[type="file"]').setInputFiles(SAMPLE_XLSX);
  await page.getByRole("button", { name: "Importar" }).click();
  await expect(page.getByText(/2 prospecto\(s\) novo\(s\)/)).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Close" }).click();

  await page.getByText("PROVEDOR TESTE UM LTDA").click();
  await page.waitForURL("**/backoffice/prospectos/**");

  await page.getByRole("button", { name: "Promover para empresa" }).click();
  await expect(page.getByRole("heading", { name: "Promover prospecto para empresa" })).toBeVisible();
  await page.getByRole("button", { name: "Promover para empresa" }).last().click();

  await page.waitForURL("**/backoffice/empresas/**");
  await expect(page.getByRole("heading", { name: "PROVEDOR TESTE UM LTDA" })).toBeVisible();
  await expect(page.getByText("Inteligência cadastral")).toBeVisible();
  await expect(page.getByText(/contato@provedorteste1\.com\.br/i).first()).toBeVisible();

  await page.goto("/backoffice/empresas");
  await expect(page.getByText("PROVEDOR TESTE UM LTDA").first()).toBeVisible();

  await page.goto("/backoffice/prospectos");
  await expect(page.getByText("PROVEDOR TESTE UM LTDA")).toHaveCount(0);
});
