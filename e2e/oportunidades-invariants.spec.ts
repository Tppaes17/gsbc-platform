import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  calcularScoreOportunidade,
  escolherCandidato,
  type HistoricoObrigacoesCandidato,
  type InstrumentoPotencial,
  type ProspectoParaAvaliacao,
  type SindicatoCandidato,
} from "../src/lib/oportunidades/scoring";
import type { Database } from "../src/types/database.types";
import { DEMO_PASSWORD, SINDICATO_EMAIL, STAFF_EMAIL, loginAs } from "./helpers/auth";

const FIXTURE = {
  dossieId: "71000000-0000-0000-0000-000000001010",
  tenantId: "72000000-0000-0000-0000-000000001010",
  sindicatoId: "73000000-0000-0000-0000-000000001010",
  instrumentoId: "74000000-0000-0000-0000-000000001010",
  empresaHistoricoId: "75000000-0000-0000-0000-000000001010",
  obrigacaoId: "76000000-0000-0000-0000-000000001010",
  cnpj: "77101010000190",
};

type TableName =
  | "obrigacoes"
  | "cobrancas"
  | "payment_charges"
  | "notificacoes"
  | "escalonamentos"
  | "escalonamento_envios";

const SIDE_EFFECT_TABLES: TableName[] = [
  "obrigacoes",
  "cobrancas",
  "payment_charges",
  "notificacoes",
  "escalonamentos",
  "escalonamento_envios",
];

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

async function expectOk<T>(promise: PromiseLike<{ error: { message: string } | null; data?: T }>) {
  const { error } = await promise;
  expect(error?.message).toBeUndefined();
}

async function cleanup(admin: SupabaseClient<Database>) {
  await admin.from("oportunidade_eventos").delete().eq("oportunidade_id", await oportunidadeId(admin));
  await admin.from("oportunidade_fatores").delete().eq("oportunidade_id", await oportunidadeId(admin));
  await admin.from("oportunidades").delete().eq("dossie_cadastral_id", FIXTURE.dossieId);
  await admin.from("dossie_evidencias").delete().eq("dossie_id", FIXTURE.dossieId);
  await admin.from("dossies_cadastrais").delete().eq("id", FIXTURE.dossieId);
  await admin.from("obrigacoes").delete().eq("id", FIXTURE.obrigacaoId);
  await admin.from("instrumentos").delete().eq("id", FIXTURE.instrumentoId);
  await admin.from("empresas").delete().eq("id", FIXTURE.empresaHistoricoId);
  await admin.from("sindicatos").delete().eq("id", FIXTURE.sindicatoId);
  await admin.from("tenants").delete().eq("id", FIXTURE.tenantId);
}

async function oportunidadeId(admin: SupabaseClient<Database>) {
  const { data } = await admin
    .from("oportunidades")
    .select("id")
    .eq("dossie_cadastral_id", FIXTURE.dossieId)
    .maybeSingle();
  return data?.id ?? "00000000-0000-0000-0000-000000000000";
}

async function setup(admin: SupabaseClient<Database>) {
  await cleanup(admin);

  await expectOk(admin.from("tenants").insert({
    id: FIXTURE.tenantId,
    type: "sindicato",
    name: "Sindicato STG10 Invariants",
    slug: "sindicato-stg10-invariants",
    status: "active",
    onboarding_status: "active",
  }));
  await expectOk(admin.from("sindicatos").insert({
    id: FIXTURE.sindicatoId,
    tenant_id: FIXTURE.tenantId,
    razao_social: "Sindicato STG10 Invariants",
    cnpj: "77101010000100",
    categoria: "Comércio varejista de alimentos",
    base_territorial: "Estado de São Paulo",
    status: "active",
  }));
  await expectOk(admin.from("empresas").insert({
    id: FIXTURE.empresaHistoricoId,
    tenant_id: FIXTURE.tenantId,
    razao_social: "Empresa Histórica STG10 Ltda",
    cnpj: "77101010000281",
    status: "active",
  }));
  await expectOk(admin.from("instrumentos").insert({
    id: FIXTURE.instrumentoId,
    tenant_id: FIXTURE.tenantId,
    empresa_id: null,
    tipo: "cct",
    titulo: "CCT STG10 Invariants",
    status: "active",
  }));
  await expectOk(admin.from("obrigacoes").insert({
    id: FIXTURE.obrigacaoId,
    tenant_id: FIXTURE.tenantId,
    instrumento_id: FIXTURE.instrumentoId,
    empresa_id: FIXTURE.empresaHistoricoId,
    descricao: "Contribuição histórica para estimativa STG10",
    periodicidade: "mensal",
    valor_referencia: 1234.56,
    status: "validated",
  }));
  await expectOk(admin.from("dossies_cadastrais").insert({
    id: FIXTURE.dossieId,
    tenant_id: null,
    empresa_id: null,
    status: "cadastro_validado",
    cnpj_consultado: FIXTURE.cnpj,
    razao_social: "Prospecto STG10 Invariants",
    origem: "importacao_planilha",
    dados_oficiais: {
      uf: "SP",
      municipio: "São Paulo",
      razaoSocial: "Prospecto STG10 Invariants",
      situacaoCadastral: "ATIVA",
      cnaePrincipalDescricao: "Comércio varejista de alimentos",
      email: "financeiro@prospectostg10.test",
      telefone: "11999990000",
      qsa: [{ nome: "Sócio STG10" }],
    },
    score_confiabilidade: 90,
    score_classificacao: "excelente",
    ultima_consulta_em: null,
  }));
  await expectOk(admin.from("dossie_evidencias").insert([
    {
      dossie_id: FIXTURE.dossieId,
      tipo: "cnpj",
      campo: "cnpj",
      valor: FIXTURE.cnpj,
      fonte: "fixture-stg10-oficial",
      nivel_confianca: "confirmado",
    },
    {
      dossie_id: FIXTURE.dossieId,
      tipo: "email",
      campo: "email",
      valor: "financeiro@prospectostg10.test",
      fonte: "fixture-stg10-contato",
      nivel_confianca: "provavel",
    },
  ]));
}

async function tableCounts(admin: SupabaseClient<Database>) {
  const entries = await Promise.all(
    SIDE_EFFECT_TABLES.map(async (table) => {
      const { count, error } = await admin.from(table).select("id", { count: "exact", head: true });
      expect(error).toBeNull();
      return [table, count ?? 0] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<TableName, number>;
}

async function evaluateOpportunity(page: Page) {
  await loginAs(page, STAFF_EMAIL);
  await page.goto(`/backoffice/prospectos/${FIXTURE.dossieId}`);
  await page.getByRole("button", { name: "Avaliar oportunidade" }).click();
  await expect(page.getByText("Oportunidade avaliada.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Opportunity Engine")).toBeVisible();
  await expect(page.getByText("Estimativa econômica inferida:")).toBeVisible();
}

test.describe.configure({ mode: "serial" });

test.beforeEach(async () => {
  await setup(adminClient());
});

test.afterEach(async () => {
  await cleanup(adminClient());
});

test("STG10-EVAL-002/004: scoring é determinístico e fatores carregam proveniência explícita", async () => {
  const prospecto: ProspectoParaAvaliacao = {
    uf: "SP",
    municipio: "São Paulo",
    cnaeDescricao: "Comércio varejista de alimentos",
    temDadosOficiais: true,
    temRazaoSocial: true,
    temSituacaoCadastral: true,
    temQsa: true,
    temEmail: true,
    temTelefone: true,
    ultimaConsultaEm: null,
    quantidadeFontesDistintas: 2,
  };
  const sindicatos: SindicatoCandidato[] = [
    {
      tenantId: FIXTURE.tenantId,
      tenantNome: "Sindicato STG10 Invariants",
      categoria: "Comércio varejista de alimentos",
      baseTerritorial: "Estado de São Paulo",
    },
  ];
  const instrumentosPotenciais: InstrumentoPotencial[] = [
    { id: FIXTURE.instrumentoId, titulo: "CCT STG10 Invariants", tipo: "cct", vigenciaFim: null },
  ];
  const historico: HistoricoObrigacoesCandidato = { quantidade: 1, media: 1234.56 };
  const { candidatosAvaliados, melhor } = escolherCandidato(prospecto, sindicatos);

  const first = calcularScoreOportunidade({ prospecto, candidatosAvaliados, melhor, instrumentosPotenciais, historico });
  const second = calcularScoreOportunidade({ prospecto, candidatosAvaliados, melhor, instrumentosPotenciais, historico });

  expect(second).toEqual(first);
  expect(first.fatores).toHaveLength(7);
  for (const fator of first.fatores) {
    expect(fator.explicacao.length).toBeGreaterThan(10);
    expect(fator.sourceFields.length).toBeGreaterThan(0);
    expect(["observed_data", "derived_inference"]).toContain(fator.sourceType);
    expect(fator.evidenceSnapshot).toBeTruthy();
  }
});

test("STG10-EVAL-003/006: avaliar oportunidade não cria dívida, cobrança, comunicação ou efeito financeiro", async ({ page }) => {
  const admin = adminClient();
  const before = await tableCounts(admin);

  await evaluateOpportunity(page);

  const after = await tableCounts(admin);
  expect(after).toEqual(before);

  const { data: oportunidade } = await admin
    .from("oportunidades")
    .select("id, status, estimativa_valor, oportunidade_fatores(source_type, source_fields, evidence_snapshot)")
    .eq("dossie_cadastral_id", FIXTURE.dossieId)
    .single();
  expect(oportunidade?.status).toBe("potencial");
  expect(oportunidade?.estimativa_valor).toBe(1234.56);
  expect(oportunidade?.oportunidade_fatores).toHaveLength(7);
  for (const fator of oportunidade?.oportunidade_fatores ?? []) {
    expect(fator.source_type).toBeTruthy();
    expect(fator.source_fields.length).toBeGreaterThan(0);
    expect(fator.evidence_snapshot).toBeTruthy();
  }
});

test("STG10-EVAL-005: sindicato não lê, altera ou insere oportunidades", async ({ page }) => {
  const admin = adminClient();
  await evaluateOpportunity(page);
  const id = await oportunidadeId(admin);

  const sindicato = await signIn(SINDICATO_EMAIL);
  const { data: readRows, error: readError } = await sindicato.from("oportunidades").select("id").eq("id", id);
  expect(readError).toBeNull();
  expect(readRows).toEqual([]);

  const { data: updateRows, error: updateError } = await sindicato
    .from("oportunidades")
    .update({ status: "validada" })
    .eq("id", id)
    .select("id");
  expect(updateError).toBeNull();
  expect(updateRows).toEqual([]);

  const { error: insertError } = await sindicato.from("oportunidades").insert({
    dossie_cadastral_id: FIXTURE.dossieId,
    tenant_candidato_id: FIXTURE.tenantId,
    score: 1,
    prioridade: "baixa",
    confianca: "baixa",
  });
  expect(insertError).not.toBeNull();
});

test("STG10-EVAL-007: revisão humana preserva fatores originais e registra contexto auditável", async ({ page }) => {
  const admin = adminClient();
  await evaluateOpportunity(page);

  await page.getByRole("button", { name: "Colocar em análise" }).click();
  await expect(page.getByText("Colocada em análise.")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Validar" }).click();
  await page.getByLabel("Justificativa *").fill("Revisão humana aprovada para acompanhamento comercial.");
  await page.getByRole("button", { name: "Confirmar" }).click();

  const id = await oportunidadeId(admin);
  await expect
    .poll(async () => {
      const { data } = await admin
        .from("oportunidade_eventos")
        .select("id")
        .eq("oportunidade_id", id)
        .eq("tipo", "validada");
      return data?.length ?? 0;
    })
    .toBe(1);

  const [{ data: fatores }, { data: eventos }, { data: sideEffects }] = await Promise.all([
    admin.from("oportunidade_fatores").select("id").eq("oportunidade_id", id),
    admin
      .from("oportunidade_eventos")
      .select("tipo, actor_type, decision_nature, before_state, after_state")
      .eq("oportunidade_id", id)
      .order("created_at", { ascending: true }),
    admin.from("cobrancas").select("id").eq("obrigacao_id", FIXTURE.obrigacaoId),
  ]);

  expect(fatores).toHaveLength(7);
  expect(sideEffects).toEqual([]);
  expect(eventos?.map((e) => e.tipo)).toEqual(["avaliacao", "em_analise", "validada"]);
  expect(eventos?.[0].actor_type).toBe("system");
  expect(eventos?.[0].decision_nature).toBe("inference");
  expect(eventos?.[1].decision_nature).toBe("human_review");
  expect(eventos?.[2].decision_nature).toBe("human_review");
  expect(eventos?.[2].before_state).toEqual({ status: "em_analise" });
  expect(eventos?.[2].after_state).toEqual({
    status: "validada",
    motivo: "Revisão humana aprovada para acompanhamento comercial.",
  });
});
