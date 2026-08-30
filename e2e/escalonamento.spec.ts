import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database.types";
import { loginAs, SINDICATO_EMAIL, STAFF_EMAIL } from "./helpers/auth";
import { SEED } from "./helpers/seed-ids";

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
  };
}

function adminClient() {
  const env = loadLocalEnv();
  return createClient<Database>(env.supabaseUrl, env.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function staffClient() {
  const env = loadLocalEnv();
  const client = createClient<Database>(env.supabaseUrl, env.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email: STAFF_EMAIL,
    password: "Demo@12345",
  });
  expect(error?.message).toBeUndefined();
  return client;
}

async function expectOk<T>(promise: PromiseLike<{ error: { message: string } | null; data?: T }>) {
  const { error } = await promise;
  expect(error?.message).toBeUndefined();
}

async function setupEscalonamentoFixture() {
  const admin = adminClient();
  const tenantId = randomUUID();
  const sindicatoId = randomUUID();
  const empresaId = randomUUID();
  const instrumentoId = randomUUID();
  const obrigacaoId = randomUUID();
  const cobrancaId = randomUUID();
  const suffix = randomUUID().slice(0, 8);
  const cnpjDigits = Date.now().toString().slice(-12).padStart(12, "0");

  await expectOk(admin.from("tenants").insert({
    id: tenantId,
    type: "sindicato",
    name: `Escalonamento E2E ${suffix}`,
    slug: `escalonamento-e2e-${suffix}`,
    status: "active",
  }));
  await expectOk(admin.from("sindicatos").insert({
    id: sindicatoId,
    tenant_id: tenantId,
    razao_social: `Escalonamento E2E ${suffix}`,
    nome_fantasia: `Escalonamento E2E ${suffix}`,
    cnpj: `94${cnpjDigits}`,
    status: "active",
  }));
  await expectOk(admin.from("empresas").insert({
    id: empresaId,
    tenant_id: tenantId,
    razao_social: `Empresa Escalonamento ${suffix}`,
    cnpj: `93${cnpjDigits}`,
    endereco: { logradouro: "Rua do Teste, 100", cidade: "São Paulo", uf: "SP" },
    status: "active",
  }));
  await expectOk(admin.from("instrumentos").insert({
    id: instrumentoId,
    tenant_id: tenantId,
    empresa_id: empresaId,
    tipo: "act",
    titulo: `ACT Escalonamento ${suffix}`,
    status: "active",
  }));
  await expectOk(admin.from("obrigacoes").insert({
    id: obrigacaoId,
    tenant_id: tenantId,
    instrumento_id: instrumentoId,
    empresa_id: empresaId,
    descricao: `Contribuição assistencial Escalonamento ${suffix}`,
    periodicidade: "unica",
    vencimento: "2026-07-15",
    valor_referencia: 1200,
    status: "validated",
  }));
  await expectOk(admin.from("cobrancas").insert({
    id: cobrancaId,
    tenant_id: tenantId,
    empresa_id: empresaId,
    obrigacao_id: obrigacaoId,
    valor_principal: 1200,
    valor_atualizacao: 0,
    vencimento: "2026-07-20",
    prioridade: "high",
    status: "approved",
  }));

  return { tenantId, sindicatoId, empresaId, instrumentoId, obrigacaoId, cobrancaId };
}

async function cleanupEscalonamentoFixture(fixture: Awaited<ReturnType<typeof setupEscalonamentoFixture>>) {
  const admin = adminClient();
  const { data: documentos } = await admin
    .from("documentos")
    .select("id, storage_path")
    .eq("empresa_id", fixture.empresaId);
  const storagePaths = (documentos ?? []).map((documento) => documento.storage_path).filter(Boolean);

  if (storagePaths.length > 0) {
    await admin.storage.from("documentos-empresas").remove(storagePaths);
  }

  const { data: escalonamentos } = await admin
    .from("escalonamentos")
    .select("id")
    .eq("cobranca_id", fixture.cobrancaId);
  const escalonamentoIds = (escalonamentos ?? []).map((escalonamento) => escalonamento.id);

  if (escalonamentoIds.length > 0) {
    await admin.from("escalonamento_envios").delete().in("escalonamento_id", escalonamentoIds);
    await admin.from("escalonamento_eventos").delete().in("escalonamento_id", escalonamentoIds);
    await admin.from("escalonamento_documentos").delete().in("escalonamento_id", escalonamentoIds);
    await admin.from("escalonamentos").delete().in("id", escalonamentoIds);
  }

  await admin.from("documentos").delete().eq("empresa_id", fixture.empresaId);
  await admin.from("delivery_evidence_policies").delete().eq("tenant_id", fixture.tenantId);
  await admin.from("cobranca_eventos").delete().eq("cobranca_id", fixture.cobrancaId);
  await admin.from("collection_enrollments").delete().eq("cobranca_id", fixture.cobrancaId);
  await admin.from("cobrancas").delete().eq("id", fixture.cobrancaId);
  await admin.from("obrigacoes").delete().eq("id", fixture.obrigacaoId);
  await admin.from("instrumentos").delete().eq("id", fixture.instrumentoId);
  await admin.from("empresas").delete().eq("id", fixture.empresaId);
  await admin.from("sindicatos").delete().eq("tenant_id", fixture.tenantId);
  await admin.from("tenants").delete().eq("id", fixture.tenantId);
}

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

test("staff executa rejeição, nova aprovação, documento e envio físico com evidência auditável", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const fixture = await setupEscalonamentoFixture();
  const admin = adminClient();

  try {
    await loginAs(page, STAFF_EMAIL);
    await page.goto(`/backoffice/cobrancas/${fixture.cobrancaId}`);

    await page.getByRole("button", { name: "Iniciar escalonamento" }).click();
    await page.getByLabel("Motivo (critérios de escalonamento) *").fill(
      "Régua automática esgotada sem pagamento ou negociação válida.",
    );
    await page.getByRole("button", { name: "Iniciar", exact: true }).click();
    await expect(page.getByText("Em revisão")).toBeVisible();

    await page.getByRole("button", { name: "Submeter para aprovação" }).click();
    await expect(page.getByText("Aguardando aprovação")).toBeVisible();

    await page.getByRole("button", { name: "Decidir aprovação" }).click();
    await page.getByRole("button", { name: "Rejeitar" }).click();
    await page.getByLabel("Justificativa *").fill("Faltava evidência suficiente para envio formal.");
    await page.getByRole("button", { name: "Confirmar decisão" }).click();
    await expect(page.getByText("Rejeitada")).toBeVisible();

    await page.getByRole("button", { name: "Iniciar escalonamento" }).click();
    await page.getByLabel("Motivo (critérios de escalonamento) *").fill(
      "Nova revisão com evidências financeiras completas e contato sem resposta.",
    );
    await page.getByRole("button", { name: "Iniciar", exact: true }).click();
    await expect(page.getByText("Em revisão")).toBeVisible();

    await page.getByRole("button", { name: "Submeter para aprovação" }).click();
    await expect(page.getByText("Aguardando aprovação")).toBeVisible();
    await page.getByRole("button", { name: "Decidir aprovação" }).click();
    await page.getByLabel("Justificativa *").fill("Critérios documentais atendidos para notificação extrajudicial.");
    await page.getByRole("button", { name: "Confirmar decisão" }).click();
    await expect(page.getByText("Aprovada", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Gerar documento (PDF)" }).click();
    await expect(page.getByText("Documento emitido").first()).toBeVisible();

    await page.getByRole("button", { name: "Registrar envio físico" }).click();
    await page.getByLabel("Destinatário/endereço *").fill("Empresa Escalonamento, Rua do Teste, 100");
    await page.getByLabel("Referência externa").fill("AR E2E-STG09-001");
    await page.getByLabel("Observação").fill("Comprovante físico recebido no balcão e protocolo externo informado.");
    await page.getByRole("button", { name: "Registrar", exact: true }).click();

    await expect(page.getByText("Enviada", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("AR E2E-STG09-001").first()).toBeVisible();

    const { data: escalonamentos, error: escalonamentoError } = await admin
      .from("escalonamentos")
      .select("id, status, motivo_decisao")
      .eq("cobranca_id", fixture.cobrancaId)
      .order("created_at", { ascending: true });
    expect(escalonamentoError?.message).toBeUndefined();
    expect(escalonamentos).toHaveLength(2);
    expect(escalonamentos?.[0]?.status).toBe("rejeitada");
    expect(escalonamentos?.[1]?.status).toBe("enviada");

    const { data: envios, error: enviosError } = await admin
      .from("escalonamento_envios")
      .select("canal, delivery_status, evidencia_referencia, comprovante_documento_id, delivery_policy_version, policy_relevant_timestamp, delivery_valid")
      .eq("escalonamento_id", escalonamentos![1]!.id);
    expect(enviosError?.message).toBeUndefined();
    expect(envios).toEqual([
      expect.objectContaining({
        canal: "correio_ar",
        delivery_status: "desconhecido",
        evidencia_referencia: "AR E2E-STG09-001",
        comprovante_documento_id: null,
        delivery_policy_version: 1,
        delivery_valid: true,
      }),
    ]);
    expect(envios?.[0]?.policy_relevant_timestamp).toBeTruthy();

    const { data: cobranca, error: cobrancaError } = await admin
      .from("cobrancas")
      .select("status")
      .eq("id", fixture.cobrancaId)
      .single();
    expect(cobrancaError?.message).toBeUndefined();
    expect(cobranca?.status).toBe("legal_escalation");
  } finally {
    await cleanupEscalonamentoFixture(fixture);
  }
});

test("envio com falha não avança cobrança para legal_escalation", async () => {
  const fixture = await setupEscalonamentoFixture();
  const admin = adminClient();
  const escalonamentoId = randomUUID();

  try {
    await expectOk(admin.from("escalonamentos").insert({
      id: escalonamentoId,
      tenant_id: fixture.tenantId,
      empresa_id: fixture.empresaId,
      cobranca_id: fixture.cobrancaId,
      status: "documento_emitido",
      motivo: "Fixture para validar falha de envio sem avanço jurídico.",
    }));

    const staff = await staffClient();
    const { data: envioId, error: envioError } = await staff.rpc("registrar_envio", {
      p_escalonamento_id: escalonamentoId,
      p_canal: "correio_ar",
      p_destinatario: "Empresa Escalonamento, Rua do Teste, 100",
      p_delivery_status: "falha",
      p_erro: "Objeto devolvido pelos Correios.",
      p_comprovante_documento_id: null,
      p_evidencia_referencia: "AR-FALHA-STG09-001",
      p_observacao: "Falha proposital para validação de transição.",
    });
    expect(envioError?.message).toBeUndefined();
    expect(envioId).toBeTruthy();

    const { data: escalonamento, error: escalonamentoError } = await admin
      .from("escalonamentos")
      .select("status")
      .eq("id", escalonamentoId)
      .single();
    expect(escalonamentoError?.message).toBeUndefined();
    expect(escalonamento?.status).toBe("documento_emitido");

    const { data: cobranca, error: cobrancaError } = await admin
      .from("cobrancas")
      .select("status")
      .eq("id", fixture.cobrancaId)
      .single();
    expect(cobrancaError?.message).toBeUndefined();
    expect(cobranca?.status).toBe("approved");
  } finally {
    await cleanupEscalonamentoFixture(fixture);
  }
});

test("policy de delivery bloqueia envio físico sem evidência obrigatória", async () => {
  const fixture = await setupEscalonamentoFixture();
  const admin = adminClient();
  const escalonamentoId = randomUUID();

  try {
    await expectOk(admin.from("escalonamentos").insert({
      id: escalonamentoId,
      tenant_id: fixture.tenantId,
      empresa_id: fixture.empresaId,
      cobranca_id: fixture.cobrancaId,
      status: "documento_emitido",
      motivo: "Fixture para validar DeliveryEvidencePolicy sem evidência.",
    }));

    const staff = await staffClient();
    const { error: envioError } = await staff.rpc("registrar_envio", {
      p_escalonamento_id: escalonamentoId,
      p_canal: "cartorio",
      p_destinatario: "Cartório de Registro de Títulos e Documentos",
      p_delivery_status: "entregue",
      p_erro: null,
      p_comprovante_documento_id: null,
      p_evidencia_referencia: null,
      p_observacao: null,
    });
    expect(envioError?.message).toContain("exige comprovante anexado ou referência externa auditável");

    const { data: envios, error: enviosError } = await admin
      .from("escalonamento_envios")
      .select("id")
      .eq("escalonamento_id", escalonamentoId);
    expect(enviosError?.message).toBeUndefined();
    expect(envios).toEqual([]);

    const { data: cobranca, error: cobrancaError } = await admin
      .from("cobrancas")
      .select("status")
      .eq("id", fixture.cobrancaId)
      .single();
    expect(cobrancaError?.message).toBeUndefined();
    expect(cobranca?.status).toBe("approved");
  } finally {
    await cleanupEscalonamentoFixture(fixture);
  }
});

test("policy de delivery preserva versão, timestamp e vínculo de arquivo histórico", async () => {
  const fixture = await setupEscalonamentoFixture();
  const admin = adminClient();
  const escalonamentoId = randomUUID();
  const documentoId = randomUUID();

  try {
    await expectOk(admin.from("escalonamentos").insert({
      id: escalonamentoId,
      tenant_id: fixture.tenantId,
      empresa_id: fixture.empresaId,
      cobranca_id: fixture.cobrancaId,
      status: "documento_emitido",
      motivo: "Fixture para validar snapshot de DeliveryEvidencePolicy.",
    }));
    await expectOk(admin.from("documentos").insert({
      id: documentoId,
      tenant_id: fixture.tenantId,
      empresa_id: fixture.empresaId,
      storage_path: `${fixture.empresaId}/comprovante-delivery-policy.pdf`,
      nome_arquivo: "comprovante-delivery-policy.pdf",
      categoria: "comprovante",
      tamanho_bytes: 128,
    }));

    const staff = await staffClient();
    const { data: envioId, error: envioError } = await staff.rpc("registrar_envio", {
      p_escalonamento_id: escalonamentoId,
      p_canal: "correio_ar",
      p_destinatario: "Empresa Escalonamento, Rua do Teste, 100",
      p_delivery_status: "entregue",
      p_erro: null,
      p_comprovante_documento_id: documentoId,
      p_evidencia_referencia: "AR-ARQUIVO-STG09-001",
      p_observacao: "Arquivo comprobatório vinculado ao envio.",
    });
    expect(envioError?.message).toBeUndefined();
    expect(envioId).toBeTruthy();

    const { data: envio, error: envioSelectError } = await admin
      .from("escalonamento_envios")
      .select("delivery_policy_id, delivery_policy_version, policy_relevant_timestamp, delivery_valid, comprovante_documento_id")
      .eq("id", envioId!)
      .single();
    expect(envioSelectError?.message).toBeUndefined();
    expect(envio).toEqual(expect.objectContaining({
      delivery_policy_version: 1,
      delivery_valid: true,
      comprovante_documento_id: documentoId,
    }));
    expect(envio?.delivery_policy_id).toBeTruthy();
    expect(envio?.policy_relevant_timestamp).toBeTruthy();

    await expectOk(admin.from("delivery_evidence_policies").insert({
      id: randomUUID(),
      tenant_id: fixture.tenantId,
      version: 2,
      effective_from: "2099-01-01",
      communication_type: "extrajudicial_notice",
      channel: "correio_ar",
      evidence_required: ["future_rule"],
      validity_rule: "future_policy_must_not_rewrite_historical_event",
      relevant_timestamp_field: "future_delivered_at",
      failure_behavior: "future_failure_behavior",
      requires_human_review: true,
      starts_operational_deadline: false,
      starts_legal_deadline: false,
    }));

    const { data: unchanged, error: unchangedError } = await admin
      .from("escalonamento_envios")
      .select("delivery_policy_version, policy_relevant_timestamp, comprovante_documento_id")
      .eq("id", envioId!)
      .single();
    expect(unchangedError?.message).toBeUndefined();
    expect(unchanged?.delivery_policy_version).toBe(1);
    expect(unchanged?.comprovante_documento_id).toBe(documentoId);

    const { data: collectionPolicies, error: policyError } = await admin
      .from("delivery_evidence_policies")
      .select("channel, validity_rule")
      .eq("communication_type", "collection_attempt")
      .in("channel", ["email", "whatsapp"])
      .order("channel");
    expect(policyError?.message).toBeUndefined();
    expect(collectionPolicies?.map((policy) => policy.channel).sort()).toEqual(["email", "whatsapp"]);
  } finally {
    await cleanupEscalonamentoFixture(fixture);
  }
});
