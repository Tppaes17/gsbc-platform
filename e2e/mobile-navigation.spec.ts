import { expect, test } from "@playwright/test";
import { loginAs, SINDICATO_EMAIL, STAFF_EMAIL } from "./helpers/auth";

/**
 * Navegação mobile do backoffice (Stage 2 da revisão de design,
 * docs/design/stage-02-navigation.md) — antes deste stage, abaixo de
 * 768px o backoffice ficava sem NENHUMA forma de navegar (achado #01,
 * severidade High no GSBC Design Baseline). MobileSidebar lê a mesma
 * SidebarNav/NAV_ITEMS da sidebar desktop — mesma regra de permissão,
 * nunca duplicada.
 */

test.use({ viewport: { width: 390, height: 844 } });

test("staff GSBC abre o drawer mobile, navega e o drawer fecha sozinho", async ({ page }) => {
  await loginAs(page, STAFF_EMAIL);

  // Sidebar desktop não deve ocupar espaço em mobile.
  await expect(page.getByRole("link", { name: "Empresas", exact: true })).not.toBeInViewport();

  await page.getByRole("button", { name: "Abrir menu" }).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("link", { name: "Empresas", exact: true })).toBeVisible();
  await expect(drawer.getByRole("link", { name: "Políticas" })).toBeVisible();

  await drawer.getByRole("link", { name: "Empresas", exact: true }).click();
  await page.waitForURL("**/backoffice/empresas");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("Escape fecha o drawer mobile", async ({ page }) => {
  await loginAs(page, STAFF_EMAIL);

  await page.getByRole("button", { name: "Abrir menu" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("sindicato vê no drawer mobile só os itens autorizados (mesma regra da sidebar desktop)", async ({
  page,
}) => {
  await loginAs(page, SINDICATO_EMAIL);

  await page.getByRole("button", { name: "Abrir menu" }).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer.getByRole("link", { name: "Empresas" })).toBeVisible();
  await expect(drawer.getByRole("link", { name: "Oportunidades" })).toHaveCount(0);
  await expect(drawer.getByRole("link", { name: "Políticas" })).toHaveCount(0);
});

test("desktop continua com a sidebar fixa, sem botão de menu", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAs(page, STAFF_EMAIL);

  await expect(page.getByRole("link", { name: "Empresas", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Abrir menu" })).not.toBeVisible();
});
