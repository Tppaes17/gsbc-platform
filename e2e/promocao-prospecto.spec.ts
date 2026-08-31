import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loginAs, STAFF_EMAIL } from "./helpers/auth";
import { createProspectosFixture } from "./helpers/prospectos-fixture";
import type { Database } from "../src/types/database.types";

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

/**
 * Promoção de Prospecto para Empresa (STG-01, ver docs/roadmap-stagings.md)
 * — elimina o recadastro manual: importa uma planilha (Rodada 16),
 * promove um dos prospectos resultantes e confirma que a empresa nasce
 * com o mesmo dossiê/evidências, sem recadastro.
 */

test("Owner promove um prospecto para empresa sem recadastro", async ({ page }, testInfo) => {
  const fixture = createProspectosFixture(testInfo);

  await loginAs(page, STAFF_EMAIL);

  await page.goto("/backoffice/prospectos");
  await page.getByRole("button", { name: "Importar planilha" }).click();
  await page.locator('input#file[type="file"]').setInputFiles(fixture.path);
  await page.getByRole("button", { name: "Importar" }).click();
  await expect(page.getByText(/2 prospecto\(s\) novo\(s\)/)).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Close" }).click();

  const { data: prospecto, error } = await adminClient()
    .from("dossies_cadastrais")
    .select("id")
    .eq("cnpj_consultado", fixture.cnpjUm)
    .single();
  expect(error?.message).toBeUndefined();

  await page.goto(`/backoffice/prospectos/${prospecto!.id}`);

  await page.getByRole("button", { name: "Promover para empresa" }).click();
  await expect(page.getByRole("heading", { name: "Promover prospecto para empresa" })).toBeVisible();
  await page.getByRole("button", { name: "Promover para empresa" }).last().click();

  await page.waitForURL("**/backoffice/empresas/**");
  await expect(page.getByRole("heading", { name: fixture.nomeUm })).toBeVisible();
  await expect(page.getByText("Inteligência cadastral")).toBeVisible();
  await expect(page.getByText(fixture.emailUm).first()).toBeVisible();

  await page.goto("/backoffice/empresas");
  await expect(page.getByText(fixture.nomeUm).first()).toBeVisible();

  await page.goto("/backoffice/prospectos");
  await expect(page.getByText(fixture.nomeUm)).toHaveCount(0);
});
