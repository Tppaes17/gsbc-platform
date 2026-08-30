import { expect, test, type APIRequestContext } from "@playwright/test";
import { createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database.types";
import { loginAs, SINDICATO_EMAIL, STAFF_EMAIL } from "./helpers/auth";

function loadLocalEnv() {
  const env: Record<string, string> = {};
  const file = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");

  for (const line of file.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(trimmed);
    if (!match) continue;
    const [, key, rawValue] = match;
    env[key] = rawValue.replace(/^["']|["']$/g, "");
  }

  return {
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    webhookSecret: env.MOCK_PROVIDER_WEBHOOK_SECRET,
  };
}

function adminClient() {
  const env = loadLocalEnv();
  return createClient<Database>(env.supabaseUrl, env.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function signWebhook(body: string) {
  return createHmac("sha256", loadLocalEnv().webhookSecret).update(body).digest("hex");
}

async function expectOk<T>(promise: PromiseLike<{ error: { message: string } | null; data?: T }>) {
  const { error } = await promise;
  expect(error?.message).toBeUndefined();
}

async function sendPaidWebhook(request: APIRequestContext, externalId: string) {
  const body = JSON.stringify({
    event_id: `mock_evt_reconciliation_center_${randomUUID()}`,
    charge_external_id: externalId,
    status: "PAGA",
    occurred_at: new Date().toISOString(),
  });

  const response = await request.post("/api/webhooks/payments/mock", {
    headers: { "content-type": "application/json", "x-webhook-signature": signWebhook(body) },
    data: body,
  });
  expect(response.status()).toBe(200);
}

async function setupFixture() {
  const admin = adminClient();
  const tenantId = randomUUID();
  const sindicatoId = randomUUID();
  const empresaId = randomUUID();
  const instrumentoId = randomUUID();
  const obrigacaoId = randomUUID();
  const cobrancaId = randomUUID();
  const chargeId = randomUUID();
  const suffix = randomUUID().slice(0, 8);
  const cnpjDigits = Date.now().toString().slice(-12).padStart(12, "0");
  const externalId = `mock_charge_reconciliation_center_${suffix}`;

  await expectOk(admin.from("tenants").insert({
    id: tenantId,
    type: "sindicato",
    name: `Conciliação E2E ${suffix}`,
    slug: `conciliacao-e2e-${suffix}`,
    status: "active",
  }));
  await expectOk(admin.from("sindicatos").insert({
    id: sindicatoId,
    tenant_id: tenantId,
    razao_social: `Conciliação E2E ${suffix} Ltda`,
    nome_fantasia: `Conciliação E2E ${suffix}`,
    cnpj: `96${cnpjDigits}`,
    status: "active",
  }));
  await expectOk(admin.from("empresas").insert({
    id: empresaId,
    tenant_id: tenantId,
    razao_social: `Empresa Conciliação ${suffix}`,
    cnpj: `95${cnpjDigits}`,
    status: "active",
  }));
  await expectOk(admin.from("instrumentos").insert({
    id: instrumentoId,
    tenant_id: tenantId,
    empresa_id: empresaId,
    tipo: "act",
    titulo: `ACT Conciliação ${suffix}`,
    status: "active",
  }));
  await expectOk(admin.from("obrigacoes").insert({
    id: obrigacaoId,
    tenant_id: tenantId,
    instrumento_id: instrumentoId,
    empresa_id: empresaId,
    descricao: `Obrigação Conciliação ${suffix}`,
    periodicidade: "unica",
    valor_referencia: 500,
    status: "validated",
  }));
  await expectOk(admin.from("cobrancas").insert({
    id: cobrancaId,
    tenant_id: tenantId,
    empresa_id: empresaId,
    obrigacao_id: obrigacaoId,
    valor_principal: 500,
    valor_atualizacao: 0,
    prioridade: "medium",
    status: "approved",
  }));
  await expectOk(admin.from("payment_charges").insert({
    id: chargeId,
    tenant_id: tenantId,
    empresa_id: empresaId,
    cobranca_id: cobrancaId,
    provider: "mock",
    tipo: "pix",
    valor: 500,
    status: "pending",
    external_id: externalId,
    external_status: "ATIVA",
  }));

  return { tenantId, sindicatoId, empresaId, instrumentoId, obrigacaoId, cobrancaId, externalId };
}

async function createContractAndSplitRule(fixture: Awaited<ReturnType<typeof setupFixture>>) {
  const admin = adminClient();
  const { data: staff } = await admin.from("users").select("id").eq("email", STAFF_EMAIL).single();
  expect(staff?.id).toBeTruthy();

  const contractId = randomUUID();
  await expectOk(admin.from("financial_contracts").insert({
    id: contractId,
    tenant_id: fixture.tenantId,
    sindicato_id: fixture.sindicatoId,
    titulo: `Contrato Conciliação ${fixture.tenantId.slice(0, 8)}`,
    status: "validated",
    vigencia_inicio: "2026-01-01",
    termos_snapshot: { origem: "e2e-reconciliation-center" },
    validado_por: staff!.id,
    validado_em: new Date().toISOString(),
  }));
  await expectOk(admin.from("financial_split_rules").insert({
    id: randomUUID(),
    contract_id: contractId,
    tenant_id: fixture.tenantId,
    version: 1,
    status: "active",
    effective_from: "2026-01-01",
    gsbc_percent: 20,
    sindicato_percent: 80,
    terceiros_percent: 0,
    fee_policy: { provider_fee_percent: 0, provider_fee_fixed: 1.5 },
    created_by: staff!.id,
  }));
}

async function cleanupFixture(fixture: Awaited<ReturnType<typeof setupFixture>>) {
  const admin = adminClient();
  await admin.from("payment_webhook_events").delete().eq("charge_external_id", fixture.externalId);
  await admin.from("reconciliation_divergences").delete().eq("tenant_id", fixture.tenantId);
  await admin.from("payment_reconciliations").delete().eq("cobranca_id", fixture.cobrancaId);
  await admin.from("pagamentos").delete().eq("cobranca_id", fixture.cobrancaId);
  await admin.from("payment_charges").delete().eq("external_id", fixture.externalId);
  await admin.from("cobranca_eventos").delete().eq("cobranca_id", fixture.cobrancaId);
  await admin.from("cobrancas").delete().eq("id", fixture.cobrancaId);
  await admin.from("obrigacoes").delete().eq("id", fixture.obrigacaoId);
  await admin.from("instrumentos").delete().eq("id", fixture.instrumentoId);
  await admin.from("empresas").delete().eq("id", fixture.empresaId);
  await admin.from("financial_split_rules").delete().eq("tenant_id", fixture.tenantId);
  await admin.from("financial_contracts").delete().eq("tenant_id", fixture.tenantId);
  await admin.from("sindicatos").delete().eq("tenant_id", fixture.tenantId);
  await admin.from("tenants").delete().eq("id", fixture.tenantId);
}

test("staff reprocessa conciliação manual depois de contrato e split existirem", async ({ page, request }) => {
  const fixture = await setupFixture();

  try {
    await sendPaidWebhook(request, fixture.externalId);

    const admin = adminClient();
    const { data: manual } = await admin
      .from("payment_reconciliations")
      .select("id, status")
      .eq("cobranca_id", fixture.cobrancaId)
      .single();
    expect(manual?.status).toBe("manual_review");

    const { data: divergence } = await admin
      .from("reconciliation_divergences")
      .select("id, status")
      .eq("reconciliation_id", manual!.id)
      .single();
    expect(divergence?.status).toBe("open");

    await createContractAndSplitRule(fixture);

    await loginAs(page, STAFF_EMAIL);
    await expect(page.getByRole("link", { name: "Conciliação" })).toBeVisible();
    await page.goto("/backoffice/conciliacao");
    await expect(page.getByTestId(`retry-reconciliation-${manual!.id}`)).toBeVisible();

    await page.getByTestId(`retry-reconciliation-${manual!.id}`).click();
    await expect(page.getByText("Conciliado")).toBeVisible();
    await expect(page.getByText("Regra v1")).toBeVisible();

    const { data: reconciled } = await admin
      .from("payment_reconciliations")
      .select("status, provider_fee_amount, split_rule_version, processing_error")
      .eq("id", manual!.id)
      .single();
    expect(reconciled).toEqual({
      status: "reconciled",
      provider_fee_amount: 1.5,
      split_rule_version: 1,
      processing_error: null,
    });

    const { data: repasse } = await admin
      .from("financial_repasses")
      .select("id, status")
      .eq("tenant_id", fixture.tenantId)
      .single();
    expect(repasse?.status).toBe("pending");

    await page.getByLabel("Agendar").fill("2026-09-01");
    await page.getByTestId(`schedule-repasse-${repasse!.id}`).click();
    await expect(page.getByText("repasse scheduled")).toBeVisible();

    await page.getByLabel("Ref. externa").fill(`transfer_${fixture.tenantId.slice(0, 8)}`);
    await page.getByTestId(`pay-repasse-${repasse!.id}`).click();
    await expect(page.getByText("repasse paid")).toBeVisible();

    const { data: paidRepasse } = await admin
      .from("financial_repasses")
      .select("status, external_transfer_id, paid_at")
      .eq("id", repasse!.id)
      .single();
    expect(paidRepasse?.status).toBe("paid");
    expect(paidRepasse?.external_transfer_id).toBe(`transfer_${fixture.tenantId.slice(0, 8)}`);
    expect(paidRepasse?.paid_at).toBeTruthy();

    const compensationForm = page.getByTestId(`compensation-form-${manual!.id}`);
    await compensationForm.getByLabel("Evento").selectOption("refund");
    await compensationForm.getByLabel("Valor").fill("500");
    await compensationForm.getByLabel("Ref. provider").fill(`refund_${fixture.tenantId.slice(0, 8)}`);
    await compensationForm.getByPlaceholder("Justificativa obrigatória").fill("Estorno informado após repasse pago");
    await compensationForm.getByRole("button", { name: "Registrar evento" }).click();
    await expect(page.getByText("Falha em revisão")).toBeVisible();

    const { data: compensationState } = await admin
      .from("payment_reconciliations")
      .select("status, processing_error")
      .eq("id", manual!.id)
      .single();
    expect(compensationState?.status).toBe("failed_review_required");
    expect(compensationState?.processing_error).toContain("repasse não-pendente");

    const { count: compensationDivergences } = await admin
      .from("reconciliation_divergences")
      .select("id", { count: "exact", head: true })
      .eq("reconciliation_id", manual!.id)
      .eq("status", "open");
    expect(compensationDivergences).toBe(1);

    const { data: resolvedDivergence } = await admin
      .from("reconciliation_divergences")
      .select("status, resolved_by, resolved_at")
      .eq("id", divergence!.id)
      .single();
    expect(resolvedDivergence?.status).toBe("resolved");
    expect(resolvedDivergence?.resolved_by).toBeTruthy();
    expect(resolvedDivergence?.resolved_at).toBeTruthy();
  } finally {
    await cleanupFixture(fixture);
  }
});

test("usuário de sindicato não acessa central de conciliação", async ({ page }) => {
  await loginAs(page, SINDICATO_EMAIL);
  await expect(page.getByRole("link", { name: "Conciliação" })).toHaveCount(0);

  await page.goto("/backoffice/conciliacao");
  await expect(page).toHaveURL(/\/backoffice$/);
});
