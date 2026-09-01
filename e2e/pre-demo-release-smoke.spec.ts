import { expect, test } from "@playwright/test";

const internalLanguagePatterns = [
  /testes automatizados/i,
  /ambiente de testes/i,
  /\bE2E\b/i,
  /\bQA\b/i,
  /\bWave\b/i,
  /\bSTG\b/i,
  /\bCodex\b/i,
  /\bVercel\b/i,
  /\benv\b/i,
  /\bdeployment\b/i,
];

test.describe("pre-demo release smoke", () => {
  test("public website, CTA, login and protected redirect are demo-safe", async ({
    page,
    request,
  }) => {
    const response = await page.goto("/");
    expect(response?.ok()).toBeTruthy();

    await expect(
      page.getByRole("heading", {
        name: "Compliance, receita e operação sindical em uma plataforma governada",
      }),
    ).toBeVisible();
    await expect(
      page.getByText("Produto real, dados demonstrativos e capacidades suportadas"),
    ).toBeVisible();

    const bodyText = await page.locator("body").innerText();
    for (const pattern of internalLanguagePatterns) {
      expect(bodyText).not.toMatch(pattern);
    }

    await page
      .getByRole("banner")
      .getByRole("link", { name: "Plataforma", exact: true })
      .click();
    await expect(page).toHaveURL(/#produto$/);

    await page
      .getByRole("banner")
      .getByRole("button", { name: "Solicitar demonstração" })
      .click();
    await expect(page).toHaveURL(/\/diagnostico$/);
    await expect(
      page.getByRole("heading", { name: "Solicite uma demonstração do GSBC" }),
    ).toBeVisible();

    await page.goto("/login");
    await expect(
      page.getByRole("heading", {
        name: "Entre na plataforma de compliance, receita e operação sindical",
      }),
    ).toBeVisible();
    await expect(page.getByLabel("E-mail")).toBeVisible();
    await expect(page.getByLabel("Senha")).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();

    await page.goto("/backoffice");
    await expect(page).toHaveURL(/\/login/);

    for (const asset of [
      "/product-proof/executive-command-center.png",
      "/product-proof/empresa-workspace.png",
      "/product-proof/cobrancas-enterprise-grid.png",
      "/product-proof/critical-workflow-payment.png",
      "/product-proof/login-transition.png",
    ]) {
      const assetResponse = await request.get(asset);
      expect(assetResponse.ok(), `${asset} should load`).toBeTruthy();
    }
  });
});
