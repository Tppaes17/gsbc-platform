import type { Page } from "@playwright/test";

export const DEMO_PASSWORD = "Demo@12345";
export const STAFF_EMAIL = "admin.demo@gsbc.com.br";
export const SINDICATO_EMAIL = "dirigente.demo@sindicatodemonstracao.org.br";

export async function loginAs(page: Page, email: string) {
  await page.goto("/login");
  await page.getByPlaceholder("voce@organizacao.com.br").fill(email);
  await page.getByLabel("Senha").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/backoffice");
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: "Menu do usuário" }).click();
  await page.getByRole("menuitem", { name: "Sair" }).click();
  await page.waitForURL("**/login");
}
