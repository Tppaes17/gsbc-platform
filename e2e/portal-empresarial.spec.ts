import { expect, test } from "@playwright/test";
import { loginAs, STAFF_EMAIL } from "./helpers/auth";
import { SEED } from "./helpers/seed-ids";

/**
 * Portal de Regularização Empresarial (STG-05, ver docs/roadmap-stagings.md)
 * — o ciclo completo de magic link (convite → e-mail → clique → sessão)
 * e as adversariais de segurança do roadmap (enumeração, acesso a outra
 * empresa, link expirado/reutilizado) são verificados manualmente ao
 * vivo (regra 92 — ver docs/rodadas/rodada-22-portal-empresarial.md),
 * porque dependem do fluxo real do Supabase Auth (e-mail, token,
 * cookie de sessão) que este ambiente de staging não consegue simular
 * sem SMTP dedicado. Aqui cobrimos o que dá pra testar sem depender de
 * e-mail: a página existe, o convite aparece pra staff, o anti-
 * enumeração responde igual pra qualquer e-mail, e o portal não deixa
 * ninguém entrar sem sessão de contato válida.
 */

test("staff GSBC vê o botão de conceder acesso ao portal na ficha da empresa", async ({
  page,
}) => {
  await loginAs(page, STAFF_EMAIL);
  await page.goto(`/backoffice/empresas/${SEED.empresaBomPreco}`);

  await expect(page.getByRole("button", { name: "Conceder acesso ao portal" }).first()).toBeVisible();
});

test("portal sem sessão redireciona pro login do portal, não pro login do backoffice", async ({
  page,
}) => {
  await page.goto("/portal");
  await expect(page).toHaveURL(/\/portal\/login/);
  await expect(page.getByText("Portal de Regularização Empresarial")).toBeVisible();
});

test("login do portal responde com a mesma mensagem genérica pra qualquer e-mail (anti-enumeração)", async ({
  page,
}) => {
  await page.goto("/portal/login");

  await page.getByLabel("E-mail").fill("nao-cadastrado-no-portal@exemplo.com");
  await page.getByRole("button", { name: "Enviar link de acesso" }).click();

  await expect(
    page.getByText("Se este e-mail tiver acesso ao portal, enviamos um link de acesso"),
  ).toBeVisible();
});

test("staff logado acessando /portal/login não entra em loop (regressão)", async ({ page }) => {
  await loginAs(page, STAFF_EMAIL);
  await page.goto("/portal/login");

  await expect(page.getByText("Portal de Regularização Empresarial")).toBeVisible();
});
