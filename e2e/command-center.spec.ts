import { expect, test } from "@playwright/test";
import { loginAs, SINDICATO_EMAIL, STAFF_EMAIL } from "./helpers/auth";

test("staff vê pulse executivo, risco, decisões e drill-downs", async ({ page }) => {
  await loginAs(page, STAFF_EMAIL);

  await expect(page.getByRole("heading", { name: "Executive Command Center" })).toBeVisible();
  await expect(page.getByText("Recebido confirmado")).toBeVisible();
  await expect(page.getByText("Exposição em cobrança")).toBeVisible();
  await expect(page.getByRole("link", { name: /Exposição vencida/ })).toBeVisible();
  await expect(page.getByText("Aging de cobrança")).toBeVisible();
  await expect(page.getByText("Concentração por empresa")).toBeVisible();
  await expect(page.getByText("Decisões e exceções agora").or(page.getByText("Nenhuma decisão suportada pendente"))).toBeVisible();
  await expect(page.getByText("Oportunidade, cobertura, obrigação e dívida")).toBeVisible();

  await page.getByRole("link", { name: /Exposição em cobrança/ }).click();
  await page.waitForURL("**/backoffice/cobrancas");
});

test("sindicato vê dados escopados sem fila operacional staff-only", async ({ page }) => {
  await loginAs(page, SINDICATO_EMAIL);

  await expect(page.getByRole("heading", { name: "Executive Command Center" })).toBeVisible();
  await expect(page.getByText("Escopo aplicado por RLS/tenant")).toBeVisible();
  await expect(page.getByText("Central Operacional")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Oportunidades" })).toHaveCount(0);
});

test("Command Center renderiza em 320px sem overflow horizontal crítico", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 812 });
  await loginAs(page, STAFF_EMAIL);

  await expect(page.getByRole("heading", { name: "Executive Command Center" })).toBeVisible();
  await expect(page.getByText("Recebido confirmado")).toBeVisible();
  await expect(page.getByText("Exposição em cobrança")).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(hasHorizontalOverflow).toBe(false);
});
