import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Único caminho pra registrar uma decisão de política a partir de código
 * TypeScript (cron/sweeps) — o lado SQL (register_negociacao_evento,
 * register_pagamento, abrir_contestacao) já grava direto em
 * policy_decisoes dentro da própria transação. Não falha silenciosamente
 * nem derruba o chamador: telemetria nunca deve quebrar a operação real.
 */
export async function registrarDecisaoPolicy(
  supabase: SupabaseClient<Database>,
  input: {
    policyId: string;
    tenantId: string | null;
    entityType: string;
    entityId: string;
    inputs: Record<string, unknown>;
    resultado: string;
    motivo: string;
  },
) {
  const { data: policy } = await supabase
    .from("policies")
    .select("versao")
    .eq("id", input.policyId)
    .maybeSingle();

  if (!policy) return;

  await supabase.from("policy_decisoes").insert({
    policy_id: input.policyId,
    policy_versao: policy.versao,
    tenant_id: input.tenantId,
    entity_type: input.entityType,
    entity_id: input.entityId,
    inputs: input.inputs,
    resultado: input.resultado,
    motivo: input.motivo,
  });
}
