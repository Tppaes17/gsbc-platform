import { expect, test } from "@playwright/test";
import { loginAs, SINDICATO_EMAIL, STAFF_EMAIL } from "./helpers/auth";

/**
 * Central Operacional (STG-03, ver docs/roadmap-stagings.md) — fila
 * única do que a equipe GSBC precisa fazer hoje. Geração real dos work
 * items (event-driven no motor de cobrança + state-derived no sync
 * periódico) é verificada manualmente contra dado real, não aqui — ver
 * docs/rodadas/rodada-20-operations-center.md (regra 92). Aqui cobrimos
 * o que dá pra testar sem depender de um sweep de cron ter rodado: a
 * página existe, está no menu, e é staff-GSBC-only.
 */

test("staff GSBC vê a Central Operacional no menu e acessa a página", async ({ page }) => {
  await loginAs(page, STAFF_EMAIL);

  await expect(page.getByRole("link", { name: "Central Operacional" })).toBeVisible();
  await page.getByRole("link", { name: "Central Operacional" }).click();
  await page.waitForURL("**/backoffice/operacoes");

  await expect(page.getByRole("heading", { name: "Central operacional" })).toBeVisible();
  await expect(page.getByText("Fila total")).toBeVisible();
});

test("sindicato não vê a Central Operacional nem acessa a rota", async ({ page }) => {
  await loginAs(page, SINDICATO_EMAIL);

  await expect(page.getByRole("link", { name: "Central Operacional" })).toHaveCount(0);

  await page.goto("/backoffice/operacoes");
  await page.waitForURL("**/backoffice");
});
