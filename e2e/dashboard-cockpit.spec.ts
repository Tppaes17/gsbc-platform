import { expect, test } from "@playwright/test";
import { loginAs, SINDICATO_EMAIL, STAFF_EMAIL } from "./helpers/auth";

/**
 * Dashboard cockpit operacional (Stage 5 da revisão de design,
 * docs/design/stage-05-dashboard.md) — a home do backoffice virou 4
 * seções (tamanho da operação / quanto está movimentado / atenção
 * necessária / atividade recente) no lugar do grid plano de 8 métricas
 * + aviso de Documentos desatualizado (achado #03 do design baseline).
 */

test("staff GSBC vê as seções do cockpit e o aviso de Documentos não existe mais", async ({
  page,
}) => {
  await loginAs(page, STAFF_EMAIL);

  await expect(page.getByText("Tamanho da operação")).toBeVisible();
  await expect(page.getByText("Quanto está sendo movimentado")).toBeVisible();
  await expect(page.getByText("O que aconteceu recentemente")).toBeVisible();
  await expect(page.getByText(/módulo de Documentos chega/)).toHaveCount(0);
});

test("sindicato também vê o cockpit, sem a seção Atenção necessária (staff-only)", async ({
  page,
}) => {
  await loginAs(page, SINDICATO_EMAIL);

  await expect(page.getByText("Tamanho da operação")).toBeVisible();
  await expect(page.getByText("Quanto está sendo movimentado")).toBeVisible();
  await expect(page.getByText("Atenção necessária")).toHaveCount(0);
});
