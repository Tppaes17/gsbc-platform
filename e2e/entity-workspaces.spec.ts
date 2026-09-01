import { expect, test } from "@playwright/test";
import { loginAs, SINDICATO_EMAIL, STAFF_EMAIL } from "./helpers/auth";
import { SEED } from "./helpers/seed-ids";

async function expectNoMainOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => {
    const main = document.querySelector("main") as HTMLElement | null;
    if (!main) return 0;
    return Math.max(0, main.scrollWidth - main.clientWidth);
  });
  expect(overflow).toBe(0);
}

test("Empresa Workspace mantém contexto, relações e navegação local", async ({ page }) => {
  await loginAs(page, STAFF_EMAIL);
  await page.goto(`/backoffice/empresas/${SEED.empresaBomPreco}`);

  await expect(page.getByRole("heading", { name: /Mercado Bom Preço/ })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navegação da entidade" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Visão geral/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Compliance/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Financeiro/ })).toBeVisible();
  await expect(page.getByText("Empresa → Instrumento → Obrigação → Cobrança")).toBeVisible();

  await page.getByRole("link", { name: /Financeiro/ }).click();
  await expect(page).toHaveURL(/#financeiro$/);
  await expect(page.locator("#financeiro").getByText("Saldo em aberto")).toBeVisible();

  await page.getByRole("link", { name: /Histórico/ }).click();
  await expect(page).toHaveURL(/#historico$/);
  await expect(page.locator("#historico").getByText("Timeline consolidada")).toBeVisible();
});

test("Empresa Workspace funciona em 320px sem overflow operacional", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 812 });
  await loginAs(page, STAFF_EMAIL);
  await page.goto(`/backoffice/empresas/${SEED.empresaBomPreco}`);

  await expect(page.getByRole("heading", { name: /Mercado Bom Preço/ })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navegação da entidade" })).toBeVisible();
  await expect(page.locator("#overview").getByText("Exposição", { exact: true })).toBeVisible();
  await expectNoMainOverflow(page);
});

test("Cobrança Workspace prova segunda entidade sem confundir obrigação e dívida", async ({ page }) => {
  await loginAs(page, STAFF_EMAIL);
  await page.goto(`/backoffice/cobrancas/${SEED.cobrancaBomPreco}`);

  await expect(page.getByRole("navigation", { name: "Navegação da entidade" })).toBeVisible();
  await expect(page.locator("#overview").getByText("Obrigação de origem")).toBeVisible();
  await expect(page.locator("#overview").getByText("Valor de referência")).toBeVisible();
  await expect(page.getByRole("link", { name: /Financeiro/ })).toBeVisible();

  await page.getByRole("link", { name: /Contestação/ }).click();
  await expect(page).toHaveURL(/#contestacao$/);
  await expect(
    page.locator("#contestacao").getByRole("heading", { name: "Contestação" }),
  ).toBeVisible();
});

test("Workspace preserva permissões parciais em Empresa e Cobrança", async ({ page }) => {
  await loginAs(page, SINDICATO_EMAIL);

  await page.goto(`/backoffice/empresas/${SEED.empresaBomPreco}`);
  await expect(page.getByRole("navigation", { name: "Navegação da entidade" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Cadastro/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Compliance/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Documentos/ })).toBeVisible();
  await expect(page.getByText("Inteligência cadastral")).toHaveCount(0);

  await page.goto(`/backoffice/cobrancas/${SEED.cobrancaBomPreco}`);
  await expect(page.getByRole("navigation", { name: "Navegação da entidade" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mudar status" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Registrar pagamento" })).toHaveCount(0);
  await expect(page.getByText("Cobrança digital")).toHaveCount(0);
});
