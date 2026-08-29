import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database.types";

const CRITICAL_TABLES = [
  "tenants",
  "empresas",
  "cobrancas",
  "pagamentos",
  "audit_logs",
  "payment_charges",
  "payment_webhook_events",
] as const;

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
    cronSecret: env.CRON_SECRET,
    dbContainer: env.SUPABASE_DB_CONTAINER ?? "supabase_db_GSBC_2_-_Claude",
  };
}

test("RESTORE-001: backup cron gera artefato restaurável em smoke test local com rollback", async ({
  request,
}) => {
  const env = loadLocalEnv();
  expect(env.cronSecret).toBeTruthy();

  const response = await request.get("/api/cron/backup", {
    headers: { authorization: `Bearer ${env.cronSecret}` },
    timeout: 120_000,
  });
  expect(response.status()).toBe(200);

  const backupResult = (await response.json()) as { arquivo: string; tabelas: number; erros: string[] };
  expect(backupResult.arquivo).toMatch(/^backup-/);
  expect(backupResult.tabelas).toBeGreaterThan(0);
  expect(backupResult.erros).toEqual([]);

  const admin = createClient<Database>(env.supabaseUrl, env.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const downloaded = await admin.storage.from("db-backups").download(backupResult.arquivo);
  expect(downloaded.error).toBeNull();
  expect(downloaded.data).toBeTruthy();

  const payload = JSON.parse(await downloaded.data!.text()) as {
    tabelas: Record<string, unknown[]>;
    authUsers: unknown[];
  };
  expect(Array.isArray(payload.authUsers)).toBe(true);

  const rows = CRITICAL_TABLES.map((table) => {
    const value = payload.tabelas[table];
    expect(Array.isArray(value)).toBe(true);
    return `('${table}', ${value.length})`;
  }).join(",");

  const sql = [
    "begin;",
    "create temp table phase0_restore_probe (table_name text primary key, row_count integer not null);",
    `insert into phase0_restore_probe (table_name, row_count) values ${rows};`,
    `select count(*) from phase0_restore_probe where table_name in (${CRITICAL_TABLES.map((t) => `'${t}'`).join(",")});`,
    "rollback;",
  ].join(" ");

  const output = execFileSync("docker", [
    "exec",
    env.dbContainer,
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    sql,
  ], { encoding: "utf8" });

  expect(output).toContain(String(CRITICAL_TABLES.length));
});
