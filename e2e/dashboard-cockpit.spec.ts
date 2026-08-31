import { expect, test } from "@playwright/test";
import { loginAs, SINDICATO_EMAIL, STAFF_EMAIL } from "./helpers/auth";

/**
 * Executive Command Center (Design Wave 2) — a home do backoffice
 * responde posição, risco, decisão e investigação, sem voltar ao grid
 * plano de métricas.
 */

test("staff GSBC vê o Command Center e o aviso de Documentos não existe mais", async ({
  page,
}) => {
  await loginAs(page, STAFF_EMAIL);

  await expect(page.getByRole("heading", { name: "Executive Command Center" })).toBeVisible();
  await expect(page.getByText("Zone A — Executive Pulse")).toBeVisible();
  await expect(page.getByText("Zone B — Performance & Risk")).toBeVisible();
  await expect(page.getByText("Zone D — Executive Intelligence")).toBeVisible();
  await expect(page.getByText("Atividade recente auditável")).toBeVisible();
  await expect(page.getByText(/módulo de Documentos chega/)).toHaveCount(0);
});

test("sindicato também vê o Command Center, sem decisões inventadas de staff", async ({
  page,
}) => {
  await loginAs(page, SINDICATO_EMAIL);

  await expect(page.getByRole("heading", { name: "Executive Command Center" })).toBeVisible();
  await expect(page.getByText("Recebido confirmado")).toBeVisible();
  await expect(page.getByText("Central Operacional")).toHaveCount(0);
});
