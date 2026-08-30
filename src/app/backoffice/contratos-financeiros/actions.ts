"use server";

import { revalidatePath } from "next/cache";
import { logAuditEvent } from "@/lib/audit/log";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  createFinancialContractSchema,
  createFinancialSplitRuleSchema,
  parsePercent,
} from "@/lib/validation/financial-contract";
import { parseCurrency } from "@/lib/validation/pagamento";

export interface FinancialContractActionState {
  error: string | null;
  success: boolean;
}

const initialErrorState = { error: "Dados inválidos.", success: false };

export async function createFinancialContractAction(
  _prevState: FinancialContractActionState,
  formData: FormData,
): Promise<FinancialContractActionState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return { error: "Apenas a equipe GSBC pode validar contratos financeiros.", success: false };
  }

  const parsed = createFinancialContractSchema.safeParse({
    sindicatoId: formData.get("sindicatoId"),
    titulo: formData.get("titulo"),
    vigenciaInicio: formData.get("vigenciaInicio"),
    vigenciaFim: formData.get("vigenciaFim") || undefined,
    observacao: formData.get("observacao") || undefined,
  });

  if (!parsed.success) {
    return { ...initialErrorState, error: parsed.error.issues[0]?.message ?? initialErrorState.error };
  }

  const input = parsed.data;
  const supabase = await createClient();
  const { data: sindicato } = await supabase
    .from("sindicatos")
    .select("id, tenant_id, razao_social, nome_fantasia")
    .eq("id", input.sindicatoId)
    .single();

  if (!sindicato) {
    return { error: "Sindicato não encontrado.", success: false };
  }

  const now = new Date().toISOString();
  const { data: contract, error } = await supabase
    .from("financial_contracts")
    .insert({
      tenant_id: sindicato.tenant_id,
      sindicato_id: sindicato.id,
      titulo: input.titulo,
      status: "validated",
      vigencia_inicio: input.vigenciaInicio,
      vigencia_fim: input.vigenciaFim || null,
      termos_snapshot: {
        observacao: input.observacao || null,
        sindicato_nome: sindicato.nome_fantasia ?? sindicato.razao_social,
        validation_source: "staff_ui",
      },
      criado_por: user.id,
      validado_por: user.id,
      validado_em: now,
    })
    .select("id")
    .single();

  if (error || !contract) {
    return { error: "Não foi possível validar o contrato financeiro.", success: false };
  }

  await logAuditEvent({
    tenantId: sindicato.tenant_id,
    action: "financial_contract.validated",
    entityType: "financial_contract",
    entityId: contract.id,
    newData: {
      titulo: input.titulo,
      sindicato_id: sindicato.id,
      vigencia_inicio: input.vigenciaInicio,
      vigencia_fim: input.vigenciaFim || null,
    },
  });

  revalidatePath("/backoffice/contratos-financeiros");
  return { error: null, success: true };
}

export async function createFinancialSplitRuleAction(
  _prevState: FinancialContractActionState,
  formData: FormData,
): Promise<FinancialContractActionState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return { error: "Apenas a equipe GSBC pode versionar regras de split.", success: false };
  }

  const parsed = createFinancialSplitRuleSchema.safeParse({
    contractId: formData.get("contractId"),
    effectiveFrom: formData.get("effectiveFrom"),
    gsbcPercent: formData.get("gsbcPercent"),
    sindicatoPercent: formData.get("sindicatoPercent"),
    terceirosPercent: formData.get("terceirosPercent"),
    providerFeePercent: formData.get("providerFeePercent"),
    providerFeeFixed: formData.get("providerFeeFixed") || undefined,
    observacao: formData.get("observacao") || undefined,
  });

  if (!parsed.success) {
    return { ...initialErrorState, error: parsed.error.issues[0]?.message ?? initialErrorState.error };
  }

  const input = parsed.data;
  const supabase = await createClient();
  const { data: contract } = await supabase
    .from("financial_contracts")
    .select("id, tenant_id, titulo, status")
    .eq("id", input.contractId)
    .single();

  if (!contract) {
    return { error: "Contrato financeiro não encontrado.", success: false };
  }

  if (contract.status !== "validated") {
    return { error: "Regra ativa exige contrato financeiro validado.", success: false };
  }

  const { data: ruleId, error } = await supabase.rpc("create_financial_split_rule_version", {
    p_contract_id: input.contractId,
    p_effective_from: input.effectiveFrom,
    p_gsbc_percent: parsePercent(input.gsbcPercent),
    p_sindicato_percent: parsePercent(input.sindicatoPercent),
    p_terceiros_percent: parsePercent(input.terceirosPercent),
    p_provider_fee_percent: parsePercent(input.providerFeePercent),
    p_provider_fee_fixed: input.providerFeeFixed ? parseCurrency(input.providerFeeFixed) : 0,
    p_metadata: {
      observacao: input.observacao || null,
      source: "staff_ui",
    },
  });

  if (error || !ruleId) {
    return { error: error?.message ?? "Não foi possível criar a versão da regra de split.", success: false };
  }

  await logAuditEvent({
    tenantId: contract.tenant_id,
    action: "financial_split_rule.version_created",
    entityType: "financial_split_rule",
    entityId: ruleId,
    newData: {
      contract_id: input.contractId,
      contract_title: contract.titulo,
      effective_from: input.effectiveFrom,
      gsbc_percent: parsePercent(input.gsbcPercent),
      sindicato_percent: parsePercent(input.sindicatoPercent),
      terceiros_percent: parsePercent(input.terceirosPercent),
      provider_fee_percent: parsePercent(input.providerFeePercent),
      provider_fee_fixed: input.providerFeeFixed ? parseCurrency(input.providerFeeFixed) : 0,
    },
  });

  revalidatePath("/backoffice/contratos-financeiros");
  return { error: null, success: true };
}
