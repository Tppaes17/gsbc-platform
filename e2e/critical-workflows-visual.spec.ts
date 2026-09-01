import { expect, test, type Locator, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { loginAs, SINDICATO_EMAIL, STAFF_EMAIL } from "./helpers/auth";
import { SEED } from "./helpers/seed-ids";

const screenshotDir = "test-results/design-wave-5-critical-workflows";

async function expectInViewport(locator: Locator, page: Page) {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();

  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height + 1);
}

async function screenshot(page: Page, name: string) {
  mkdirSync(screenshotDir, { recursive: true });
  await page.screenshot({
    fullPage: true,
    path: join(screenshotDir, `${name}.png`),
  });
}

test.describe("Wave 5 visual QA", () => {
  test("desktop: pagamento manual mantém diálogo crítico no viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAs(page, STAFF_EMAIL);
    await page.goto(`/backoffice/cobrancas/${SEED.cobrancaBomPreco}`);

    await page.getByRole("button", { name: "Registrar pagamento" }).click();
    const dialog = page.getByRole("dialog", { name: "Registrar pagamento" });
    await expect(dialog).toBeVisible();
    await expectInViewport(dialog, page);
    await screenshot(page, "desktop-payment-review");
  });

  test("mobile 375: notificação externa mantém confirmação acionável", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginAs(page, STAFF_EMAIL);
    await page.goto(`/backoffice/cobrancas/${SEED.cobrancaBomPreco}`);

    await page.getByRole("button", { name: "Enviar notificação" }).click();
    const dialog = page.getByRole("dialog", {
      name: "Enviar notificação por e-mail",
    });
    await expect(dialog).toBeVisible();
    await expectInViewport(dialog, page);
    await expect(
      page.getByRole("button", { name: "Enviar e registrar tentativa" }),
    ).toBeVisible();
    await screenshot(page, "mobile-375-notification-review");
  });

  test("mobile 320: negociação preserva distinção entre acordo e pagamento", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await loginAs(page, STAFF_EMAIL);
    await page.goto(`/backoffice/negociacoes/${SEED.negociacaoBomPreco}`);

    await page.getByRole("button", { name: "Registrar movimento" }).click();
    const dialog = page.getByRole("dialog", { name: "Registrar movimento" });
    await expect(dialog).toBeVisible();
    await expectInViewport(dialog, page);
    await expect(
      page.getByText("Não registra recebimento nem altera conciliação"),
    ).toBeVisible();
    await screenshot(page, "mobile-320-negotiation-review");
  });

  test("mobile 375: usuário sem permissão não recebe ações críticas", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginAs(page, SINDICATO_EMAIL);
    await page.goto(`/backoffice/cobrancas/${SEED.cobrancaBomPreco}`);

    await expect(
      page.getByRole("button", { name: "Registrar pagamento" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Enviar notificação" }),
    ).toHaveCount(0);
    await screenshot(page, "mobile-375-forbidden-critical-actions");
  });
});
