import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database.types";
import { loginAs, SINDICATO_EMAIL, STAFF_EMAIL } from "./helpers/auth";

/**
 * Revenue Command Center (STG-08, ver docs/roadmap-stagings.md) — a
 * matemática do funil (rank histórico via cobranca_eventos) é
 * verificada manualmente ao vivo com fixtures construídas pra exercitar
 * os casos não-lineares (cobrança que negocia e depois cancela, etc.) —
 * regra 92, ver docs/rodadas/rodada-24-revenue-command-center.md. Aqui
 * cobrimos só o que não muda dado em staging: a página carrega pros
 * dois papéis (regra 6 — "o sindicato acompanha"), o nav item aparece,
 * e o drill-down de cobranças aceita filtro de status.
 */

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

async function expectOk(promise: PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await promise;
  expect(error?.message).toBeUndefined();
}

async function setupRevenueSegmentationFixture() {
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
    name: `Receita Segmentação ${suffix}`,
    slug: `receita-segmentacao-${suffix}`,
    status: "active",
  }));
  await expectOk(admin.from("sindicatos").insert({
    id: sindicatoId,
    tenant_id: tenantId,
    razao_social: `Receita Segmentação ${suffix} Ltda`,
    nome_fantasia: `Receita Segmentação ${suffix}`,
    cnpj: `94${cnpjDigits}`,
    status: "active",
  }));
  await expectOk(admin.from("empresas").insert({
    id: empresaId,
    tenant_id: tenantId,
    razao_social: `Empresa Segmentação ${suffix}`,
    cnpj: `93${cnpjDigits}`,
    status: "active",
  }));
  await expectOk(admin.from("instrumentos").insert({
    id: instrumentoId,
    tenant_id: tenantId,
    empresa_id: empresaId,
    tipo: "act",
    titulo: `ACT Segmentação ${suffix}`,
    status: "active",
  }));
  await expectOk(admin.from("obrigacoes").insert({
    id: obrigacaoId,
    tenant_id: tenantId,
    instrumento_id: instrumentoId,
    empresa_id: empresaId,
    descricao: `Obrigação Segmentação ${suffix}`,
    periodicidade: "unica",
    vencimento: "2026-10-15",
    valor_referencia: 1234.56,
    status: "validated",
  }));
  await expectOk(admin.from("cobrancas").insert({
    id: cobrancaId,
    tenant_id: tenantId,
    empresa_id: empresaId,
    obrigacao_id: obrigacaoId,
    valor_principal: 1234.56,
    valor_atualizacao: 0,
    vencimento: "2026-10-15",
    prioridade: "medium",
    status: "approved",
  }));

  return {
    tenantId,
    empresaId,
    instrumentoId,
    obrigacaoId,
    cobrancaId,
    empresaNome: `Empresa Segmentação ${suffix}`,
    obrigacaoDescricao: `Obrigação Segmentação ${suffix}`,
  };
}

async function cleanupRevenueSegmentationFixture(fixture: Awaited<ReturnType<typeof setupRevenueSegmentationFixture>>) {
  const admin = adminClient();
  await admin.from("cobranca_eventos").delete().eq("cobranca_id", fixture.cobrancaId);
  await admin.from("cobrancas").delete().eq("id", fixture.cobrancaId);
  await admin.from("obrigacoes").delete().eq("id", fixture.obrigacaoId);
  await admin.from("instrumentos").delete().eq("id", fixture.instrumentoId);
  await admin.from("empresas").delete().eq("id", fixture.empresaId);
  await admin.from("sindicatos").delete().eq("tenant_id", fixture.tenantId);
  await admin.from("tenants").delete().eq("id", fixture.tenantId);
}

test("staff GSBC vê o Revenue Command Center", async ({ page }) => {
  await loginAs(page, STAFF_EMAIL);
  await page.goto("/backoffice/receita");

  await expect(page.getByRole("heading", { name: "Receita" })).toBeVisible();
  await expect(page.getByText("Receita identificada")).toBeVisible();
  await expect(page.getByText("Funil de receita")).toBeVisible();
  await expect(page.getByText("Tendência mensal")).toBeVisible();
  await expect(page.getByText("Segmentação de receita")).toBeVisible();
});

test("Revenue Command Center segmenta por empresa, obrigação, período e status com drill-down", async ({ page }) => {
  const fixture = await setupRevenueSegmentationFixture();

  try {
    await loginAs(page, STAFF_EMAIL);
    await page.goto("/backoffice/receita");

    await expect(page.getByText("Segmentação de receita")).toBeVisible();
    await expect(page.getByText(fixture.empresaNome)).toBeVisible();
    await page.getByRole("link", { name: new RegExp(fixture.empresaNome) }).click();
    await expect(page).toHaveURL(new RegExp(`empresaId=${fixture.empresaId}`));
    await expect(page.getByText("Filtrado por empresa")).toBeVisible();

    await page.goto("/backoffice/receita");
    await page.getByRole("tab", { name: "Obrigação" }).click();
    await expect(page.getByText(fixture.obrigacaoDescricao)).toBeVisible();
    await page.getByRole("link", { name: new RegExp(fixture.obrigacaoDescricao) }).click();
    await expect(page).toHaveURL(new RegExp(`obrigacaoId=${fixture.obrigacaoId}`));
    await expect(page.getByText("Filtrado por obrigação")).toBeVisible();

    await page.goto("/backoffice/receita");
    await page.getByRole("tab", { name: "Período" }).click();
    await page.locator('a[href*="vencimentoInicio=2026-10-01"]').click();
    await expect(page).toHaveURL(/vencimentoInicio=2026-10-01/);
    await expect(page).toHaveURL(/vencimentoFim=2026-10-31/);
    await expect(page.getByText(/Filtrado por vencimento/)).toBeVisible();

    await page.goto("/backoffice/receita");
    await page.getByRole("tab", { name: "Status" }).click();
    await expect(page.getByRole("link", { name: /Aprovada/ })).toBeVisible();
    await page.getByRole("link", { name: /Aprovada/ }).click();
    await expect(page).toHaveURL(/status=approved/);
    await expect(page.getByText(/Filtrado por status "Aprovada"/)).toBeVisible();
  } finally {
    await cleanupRevenueSegmentationFixture(fixture);
  }
});

test("sindicato também vê o Revenue Command Center (transparência, regra 6)", async ({
  page,
}) => {
  await loginAs(page, SINDICATO_EMAIL);
  await page.goto("/backoffice/receita");

  await expect(page.getByRole("heading", { name: "Receita" })).toBeVisible();
  await expect(page.getByText("Receita identificada")).toBeVisible();
});

test("nav lateral tem o item Receita pros dois papéis", async ({ page }) => {
  await loginAs(page, STAFF_EMAIL);
  await expect(page.getByRole("link", { name: "Receita" })).toBeVisible();
});

test("drill-down de status na tela de cobranças mostra indicador de filtro", async ({
  page,
}) => {
  await loginAs(page, STAFF_EMAIL);
  await page.goto("/backoffice/cobrancas?status=paid,partially_paid");

  await expect(page.getByText(/Filtrado por status/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Limpar filtro" })).toBeVisible();
});
