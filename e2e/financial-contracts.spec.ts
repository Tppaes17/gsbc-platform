import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
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
  };
}

function adminClient() {
  const env = loadLocalEnv();
  return createClient<Database>(env.supabaseUrl, env.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function createSindicatoFixture() {
  const admin = adminClient();
  const tenantId = randomUUID();
  const sindicatoId = randomUUID();
  const suffix = randomUUID().slice(0, 8);
  const cnpjDigits = Date.now().toString().slice(-12).padStart(12, "0");
  const label = `Financeiro E2E ${suffix}`;

  const tenantResult = await admin.from("tenants").insert({
    id: tenantId,
    type: "sindicato",
    name: label,
    slug: `financeiro-e2e-${suffix}`,
    status: "active",
  });
  expect(tenantResult.error?.message).toBeUndefined();

  const sindicatoResult = await admin.from("sindicatos").insert({
    id: sindicatoId,
    tenant_id: tenantId,
    razao_social: `${label} Ltda`,
    nome_fantasia: label,
    cnpj: `97${cnpjDigits}`,
    status: "active",
  });
  expect(sindicatoResult.error?.message).toBeUndefined();

  return { tenantId, sindicatoId, label };
}

async function cleanupFixture(tenantId: string) {
  const admin = adminClient();
  await admin.from("financial_split_rules").delete().eq("tenant_id", tenantId);
  await admin.from("financial_contracts").delete().eq("tenant_id", tenantId);
  await admin.from("sindicatos").delete().eq("tenant_id", tenantId);
  await admin.from("tenants").delete().eq("id", tenantId);
}

test("staff valida contrato financeiro e cria versão de split ativa", async ({ page }) => {
  const fixture = await createSindicatoFixture();
  const title = `Contrato Financeiro E2E ${randomUUID().slice(0, 8)}`;

  try {
    await loginAs(page, STAFF_EMAIL);
    await expect(page.getByRole("link", { name: "Contratos" })).toBeVisible();
    await page.goto("/backoffice/contratos-financeiros");

    await page.getByLabel("Sindicato *").selectOption({ label: fixture.label });
    await page.getByLabel("Título *").fill(title);
    await page.getByLabel("Início *").fill("2026-01-01");
    await page.getByLabel("Observação").first().fill("Criado por E2E de Revenue Core");
    await page.getByRole("button", { name: "Validar contrato" }).click();
    await expect(page.getByText("Contrato financeiro validado.")).toBeVisible();
    await expect(page.getByRole("cell", { name: title })).toBeVisible();

    await page.getByLabel("Contrato validado *").selectOption({ label: `${title} · ${fixture.label}` });
    await page.getByLabel("Vigência da regra *").fill("2026-01-01");
    await page.getByLabel("GSBC % *").fill("25");
    await page.getByLabel("Sindicato % *").fill("70");
    await page.getByLabel("Terceiros % *").fill("5");
    await page.getByLabel("Taxa externa % *").fill("2.5");
    await page.getByLabel("Taxa fixa").fill("1,25");
    await page.getByLabel("Observação").last().fill("Split versionado por E2E");
    await page.getByRole("button", { name: "Criar versão" }).click();

    await expect(page.getByText("Versão de split criada.")).toBeVisible();
    await expect(page.getByText(/v1 .*GSBC 25% .*Sindicato 70% .*Terceiros 5%/)).toBeVisible();
    await expect(page.getByText("2,5% + R$ 1,25")).toBeVisible();

    const admin = adminClient();
    const { data: contracts } = await admin
      .from("financial_contracts")
      .select("id, status, validado_por, validado_em")
      .eq("tenant_id", fixture.tenantId)
      .eq("titulo", title);
    expect(contracts).toHaveLength(1);
    expect(contracts?.[0]?.status).toBe("validated");
    expect(contracts?.[0]?.validado_por).toBeTruthy();
    expect(contracts?.[0]?.validado_em).toBeTruthy();

    const { data: rules } = await admin
      .from("financial_split_rules")
      .select("status, version, gsbc_percent, sindicato_percent, terceiros_percent, fee_policy")
      .eq("tenant_id", fixture.tenantId)
      .eq("contract_id", contracts![0].id);
    expect(rules).toEqual([
      {
        status: "active",
        version: 1,
        gsbc_percent: 25,
        sindicato_percent: 70,
        terceiros_percent: 5,
        fee_policy: { provider_fee_fixed: 1.25, provider_fee_percent: 2.5 },
      },
    ]);
  } finally {
    await cleanupFixture(fixture.tenantId);
  }
});

test("usuário de sindicato não acessa contratos financeiros", async ({ page }) => {
  await loginAs(page, SINDICATO_EMAIL);
  await expect(page.getByRole("link", { name: "Contratos Financeiros" })).toHaveCount(0);

  await page.goto("/backoffice/contratos-financeiros");
  await expect(page).toHaveURL(/\/backoffice$/);
});
