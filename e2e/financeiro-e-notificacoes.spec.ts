import { expect, test } from "@playwright/test";
import { loginAs, STAFF_EMAIL } from "./helpers/auth";
import { SEED } from "./helpers/seed-ids";

/**
 * Regressão da regra de negócio resolvida na Rodada 13: quando existe
 * uma negociação ACEITA com desconto, a cobrança é considerada "Paga"
 * assim que o valor ACORDADO é quitado — não o valor_cobranca original
 * (migration 0015_reconciliacao_valor_negociado.sql). O seed já reflete
 * isso (1 pagamento de R$1.150,00 fecha uma cobrança de R$1.285,00
 * original), então esta spec é somente leitura — segura de rodar a
 * qualquer momento, sem precisar de `supabase db reset`.
 */

test("acordo com desconto fecha a cobrança pelo valor negociado, não pelo original", async ({
  page,
}) => {
  await loginAs(page, STAFF_EMAIL);
  await page.goto(`/backoffice/cobrancas/${SEED.cobrancaBomPreco}`);

  await expect(page.getByText("Paga", { exact: true })).toBeVisible();
  await expect(page.getByText("Valor original:")).toBeVisible();
  await expect(page.getByText("R$ 1.285,00").first()).toBeVisible();
  await expect(page.getByText("Valor acordado (negociação):")).toBeVisible();
  await expect(page.getByText("Saldo devedor: R$ 0,00")).toBeVisible();
});

test("relatório financeiro mostra o valor acordado junto do valor original", async ({
  page,
}) => {
  await loginAs(page, STAFF_EMAIL);
  await page.goto("/backoffice/financeiro");

  await expect(page.getByText("Acordado: R$ 1.150,00")).toBeVisible();
});

test("resumo financeiro da empresa também reconcilia pelo valor acordado", async ({
  page,
}) => {
  // Regressão: o resumo da ficha 360º calculava o saldo internamente a
  // partir do total cobrado (valor original), não da referência
  // negociada — mostrava R$135,00 em aberto mesmo com a cobrança "Paga".
  await loginAs(page, STAFF_EMAIL);
  await page.goto(`/backoffice/empresas/${SEED.empresaBomPreco}`);

  const financeiro = page.locator("#financeiro");
  await expect(financeiro.getByText("Saldo em aberto")).toBeVisible();
  await expect(financeiro.getByText("R$ 0,00")).toBeVisible();
});

test("enviar notificação por e-mail registra sucesso", async ({ page }) => {
  await loginAs(page, STAFF_EMAIL);
  await page.goto(`/backoffice/cobrancas/${SEED.cobrancaBomPreco}`);

  await page.getByRole("button", { name: "Enviar notificação" }).click();
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByText("Notificação enviada.")).toBeVisible();
  await expect(page.getByText("Enviada", { exact: true }).first()).toBeVisible();
});
