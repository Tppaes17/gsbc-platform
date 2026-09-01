import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const screenshotDir = "test-results/design-wave-6-website";

async function screenshot(page: Page, name: string, fullPage = false) {
  mkdirSync(screenshotDir, { recursive: true });
  await page.screenshot({
    path: join(screenshotDir, `${name}.png`),
    fullPage,
  });
}

test.describe("Wave 6 website visual QA", () => {
  test("desktop and tablet surfaces", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Compliance",
    );
    await screenshot(page, "1920-first-fold");

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await screenshot(page, "1440-first-fold");
    await screenshot(page, "1440-full", true);

    await page
      .getByRole("heading", {
        name: "Telas reais, dados demo e capacidades suportadas",
      })
      .scrollIntoViewIfNeeded();
    await screenshot(page, "1440-product-proof");

    await page
      .getByRole("heading", {
        name: "Isolamento, permissão e auditoria como estrutura",
      })
      .scrollIntoViewIfNeeded();
    await screenshot(page, "1440-governance-security");

    await page
      .getByRole("heading", {
        name: "Veja o GSBC operando sobre um fluxo sindical realista",
      })
      .scrollIntoViewIfNeeded();
    await screenshot(page, "1440-final-cta");

    await page.goto("/login");
    await screenshot(page, "1440-login");

    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto("/");
    await screenshot(page, "1024-home");

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");
    await screenshot(page, "768-home");
  });

  test("mobile surfaces", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "Solicitar demonstração" }).first(),
    ).toBeVisible();
    await screenshot(page, "375-first-fold");

    await page
      .getByRole("heading", {
        name: "Telas reais, dados demo e capacidades suportadas",
      })
      .scrollIntoViewIfNeeded();
    await screenshot(page, "375-product-proof");

    await page.getByRole("button", { name: "Abrir menu" }).click();
    await screenshot(page, "375-menu");

    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto("/");
    await screenshot(page, "320-first-fold");

    await page
      .getByRole("heading", {
        name: "Veja o GSBC operando sobre um fluxo sindical realista",
      })
      .scrollIntoViewIfNeeded();
    await screenshot(page, "320-cta-contact");
  });
});
