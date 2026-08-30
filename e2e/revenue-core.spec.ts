import { expect, test, type APIRequestContext } from "@playwright/test";
import { createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database.types";

const FIXTURE = {
  tenant: "00000000-0000-0000-0000-0000000000c1",
  sindicato: "20000000-0000-0000-0000-0000000000c1",
  empresa: "40000000-0000-0000-0000-0000000000c1",
  instrumento: "50000000-0000-0000-0000-0000000000c1",
  contract: "90000000-0000-0000-0000-0000000000c1",
  splitRule: "91000000-0000-0000-0000-0000000000c1",
};

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
  const { webhookSecret } = loadLocalEnv();
  return createHmac("sha256", webhookSecret).update(body).digest("hex");
}

async function expectOk<T>(promise: PromiseLike<{ error: { message: string } | null; data?: T }>) {
  const { error } = await promise;
  expect(error?.message).toBeUndefined();
}

async function setupFixture() {
  const admin = adminClient();
  const { data: staff } = await admin.from("users").select("id").eq("email", "admin.demo@gsbc.com.br").single();
  expect(staff?.id).toBeTruthy();

  await expectOk(admin.from("tenants").upsert({
    id: FIXTURE.tenant,
    type: "sindicato",
    name: "Revenue Core Sindicato",
    slug: "revenue-core-sindicato",
    status: "active",
  }));
  await expectOk(admin.from("sindicatos").upsert({
    id: FIXTURE.sindicato,
    tenant_id: FIXTURE.tenant,
    razao_social: "Revenue Core Sindicato",
    nome_fantasia: "Revenue Core",
    cnpj: "98000000000191",
    status: "active",
  }));
  await expectOk(admin.from("empresas").upsert({
    id: FIXTURE.empresa,
    tenant_id: FIXTURE.tenant,
    razao_social: "Revenue Core Empresa Ltda",
    cnpj: "98000000000272",
    status: "active",
  }));
  await expectOk(admin.from("instrumentos").upsert({
    id: FIXTURE.instrumento,
    tenant_id: FIXTURE.tenant,
    empresa_id: FIXTURE.empresa,
    tipo: "act",
    titulo: "Revenue Core ACT",
    status: "active",
  }));

  return { staffId: staff!.id };
}

async function createChargeFixture(valor: number) {
  const admin = adminClient();
  const obrigacaoId = randomUUID();
  const cobrancaId = randomUUID();
  const chargeId = randomUUID();
  const externalId = `mock_charge_revenue_core_${randomUUID()}`;

  await expectOk(admin.from("obrigacoes").insert({
    id: obrigacaoId,
    tenant_id: FIXTURE.tenant,
    instrumento_id: FIXTURE.instrumento,
    empresa_id: FIXTURE.empresa,
    descricao: "Obrigação Revenue Core",
    periodicidade: "unica",
    valor_referencia: valor,
    status: "validated",
  }));
  await expectOk(admin.from("cobrancas").insert({
    id: cobrancaId,
    tenant_id: FIXTURE.tenant,
    empresa_id: FIXTURE.empresa,
    obrigacao_id: obrigacaoId,
    valor_principal: valor,
    valor_atualizacao: 0,
    prioridade: "medium",
    status: "approved",
  }));
  await expectOk(admin.from("payment_charges").insert({
    id: chargeId,
    tenant_id: FIXTURE.tenant,
    empresa_id: FIXTURE.empresa,
    cobranca_id: cobrancaId,
    provider: "mock",
    tipo: "pix",
    valor,
    status: "pending",
    external_id: externalId,
    external_status: "ATIVA",
  }));

  return { obrigacaoId, cobrancaId, chargeId, externalId };
}

async function cleanupChargeFixture(ids: { obrigacaoId: string; cobrancaId: string; externalId: string }) {
  const admin = adminClient();
  await admin.from("payment_webhook_events").delete().eq("charge_external_id", ids.externalId);
  await admin.from("payment_charges").delete().eq("external_id", ids.externalId);
  await admin.from("payment_reconciliations").delete().eq("cobranca_id", ids.cobrancaId);
  await admin.from("pagamentos").delete().eq("cobranca_id", ids.cobrancaId);
  await admin.from("cobranca_eventos").delete().eq("cobranca_id", ids.cobrancaId);
  await admin.from("cobrancas").delete().eq("id", ids.cobrancaId);
  await admin.from("obrigacoes").delete().eq("id", ids.obrigacaoId);
}

async function archiveActiveSplitRule() {
  const admin = adminClient();
  await admin
    .from("financial_split_rules")
    .update({ status: "archived", effective_to: "2026-08-29" })
    .eq("tenant_id", FIXTURE.tenant)
    .eq("status", "active");
}

async function createValidatedSplitRule(staffId: string) {
  const admin = adminClient();
  await archiveActiveSplitRule();
  await expectOk(admin.from("financial_contracts").upsert({
    id: FIXTURE.contract,
    tenant_id: FIXTURE.tenant,
    sindicato_id: FIXTURE.sindicato,
    titulo: "Contrato Revenue Core validado",
    status: "validated",
    vigencia_inicio: "2026-01-01",
    termos_snapshot: { origem: "e2e-revenue-core" },
    validado_por: staffId,
    validado_em: new Date().toISOString(),
  }));
  await expectOk(admin.from("financial_split_rules").insert({
    id: randomUUID(),
    contract_id: FIXTURE.contract,
    tenant_id: FIXTURE.tenant,
    version: Math.floor(Date.now() / 1000),
    status: "active",
    effective_from: "2026-01-01",
    gsbc_percent: 20,
    sindicato_percent: 80,
    terceiros_percent: 0,
    fee_policy: { provider_fee_percent: 0, provider_fee_fixed: 1.5 },
    created_by: staffId,
  }));
}

async function sendPaidWebhook(request: APIRequestContext, externalId: string) {
  const body = JSON.stringify({
    event_id: `mock_evt_revenue_core_${randomUUID()}`,
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

test.beforeAll(async () => {
  await setupFixture();
});

test("Revenue Core: pagamento de provider sem contrato validado vai para revisão manual", async ({ request }) => {
  await archiveActiveSplitRule();
  const ids = await createChargeFixture(500);

  await sendPaidWebhook(request, ids.externalId);

  const admin = adminClient();
  const { data: reconciliation } = await admin
    .from("payment_reconciliations")
    .select("id, status, gross_amount, provider_fee_amount, net_amount, processing_error")
    .eq("cobranca_id", ids.cobrancaId)
    .single();

  expect(reconciliation?.status).toBe("manual_review");
  expect(reconciliation?.gross_amount).toBe(500);
  expect(reconciliation?.provider_fee_amount).toBe(0);
  expect(reconciliation?.net_amount).toBe(500);
  expect(reconciliation?.processing_error).toContain("Contrato financeiro");

  const { count: divergenceCount } = await admin
    .from("reconciliation_divergences")
    .select("id", { count: "exact", head: true })
    .eq("reconciliation_id", reconciliation!.id)
    .eq("status", "open");
  expect(divergenceCount).toBe(1);

  await cleanupChargeFixture(ids);
});

test("Revenue Core: contrato validado aplica split versionado e cria repasse pendente", async ({ request }) => {
  const { staffId } = await setupFixture();
  await createValidatedSplitRule(staffId);
  const ids = await createChargeFixture(500);

  await sendPaidWebhook(request, ids.externalId);

  const admin = adminClient();
  const { data: reconciliation } = await admin
    .from("payment_reconciliations")
    .select("id, status, gross_amount, provider_fee_amount, net_amount, split_rule_version")
    .eq("cobranca_id", ids.cobrancaId)
    .single();

  expect(reconciliation?.status).toBe("reconciled");
  expect(reconciliation?.gross_amount).toBe(500);
  expect(reconciliation?.provider_fee_amount).toBe(1.5);
  expect(reconciliation?.net_amount).toBe(498.5);
  expect(reconciliation?.split_rule_version).toBeTruthy();

  const { data: splitItems } = await admin
    .from("payment_split_items")
    .select("id, beneficiary_type, gross_share_amount, fee_share_amount, net_amount, status, split_rule_version")
    .eq("reconciliation_id", reconciliation!.id)
    .order("beneficiary_type");
  expect(splitItems).toHaveLength(2);
  expect(splitItems?.reduce((sum, item) => sum + item.net_amount, 0)).toBe(498.5);
  expect(splitItems?.every((item) => item.split_rule_version === reconciliation!.split_rule_version)).toBe(true);

  const sindicatoSplit = splitItems?.find((item) => item.beneficiary_type === "sindicato");
  expect(sindicatoSplit?.gross_share_amount).toBe(400);
  expect(sindicatoSplit?.fee_share_amount).toBe(1.2);
  expect(sindicatoSplit?.net_amount).toBe(398.8);

  const { data: repasses } = await admin
    .from("financial_repasses")
    .select("amount, status, beneficiary_type")
    .eq("split_item_id", sindicatoSplit!.id);
  expect(repasses).toEqual([{ amount: 398.8, status: "pending", beneficiary_type: "sindicato" }]);

  await cleanupChargeFixture(ids);
});
