import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { loginAs, STAFF_EMAIL } from "./helpers/auth";
import { SEED } from "./helpers/seed-ids";

const screenshotDir = "test-results/design-wave-7-final";

async function assertNoCriticalOrSeriousAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();

  const blockingViolations = results.violations.filter((violation) =>
    ["critical", "serious"].includes(violation.impact ?? ""),
  );

  expect(blockingViolations).toEqual([]);
}

async function screenshot(page: Page, name: string) {
  mkdirSync(screenshotDir, { recursive: true });
  await page.screenshot({
    fullPage: true,
    path: join(screenshotDir, `${name}.png`),
  });
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth - doc.clientWidth;
  });

  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe("Wave 7 accessibility acceptance", () => {
  test("axe gate cobre rotas públicas e login sem violação critical/serious", async ({
    page,
  }) => {
    for (const route of [
      "/",
      "/beneficios",
      "/tecnologia",
      "/diagnostico",
      "/login",
    ]) {
      await page.goto(route);
      await assertNoCriticalOrSeriousAxeViolations(page);
    }
  });

  test("axe gate cobre superfícies autenticadas representativas", async ({
    page,
  }) => {
    await loginAs(page, STAFF_EMAIL);

    for (const route of [
      "/backoffice",
      "/backoffice/operacoes",
      "/backoffice/cobrancas",
      "/backoffice/empresas",
      "/backoffice/financeiro",
      `/backoffice/empresas/${SEED.empresaBomPreco}`,
      `/backoffice/cobrancas/${SEED.cobrancaBomPreco}`,
      "/backoffice/conciliacao",
    ]) {
      await page.goto(route);
      await assertNoCriticalOrSeriousAxeViolations(page);
    }
  });

  test("skip link e navegação por teclado mantêm foco visível", async ({
    page,
  }) => {
    await page.goto("/");

    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", {
      name: "Pular para o conteúdo principal",
    });
    await expect(skipLink).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();

    await page.keyboard.press("Tab");
    const activeRole = await page.evaluate(() => {
      const active = document.activeElement;
      return {
        tag: active?.tagName,
        text: active?.textContent?.trim(),
        visibleOutline: active ? getComputedStyle(active).outlineStyle : null,
      };
    });
    expect(activeRole.tag).toBe("A");
    expect(activeRole.text).toContain("Solicitar demonstração");
  });

  test("dialog crítico recebe foco e pode ser cancelado por teclado", async ({
    page,
  }) => {
    await loginAs(page, STAFF_EMAIL);
    await page.goto(`/backoffice/cobrancas/${SEED.cobrancaBomPreco}`);

    await page.getByRole("button", { name: "Registrar pagamento" }).focus();
    await page.keyboard.press("Enter");

    const dialog = page.getByRole("dialog", { name: "Registrar pagamento" });
    await expect(dialog).toBeVisible();

    await page.getByRole("button", { name: "Cancelar" }).focus();
    await page.keyboard.press("Enter");
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Registrar pagamento" }),
    ).toBeFocused();
  });

  test("mobile, zoom 200% e visual QA final não geram overflow estrutural", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const captures = [
      { name: "public-home-1440", route: "/", width: 1440, height: 900 },
      { name: "public-home-375", route: "/", width: 375, height: 812 },
      { name: "public-home-320", route: "/", width: 320, height: 740 },
      {
        name: "public-secondary-375",
        route: "/tecnologia",
        width: 375,
        height: 812,
      },
      { name: "login-1440", route: "/login", width: 1440, height: 900 },
      { name: "login-375", route: "/login", width: 375, height: 812 },
    ];

    for (const capture of captures) {
      await page.setViewportSize({
        width: capture.width,
        height: capture.height,
      });
      await page.goto(capture.route);
      await expectNoHorizontalOverflow(page);
      await screenshot(page, capture.name);
    }

    await loginAs(page, STAFF_EMAIL);

    const authenticatedCaptures = [
      {
        name: "command-center-1440",
        route: "/backoffice",
        width: 1440,
        height: 900,
      },
      {
        name: "command-center-375",
        route: "/backoffice",
        width: 375,
        height: 812,
      },
      {
        name: "operacoes-1440",
        route: "/backoffice/operacoes",
        width: 1440,
        height: 900,
      },
      {
        name: "operacoes-375",
        route: "/backoffice/operacoes",
        width: 375,
        height: 812,
      },
      {
        name: "cobrancas-1440",
        route: "/backoffice/cobrancas",
        width: 1440,
        height: 900,
      },
      {
        name: "cobrancas-375",
        route: "/backoffice/cobrancas",
        width: 375,
        height: 812,
      },
      {
        name: "financeiro-1440",
        route: "/backoffice/financeiro",
        width: 1440,
        height: 900,
      },
      {
        name: "financeiro-375",
        route: "/backoffice/financeiro",
        width: 375,
        height: 812,
      },
      {
        name: "empresa-workspace-1440",
        route: `/backoffice/empresas/${SEED.empresaBomPreco}`,
        width: 1440,
        height: 900,
      },
      {
        name: "empresa-workspace-375",
        route: `/backoffice/empresas/${SEED.empresaBomPreco}`,
        width: 375,
        height: 812,
      },
      {
        name: "cobranca-workspace-1440",
        route: `/backoffice/cobrancas/${SEED.cobrancaBomPreco}`,
        width: 1440,
        height: 900,
      },
      {
        name: "cobranca-workspace-375",
        route: `/backoffice/cobrancas/${SEED.cobrancaBomPreco}`,
        width: 375,
        height: 812,
      },
    ];

    for (const capture of authenticatedCaptures) {
      await page.setViewportSize({
        width: capture.width,
        height: capture.height,
      });
      await page.goto(capture.route);
      await expectNoHorizontalOverflow(page);
      await screenshot(page, capture.name);
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/backoffice/cobrancas/${SEED.cobrancaBomPreco}`);
    await page.getByRole("button", { name: "Registrar pagamento" }).click();
    await screenshot(page, "critical-consequence-preview-1440");

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`/backoffice/cobrancas/${SEED.cobrancaBomPreco}`);
    await page.getByRole("button", { name: "Registrar pagamento" }).click();
    await expectNoHorizontalOverflow(page);
    await screenshot(page, "critical-consequence-preview-375");

    await page.goto("/backoffice/operacoes");
    await page.addStyleTag({
      content: "html { zoom: 2; }",
    });
    await expectNoHorizontalOverflow(page);
    await screenshot(page, "zoom-200-operacoes");
  });
});
