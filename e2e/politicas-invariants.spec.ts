import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database, PolicyDecisionResult } from "../src/types/database.types";
import { DEMO_PASSWORD, SINDICATO_EMAIL, STAFF_EMAIL } from "./helpers/auth";

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

async function signIn(email: string) {
  const env = loadLocalEnv();
  const client = createClient<Database>(env.supabaseUrl, env.anonKey);
  const { error } = await client.auth.signInWithPassword({ email, password: DEMO_PASSWORD });
  expect(error).toBeNull();
  return client;
}

async function evaluate(
  email: string,
  actionCode: string,
  entityId: string,
  inputs: Record<string, unknown> = {},
) {
  const client = await signIn(email);
  const { data, error } = await client.rpc("evaluate_policy_action", {
    p_action_code: actionCode,
    p_tenant_id: null,
    p_entity_type: "policy_runtime_eval",
    p_entity_id: entityId,
    p_inputs: inputs,
  });

  expect(error).toBeNull();
  return data as { allowed: boolean; result: PolicyDecisionResult; reason: string; policy_id?: string };
}

test("STG11-EVAL-001/002: decision runtime retorna ALLOW e registra decisão versionada", async () => {
  const entityId = randomUUID();
  const result = await evaluate(STAFF_EMAIL, "policy.toggle", entityId, { requested_state: "inactive" });

  expect(result.allowed).toBe(true);
  expect(result.result).toBe("ALLOW");
  expect(result.policy_id).toBe("policy_decision_runtime");

  const { data } = await adminClient()
    .from("policy_decisoes")
    .select("policy_id, policy_versao, resultado, motivo, inputs")
    .eq("entity_id", entityId)
    .single();

  expect(data).toMatchObject({
    policy_id: "policy_decision_runtime",
    policy_versao: 1,
    resultado: "ALLOW",
  });
  expect(data?.motivo).toContain("Owner");
  expect(data?.inputs).toMatchObject({ action_code: "policy.toggle", requested_state: "inactive" });
});

test("STG11-EVAL-003: usuário sem autoridade recebe REQUIRE_ENTITY_AUTHORITY", async () => {
  const entityId = randomUUID();
  const result = await evaluate(SINDICATO_EMAIL, "policy.toggle", entityId);

  expect(result.allowed).toBe(false);
  expect(result.result).toBe("DENY");
  expect(result.reason).toBe("Ação exige usuário da plataforma GSBC.");

  const { data } = await adminClient()
    .from("policy_decisoes")
    .select("resultado, inputs")
    .eq("entity_id", entityId)
    .single();
  expect(data?.resultado).toBe("DENY");
  expect(data?.inputs).toMatchObject({ action_code: "policy.toggle" });
});

test("STG11-EVAL-004: ação financeira crítica exige MFA em vez de liberar execução", async () => {
  const entityId = randomUUID();
  const result = await evaluate(STAFF_EMAIL, "finance.critical_execution", entityId, { amount: 1000 });

  expect(result.allowed).toBe(false);
  expect(result.result).toBe("REQUIRE_MFA");
  expect(result.reason).toContain("MFA");
});

test("STG11-EVAL-005: execução autônoma por IA recebe GSBC_VETO", async () => {
  const entityId = randomUUID();
  const result = await evaluate(STAFF_EMAIL, "ai.tool_execution", entityId, { tool: "send_collection_notice" });

  expect(result.allowed).toBe(false);
  expect(result.result).toBe("GSBC_VETO");
  expect(result.reason).toContain("vetada");
});

test("STG11-EVAL-006: ação desconhecida falha fechada e fica auditada", async () => {
  const entityId = randomUUID();
  const result = await evaluate(STAFF_EMAIL, "unknown.action", entityId);

  expect(result.allowed).toBe(false);
  expect(result.result).toBe("DENY");

  const { data } = await adminClient()
    .from("policy_decisoes")
    .select("policy_id, resultado, motivo")
    .eq("entity_id", entityId)
    .single();
  expect(data).toMatchObject({
    policy_id: "policy_decision_runtime",
    resultado: "DENY",
    motivo: "Ação sem requisito de política registrado.",
  });
});
