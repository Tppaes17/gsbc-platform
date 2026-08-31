import { expect, test } from "@playwright/test";
import { loginAs, SINDICATO_EMAIL, STAFF_EMAIL } from "./helpers/auth";

test("staff vê navegação agrupada, contexto e estado ativo", async ({ page }) => {
  await loginAs(page, STAFF_EMAIL);

  const nav = page.getByRole("navigation", { name: "Navegação do backoffice" }).first();
  await expect(nav.locator("#nav-group-overview")).toBeVisible();
  await expect(nav.locator("#nav-group-revenue")).toBeVisible();
  await expect(nav.locator("#nav-group-compliance")).toBeVisible();
  await expect(nav.locator("#nav-group-finance")).toBeVisible();
  await expect(nav.locator("#nav-group-operations")).toBeVisible();
  await expect(nav.locator("#nav-group-governance")).toBeVisible();
  await expect(page.getByText("Backoffice GSBC").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Menu do usuário" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Buscar no GSBC/ })).toBeVisible();

  await page.goto("/backoffice/cobrancas");
  await expect(page.getByRole("link", { name: "Cobranças" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
  await expect(breadcrumb.getByText("Receita")).toBeVisible();
  await expect(breadcrumb.getByText("Cobranças")).toBeVisible();
});

test("sindicato não vê grupos ou links restritos a staff/owner", async ({ page }) => {
  await loginAs(page, SINDICATO_EMAIL);

  const nav = page.getByRole("navigation", { name: "Navegação do backoffice" }).first();
  await expect(nav.getByText("OPERAÇÃO")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Oportunidades" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Conciliação" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Contratos" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Políticas" })).toHaveCount(0);
  await expect(page.getByText("Sindicato Demonstração").first()).toBeVisible();
});

test("mobile abre navegação por domínio e fecha ao navegar", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await loginAs(page, STAFF_EMAIL);

  await page.getByRole("button", { name: "Abrir menu" }).click();
  const mobileNav = page.getByRole("navigation", { name: "Navegação do backoffice" });
  await expect(mobileNav.locator("#nav-group-revenue")).toBeVisible();
  await expect(mobileNav.getByRole("link", { name: "Cobranças" })).toBeVisible();

  await mobileNav.getByRole("link", { name: "Cobranças" }).click();
  await page.waitForURL("**/backoffice/cobrancas");
  await expect(page.getByRole("heading", { name: "Cobranças" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navegação do backoffice" })).toHaveCount(0);
});
