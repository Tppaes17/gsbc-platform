import { expect, test } from "@playwright/test";

/**
 * Site institucional público (Rodada 6). Idempotente — o único efeito
 * colateral é inserir uma linha em site_leads a cada execução do teste
 * de envio, o que é seguro repetir.
 */

test("home renderiza hero product-first, navegação e CTA de demonstração", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Compliance, receita e operação sindical em uma plataforma governada",
    }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation")
      .getByRole("link", { name: "Plataforma", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Solicitar demonstração" }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("Telas reais, dados demo e capacidades suportadas"),
  ).toBeVisible();
});

test("formulário de demonstração envia e confirma recebimento", async ({
  page,
}) => {
  await page.goto("/diagnostico");
  await page.getByLabel("Nome completo *").fill("Teste E2E Playwright");
  await page.getByLabel("E-mail *").fill(`teste-e2e-${Date.now()}@example.com`);
  await page
    .getByRole("main")
    .getByRole("button", { name: "Solicitar demonstração" })
    .click();
  await expect(page.getByText("Recebemos seu pedido.")).toBeVisible();
});

test("navegação do menu leva às seções product-first", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Capacidades", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Cobrança é motor; a plataforma é mais ampla",
    }),
  ).toBeVisible();
});

test("home não vende claims críticos não suportados", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/30[–-]40%/)).toHaveCount(0);
  await expect(page.getByText(/IA para análise preditiva/i)).toHaveCount(0);
  await expect(page.getByText(/100% automat/i)).toHaveCount(0);
  await expect(page.getByText(/garantia/i)).toHaveCount(0);
});

test("login mantém continuidade visual com o website", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Entrar" })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", {
      name: "Entre na plataforma de compliance, receita e operação sindical",
    }),
  ).toBeVisible();
  await expect(page.getByText("Ambiente de acesso restrito")).toBeVisible();
});

test("mobile expõe proposta, prova de produto, menu e CTA", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Compliance, receita e operação sindical em uma plataforma governada",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Solicitar demonstração" }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await expect(
    page.getByRole("navigation").getByRole("link", { name: "Segurança" }),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Plataforma" })
    .click();
  await expect(
    page.getByText("Telas reais, dados demo e capacidades suportadas"),
  ).toBeVisible();
});
