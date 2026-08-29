import { expect, test } from "@playwright/test";
import { createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database.types";

const PASSWORD = "Demo@12345";
const TENANT_A = "00000000-0000-0000-0000-000000000002";
const EMPRESA_A = "40000000-0000-0000-0000-000000000001";
const COBRANCA_A = "60000000-0000-0000-0000-000000000001";

const FIXTURE = {
  tenantB: "00000000-0000-0000-0000-0000000000b2",
  sindicatoB: "20000000-0000-0000-0000-0000000000b2",
  empresaB: "40000000-0000-0000-0000-0000000000b2",
  contatoB: "41000000-0000-0000-0000-0000000000b2",
  instrumentoB: "50000000-0000-0000-0000-0000000000b2",
  obrigacaoB: "55000000-0000-0000-0000-0000000000b2",
  cobrancaB: "60000000-0000-0000-0000-0000000000b2",
  sindicatoEmailB: "phase0-sindicato-b@gsbc.local",
  portalEmailB: "phase0-portal-b@gsbc.local",
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
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    webhookSecret: env.MOCK_PROVIDER_WEBHOOK_SECRET,
    cronSecret: env.CRON_SECRET,
  };
}

function anonClient() {
  const env = loadLocalEnv();
  return createClient<Database>(env.supabaseUrl, env.anonKey);
}

function adminClient() {
  const env = loadLocalEnv();
  return createClient<Database>(env.supabaseUrl, env.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function signIn(email: string) {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  expect(error).toBeNull();
  return client;
}

async function ensureAuthUser(admin: SupabaseClient<Database>, email: string, fullName: string) {
  const { data: existing } = await admin.from("users").select("id").eq("email", email).maybeSingle();
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, { password: PASSWORD, email_confirm: true });
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  expect(error).toBeNull();
  expect(data.user?.id).toBeTruthy();
  return data.user!.id;
}

async function setupPhase0Fixtures() {
  const admin = adminClient();
  const sindicatoUserId = await ensureAuthUser(admin, FIXTURE.sindicatoEmailB, "Phase 0 Sindicato B");
  const portalUserId = await ensureAuthUser(admin, FIXTURE.portalEmailB, "Phase 0 Portal B");

  const { data: role } = await admin
    .from("roles")
    .select("id")
    .eq("code", "sindicato_administrador")
    .single();
  expect(role?.id).toBeTruthy();

  await expectOk(admin.from("tenants").upsert({
    id: FIXTURE.tenantB,
    type: "sindicato",
    name: "Phase 0 Sindicato B",
    slug: "phase0-sindicato-b",
    status: "active",
  }));
  await expectOk(admin.from("sindicatos").upsert({
    id: FIXTURE.sindicatoB,
    tenant_id: FIXTURE.tenantB,
    razao_social: "Phase 0 Sindicato B",
    nome_fantasia: "Phase 0 B",
    cnpj: "99000000000191",
    status: "active",
  }));
  await expectOk(admin.from("memberships").upsert({
    tenant_id: FIXTURE.tenantB,
    user_id: sindicatoUserId,
    role_id: role!.id,
    status: "active",
  }, { onConflict: "tenant_id,user_id" }));
  await expectOk(admin.from("empresas").upsert({
    id: FIXTURE.empresaB,
    tenant_id: FIXTURE.tenantB,
    razao_social: "Phase 0 Empresa B Ltda",
    nome_fantasia: null,
    cnpj: "99000000000272",
    status: "active",
  }));
  await expectOk(admin.from("empresa_contatos").upsert({
    id: FIXTURE.contatoB,
    empresa_id: FIXTURE.empresaB,
    nome: "Contato Portal B",
    email: FIXTURE.portalEmailB,
    user_id: portalUserId,
    portal_access_status: "active",
  }));
  await expectOk(admin.from("instrumentos").upsert({
    id: FIXTURE.instrumentoB,
    tenant_id: FIXTURE.tenantB,
    empresa_id: FIXTURE.empresaB,
    tipo: "act",
    titulo: "Phase 0 ACT B",
    status: "active",
  }));
  await expectOk(admin.from("obrigacoes").upsert({
    id: FIXTURE.obrigacaoB,
    tenant_id: FIXTURE.tenantB,
    instrumento_id: FIXTURE.instrumentoB,
    empresa_id: FIXTURE.empresaB,
    descricao: "Obrigação Phase 0 B",
    periodicidade: "unica",
    valor_referencia: 321.45,
    status: "validated",
  }));
  await expectOk(admin.from("cobrancas").upsert({
    id: FIXTURE.cobrancaB,
    tenant_id: FIXTURE.tenantB,
    empresa_id: FIXTURE.empresaB,
    obrigacao_id: FIXTURE.obrigacaoB,
    valor_principal: 321.45,
    valor_atualizacao: 0,
    prioridade: "medium",
    status: "approved",
  }));
}

async function cleanupPhase0PaymentArtifacts(externalId?: string) {
  const admin = adminClient();

  if (externalId) {
    await admin.from("payment_webhook_events").delete().eq("charge_external_id", externalId);
    await admin.from("payment_charges").delete().eq("external_id", externalId);
    await admin.from("pagamentos").delete().eq("cobranca_id", FIXTURE.cobrancaB).ilike("observacao", `%${externalId}%`);
  }

  await admin
    .from("policy_decisoes")
    .delete()
    .eq("entity_type", "cobranca")
    .eq("entity_id", FIXTURE.cobrancaB);
  await admin.from("cobranca_eventos").delete().eq("cobranca_id", FIXTURE.cobrancaB);
  await admin.from("cobrancas").update({ status: "approved" }).eq("id", FIXTURE.cobrancaB);
}

async function expectOk<T>(promise: PromiseLike<{ error: { message: string } | null; data?: T }>) {
  const { error } = await promise;
  expect(error?.message).toBeUndefined();
}

function signWebhook(body: string) {
  const { webhookSecret } = loadLocalEnv();
  return createHmac("sha256", webhookSecret).update(body).digest("hex");
}

test.beforeAll(async () => {
  await setupPhase0Fixtures();
  await cleanupPhase0PaymentArtifacts();
});

test("TENANT-001/002/003: usuários autenticados não leem, alteram ou inserem dados fora do tenant", async () => {
  const tenantAUser = await signIn("dirigente.demo@sindicatodemonstracao.org.br");
  const tenantBUser = await signIn(FIXTURE.sindicatoEmailB);
  const admin = adminClient();

  const { data: crossSelectA } = await tenantAUser
    .from("empresas")
    .select("id")
    .eq("id", FIXTURE.empresaB);
  expect(crossSelectA).toEqual([]);

  const { data: crossSelectB } = await tenantBUser.from("empresas").select("id").eq("id", EMPRESA_A);
  expect(crossSelectB).toEqual([]);

  const { data: updateRows, error: updateError } = await tenantAUser
    .from("empresas")
    .update({ nome_fantasia: "spoof" })
    .eq("id", FIXTURE.empresaB)
    .select("id");
  expect(updateError).toBeNull();
  expect(updateRows).toEqual([]);

  const { data: stillB } = await admin
    .from("empresas")
    .select("nome_fantasia")
    .eq("id", FIXTURE.empresaB)
    .single();
  expect(stillB?.nome_fantasia).toBeNull();

  const { error: insertError } = await tenantAUser.from("empresas").insert({
    tenant_id: FIXTURE.tenantB,
    razao_social: "Spoof Cross Tenant",
    cnpj: `99${Date.now().toString().slice(-12)}`,
  });
  expect(insertError).not.toBeNull();
});

test("TENANT-004: contato de portal enxerga apenas a própria empresa", async () => {
  const portal = await signIn(FIXTURE.portalEmailB);

  const { data: own } = await portal.from("empresas").select("id").eq("id", FIXTURE.empresaB);
  expect(own).toHaveLength(1);

  const { data: otherCompany } = await portal.from("empresas").select("id").eq("id", EMPRESA_A);
  expect(otherCompany).toEqual([]);

  const { data: otherCharge } = await portal.from("cobrancas").select("id").eq("id", COBRANCA_A);
  expect(otherCharge).toEqual([]);
});

test("TENANT-003: storage não emite signed URL, upload ou delete cross-tenant", async () => {
  const admin = adminClient();
  const tenantAUser = await signIn("dirigente.demo@sindicatodemonstracao.org.br");
  const path = `${FIXTURE.empresaB}/phase0-storage-proof.txt`;

  await admin.storage.from("documentos-empresas").upload(path, Buffer.from("phase0"), {
    contentType: "text/plain",
    upsert: true,
  });

  const signed = await tenantAUser.storage.from("documentos-empresas").createSignedUrl(path, 60);
  expect(signed.error).not.toBeNull();

  const upload = await tenantAUser.storage
    .from("documentos-empresas")
    .upload(`${FIXTURE.empresaB}/phase0-forged-upload.txt`, Buffer.from("spoof"), { contentType: "text/plain" });
  expect(upload.error).not.toBeNull();

  await tenantAUser.storage.from("documentos-empresas").remove([path]);
  const stillThere = await admin.storage.from("documentos-empresas").download(path);
  expect(stillThere.error).toBeNull();
});

test("PRIV-001: RPC restrita a service_role não é executável por usuário autenticado", async () => {
  const tenantAUser = await signIn("dirigente.demo@sindicatodemonstracao.org.br");
  const { error } = await tenantAUser.rpc("backup_list_tables");
  expect(error).not.toBeNull();
});

test("AUDIT-001: auditoria rejeita tenant/object forjado e aceita evento legítimo", async () => {
  const tenantAUser = await signIn("dirigente.demo@sindicatodemonstracao.org.br");

  const forgedTenant = await tenantAUser.rpc("log_audit_event", {
    p_tenant_id: FIXTURE.tenantB,
    p_action: "phase0.audit.forged_tenant",
    p_entity_type: "empresa",
    p_entity_id: FIXTURE.empresaB,
    p_old_data: null,
    p_new_data: { spoofed: true },
    p_metadata: null,
  });
  expect(forgedTenant.error).not.toBeNull();

  const mismatchedObject = await tenantAUser.rpc("log_audit_event", {
    p_tenant_id: TENANT_A,
    p_action: "phase0.audit.forged_object",
    p_entity_type: "empresa",
    p_entity_id: FIXTURE.empresaB,
    p_old_data: null,
    p_new_data: { spoofed: true },
    p_metadata: null,
  });
  expect(mismatchedObject.error).not.toBeNull();

  const legitimate = await tenantAUser.rpc("log_audit_event", {
    p_tenant_id: TENANT_A,
    p_action: "phase0.audit.legitimate",
    p_entity_type: "empresa",
    p_entity_id: EMPRESA_A,
    p_old_data: null,
    p_new_data: { proof: "tenant-a" },
    p_metadata: null,
  });
  expect(legitimate.error).toBeNull();
  expect(legitimate.data).toBeTruthy();
});

test("PAY-001/PAY-002/PAY-003: webhook é idempotente sob replay exato e eventos pagos concorrentes", async ({ request }) => {
  const admin = adminClient();
  const externalId = `mock_charge_phase0_${randomUUID()}`;
  await cleanupPhase0PaymentArtifacts(externalId);
  const { data: charge, error: chargeError } = await admin
    .from("payment_charges")
    .insert({
      tenant_id: FIXTURE.tenantB,
      empresa_id: FIXTURE.empresaB,
      cobranca_id: FIXTURE.cobrancaB,
      provider: "mock",
      tipo: "pix",
      valor: 321.45,
      status: "pending",
      external_id: externalId,
      external_status: "ATIVA",
    })
    .select("id")
    .single();
  expect(chargeError).toBeNull();
  expect(charge?.id).toBeTruthy();

  const body = JSON.stringify({
    event_id: `mock_evt_phase0_${randomUUID()}`,
    charge_external_id: externalId,
    status: "PAGA",
    occurred_at: new Date().toISOString(),
  });
  const signature = signWebhook(body);

  const first = await request.post("/api/webhooks/payments/mock", {
    headers: { "content-type": "application/json", "x-webhook-signature": signature },
    data: body,
  });
  expect(first.status()).toBe(200);

  const replay = await request.post("/api/webhooks/payments/mock", {
    headers: { "content-type": "application/json", "x-webhook-signature": signature },
    data: body,
  });
  expect(replay.status()).toBe(200);

  const [eventTwo, eventThree] = [`mock_evt_phase0_${randomUUID()}`, `mock_evt_phase0_${randomUUID()}`].map((eventId) => {
    const concurrentBody = JSON.stringify({
      event_id: eventId,
      charge_external_id: externalId,
      status: "PAGA",
      occurred_at: new Date().toISOString(),
    });
    return request.post("/api/webhooks/payments/mock", {
      headers: { "content-type": "application/json", "x-webhook-signature": signWebhook(concurrentBody) },
      data: concurrentBody,
    });
  });
  const concurrentResponses = await Promise.all([eventTwo, eventThree]);
  expect(concurrentResponses.every((response) => response.status() === 200)).toBe(true);

  const { data: persistedCharge } = await admin
    .from("payment_charges")
    .select("pagamento_id, status")
    .eq("id", charge!.id)
    .single();
  expect(persistedCharge?.status).toBe("paid");
  expect(persistedCharge?.pagamento_id).toBeTruthy();

  const { count } = await admin
    .from("pagamentos")
    .select("id", { count: "exact", head: true })
    .eq("cobranca_id", FIXTURE.cobrancaB)
    .ilike("observacao", `%${externalId}%`);
  expect(count).toBe(1);
  await cleanupPhase0PaymentArtifacts(externalId);
});

test("PAY-001: assinatura inválida fica persistida e não processa pagamento", async ({ request }) => {
  const response = await request.post("/api/webhooks/payments/mock", {
    headers: { "content-type": "application/json", "x-webhook-signature": "assinatura-forjada" },
    data: {
      event_id: `mock_evt_phase0_invalid_${randomUUID()}`,
      charge_external_id: "mock_charge_phase0_invalid",
      status: "PAGA",
      occurred_at: new Date().toISOString(),
    },
  });

  expect(response.status()).toBe(401);
});
