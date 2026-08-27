import { expect, test } from "@playwright/test";
import { loginAs, SINDICATO_EMAIL, STAFF_EMAIL } from "./helpers/auth";
import { SEED } from "./helpers/seed-ids";

/**
 * Escalonamento e Notificação Extrajudicial (STG-09, ver
 * docs/roadmap-stagings.md) — o fluxo completo (iniciar -> submeter ->
 * aprovar/rejeitar -> gerar PDF -> enviar por e-mail/canal físico ->
 * registrar resultado), o gate de aprovação restrito ao papel Jurídico
 * (RLS + RPC), e a transição da cobrança pra 'legal_escalation' no
 * primeiro envio são verificados manualmente ao vivo, com fixtures
 * construídas especificamente pra isso — regra 92, ver
 * docs/rodadas/rodada-25-escalonamento-extrajudicial.md. Aqui cobrimos só
 * o que não muda dado em staging: a seção existe na ficha da cobrança, a
 * página de Escalonamentos carrega pros dois papéis (regra 6), e o nav
 * item aparece.
 */

test("staff GSBC vê a seção de escalonamento na ficha da cobrança", async ({ page }) => {
  await loginAs(page, STAFF_EMAIL);
  await page.goto(`/backoffice/cobrancas/${SEED.cobrancaBomPreco}`);

  await expect(page.getByText("Escalonamento e notificação extrajudicial").first()).toBeVisible();
});

test("staff e sindicato veem a Central de Escalonamentos", async ({ page }) => {
  await loginAs(page, STAFF_EMAIL);
  await page.goto("/backoffice/escalonamentos");
  await expect(page.getByRole("heading", { name: "Escalonamentos" })).toBeVisible();
});

test("sindicato também vê a Central de Escalonamentos (transparência, regra 6)", async ({
  page,
}) => {
  await loginAs(page, SINDICATO_EMAIL);
  await page.goto("/backoffice/escalonamentos");
  await expect(page.getByRole("heading", { name: "Escalonamentos" })).toBeVisible();
});

test("nav lateral tem o item Escalonamentos", async ({ page }) => {
  await loginAs(page, STAFF_EMAIL);
  await expect(page.getByRole("link", { name: "Escalonamentos" })).toBeVisible();
});
