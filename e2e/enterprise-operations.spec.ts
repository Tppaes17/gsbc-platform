import { expect, test } from "@playwright/test";
import { loginAs, STAFF_EMAIL } from "./helpers/auth";

async function expectNoMainOverflow(page: import("@playwright/test").Page) {
  const result = await page.evaluate(() => {
    const doc = document.documentElement;
    const width = doc.clientWidth;
    const clipped = Array.from(document.querySelectorAll("main *")).some((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && (rect.left < -1 || rect.right > width + 1);
    });
    return { overflow: doc.scrollWidth > width + 1, clipped };
  });

  expect(result).toEqual({ overflow: false, clipped: false });
}

test("Cobranças prova grid enterprise no desktop e card operacional no mobile", async ({
  page,
}) => {
  await loginAs(page, STAFF_EMAIL);
  await page.goto("/backoffice/cobrancas");

  const table = page.getByRole("table", { name: "Cobranças" });
  await expect(table).toBeVisible();
  await page.getByRole("button", { name: /Valor/ }).click();
  await expect(page.getByRole("columnheader", { name: /Valor/ })).toHaveAttribute(
    "aria-sort",
    /ascending|descending/,
  );

  await page.setViewportSize({ width: 375, height: 812 });
  await page.reload();
  await expect(page.getByRole("table", { name: "Cobranças" })).toHaveCount(0);
  await page.getByPlaceholder("Buscar por empresa...").fill("Bom");
  const cobrancaCard = page.locator("article").filter({ hasText: "Mercado Bom Preço" }).first();
  await expect(cobrancaCard).toBeVisible();
  await expect(cobrancaCard.getByText("R$").first()).toBeVisible();
  await expect(cobrancaCard.getByText("Vencimento")).toBeVisible();
  await cobrancaCard.getByRole("link", { name: "Abrir cobrança" }).click();
  await expect(page).toHaveURL(/\/backoffice\/cobrancas\//);
});

test("Empresas mantém identidade, CNPJ, status e ação em 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 812 });
  await loginAs(page, STAFF_EMAIL);
  await page.goto("/backoffice/empresas");

  await page.getByPlaceholder("Buscar por razão social, nome fantasia ou CNPJ...").fill("Bom");
  const empresaCard = page.locator("article").filter({ hasText: "Mercado Bom Preço" }).first();
  await expect(empresaCard).toBeVisible();
  await expect(empresaCard.getByText("CNPJ")).toBeVisible();
  await expect(empresaCard.getByText(/Ativa|Inativa/)).toBeVisible();
  await expectNoMainOverflow(page);
  await empresaCard.getByRole("link", { name: "Abrir empresa" }).click();
  await expect(page).toHaveURL(/\/backoffice\/empresas\//);
});

test("Financeiro preserva valores, status e detalhe no padrão mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await loginAs(page, STAFF_EMAIL);
  await page.goto("/backoffice/financeiro");

  await page.getByPlaceholder("Buscar por empresa...").fill("Bom");
  const financeiroCard = page.locator("article").filter({ hasText: "Mercado Bom Preço" }).first();
  await expect(financeiroCard).toBeVisible();
  await expect(financeiroCard.getByText("Saldo")).toBeVisible();
  await expect(financeiroCard.getByText("Pago")).toBeVisible();
  await expect(financeiroCard.getByText("Total")).toBeVisible();
  await expect(financeiroCard.getByText("R$").first()).toBeVisible();
  await expectNoMainOverflow(page);
  await financeiroCard.getByRole("link", { name: "Abrir cobrança" }).click();
  await expect(page).toHaveURL(/\/backoffice\/cobrancas\//);
});

test("superfícies de referência não têm overflow operacional em 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 812 });
  await loginAs(page, STAFF_EMAIL);

  for (const route of ["/backoffice/cobrancas", "/backoffice/empresas", "/backoffice/financeiro"]) {
    await page.goto(route);
    await expectNoMainOverflow(page);
  }
});
