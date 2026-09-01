import { expect, test } from "@playwright/test";
import { loginAs, SINDICATO_EMAIL, STAFF_EMAIL } from "./helpers/auth";
import { SEED } from "./helpers/seed-ids";

test.describe("Wave 5 critical workflows", () => {
  test("pagamento manual mostra consequência antes de confirmação", async ({
    page,
  }) => {
    await loginAs(page, STAFF_EMAIL);
    await page.goto(`/backoffice/cobrancas/${SEED.cobrancaBomPreco}`);

    await page.getByRole("button", { name: "Registrar pagamento" }).click();
    await expect(page.getByText("Impacto operacional")).toBeVisible();
    await expect(
      page.getByText("Cria evento de pagamento manual"),
    ).toBeVisible();
    await expect(
      page.getByText("Confirmação de PSP, repasse ou quitação jurídica"),
    ).toBeVisible();
    await expect(
      page.getByText("Correção financeira exige evento posterior auditável"),
    ).toBeVisible();
  });

  test("notificação externa separa envio, pagamento e falha parcial", async ({
    page,
  }) => {
    await loginAs(page, STAFF_EMAIL);
    await page.goto(`/backoffice/cobrancas/${SEED.cobrancaBomPreco}`);

    await page.getByRole("button", { name: "Enviar notificação" }).click();
    await expect(page.getByText("Efeito externo")).toBeVisible();
    await expect(
      page.getByText("Não registra pagamento nem baixa a cobrança"),
    ).toBeVisible();
    await expect(
      page.getByText("Erro de envio preserva a cobrança sem avançar status"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Enviar e registrar tentativa" }),
    ).toBeVisible();
  });

  test("movimento de negociação não confunde proposta, acordo e pagamento", async ({
    page,
  }) => {
    await loginAs(page, STAFF_EMAIL);
    await page.goto(`/backoffice/negociacoes/${SEED.negociacaoBomPreco}`);

    await page.getByRole("button", { name: "Registrar movimento" }).click();
    await expect(
      page.getByText("Consequência antes de confirmar"),
    ).toBeVisible();
    await expect(page.getByText("Não firma acordo")).toBeVisible();
    await expect(
      page.getByText("Não registra recebimento nem altera conciliação"),
    ).toBeVisible();

    await page.getByRole("combobox", { name: "Tipo *" }).click();
    await page.getByRole("option", { name: "Aceite" }).click();
    await expect(
      page.getByText("Pode depender de aprovação de desconto"),
    ).toBeVisible();
  });

  test("sindicato não vê ações críticas privilegiadas na cobrança", async ({
    page,
  }) => {
    await loginAs(page, SINDICATO_EMAIL);
    await page.goto(`/backoffice/cobrancas/${SEED.cobrancaBomPreco}`);

    await expect(
      page.getByRole("button", { name: "Registrar pagamento" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Enviar notificação" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Iniciar escalonamento" }),
    ).toHaveCount(0);
  });
});
