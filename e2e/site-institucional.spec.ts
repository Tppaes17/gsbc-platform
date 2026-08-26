import { expect, test } from "@playwright/test";

/**
 * Site institucional público (Rodada 6). Idempotente — o único efeito
 * colateral é inserir uma linha em site_leads a cada execução do teste
 * de envio, o que é seguro repetir.
 */

test("home renderiza hero, navegação e CTA de diagnóstico", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Uma nova frente de parceria com o movimento sindical" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation").getByRole("link", { name: "Soluções", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Solicitar diagnóstico gratuito" }).first(),
  ).toBeVisible();
});

test("formulário de diagnóstico envia e confirma recebimento", async ({ page }) => {
  await page.goto("/diagnostico");
  await page.getByLabel("Nome completo *").fill("Teste E2E Playwright");
  await page.getByLabel("E-mail *").fill(`teste-e2e-${Date.now()}@example.com`);
  await page.getByRole("button", { name: "Solicitar diagnóstico gratuito" }).click();
  await expect(page.getByText("Recebemos seu pedido.")).toBeVisible();
});

test("navegação do menu leva às páginas de conteúdo", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Soluções", exact: true })
    .click();
  await expect(page).toHaveURL(/\/solucoes$/);
  await expect(
    page.getByRole("heading", { name: /operação completa/i }),
  ).toBeVisible();
});
