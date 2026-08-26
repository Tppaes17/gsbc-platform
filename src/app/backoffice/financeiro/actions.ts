"use server";

import { revalidatePath } from "next/cache";
import { logAuditEvent } from "@/lib/audit/log";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { parseCurrency, registerPagamentoSchema } from "@/lib/validation/pagamento";

export interface RegisterPagamentoState {
  error: string | null;
  success: boolean;
}

export async function registerPagamentoAction(
  _prevState: RegisterPagamentoState,
  formData: FormData,
): Promise<RegisterPagamentoState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return {
      error: "Apenas a equipe GSBC pode registrar pagamentos.",
      success: false,
    };
  }

  const parsed = registerPagamentoSchema.safeParse({
    cobrancaId: formData.get("cobrancaId"),
    valor: formData.get("valor"),
    dataPagamento: formData.get("dataPagamento"),
    formaPagamento: formData.get("formaPagamento"),
    observacao: formData.get("observacao") || undefined,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      success: false,
    };
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { data: cobranca } = await supabase
    .from("cobrancas")
    .select("tenant_id, empresa_id")
    .eq("id", input.cobrancaId)
    .single();

  if (!cobranca) {
    return { error: "Cobrança não encontrada.", success: false };
  }

  const { error } = await supabase.rpc("register_pagamento", {
    p_cobranca_id: input.cobrancaId,
    p_valor: parseCurrency(input.valor),
    p_data_pagamento: input.dataPagamento,
    p_forma_pagamento: input.formaPagamento,
    p_observacao: input.observacao || null,
  });

  if (error) {
    return { error: "Não foi possível registrar o pagamento.", success: false };
  }

  await logAuditEvent({
    tenantId: cobranca.tenant_id,
    action: "pagamento.registrado",
    entityType: "cobranca",
    entityId: input.cobrancaId,
    newData: { valor: input.valor, forma_pagamento: input.formaPagamento },
  });

  revalidatePath(`/backoffice/cobrancas/${input.cobrancaId}`);
  revalidatePath("/backoffice/financeiro");
  revalidatePath(`/backoffice/empresas/${cobranca.empresa_id}`);
  return { error: null, success: true };
}
