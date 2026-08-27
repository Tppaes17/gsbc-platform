"use server";

import { revalidatePath } from "next/cache";
import { logAuditEvent } from "@/lib/audit/log";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export interface WorkItemActionState {
  error: string | null;
}

type WorkItemUpdate = Database["public"]["Tables"]["work_items"]["Update"];

const DIAS_ADIAR = 3;

async function atualizarWorkItem(
  workItemId: string,
  update: WorkItemUpdate,
  action: string,
): Promise<WorkItemActionState> {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    return { error: "Apenas a equipe GSBC pode gerenciar a fila operacional." };
  }

  const supabase = await createClient();

  const { data: item } = await supabase
    .from("work_items")
    .select("tenant_id")
    .eq("id", workItemId)
    .single();

  const { error } = await supabase.from("work_items").update(update).eq("id", workItemId);

  if (error) {
    return { error: "Não foi possível atualizar o item." };
  }

  await logAuditEvent({
    tenantId: item?.tenant_id ?? null,
    action,
    entityType: "work_item",
    entityId: workItemId,
    newData: update,
  });

  revalidatePath("/backoffice/operacoes");
  return { error: null };
}

export async function concluirWorkItemAction(workItemId: string): Promise<WorkItemActionState> {
  const user = await requireCurrentUser();
  return atualizarWorkItem(
    workItemId,
    { status: "concluido", resolved_at: new Date().toISOString(), resolved_by: user.id },
    "work_item.concluido",
  );
}

export async function adiarWorkItemAction(workItemId: string): Promise<WorkItemActionState> {
  const novaData = new Date(Date.now() + DIAS_ADIAR * 24 * 60 * 60 * 1000);
  return atualizarWorkItem(
    workItemId,
    { status: "adiado", due_at: novaData.toISOString() },
    "work_item.adiado",
  );
}

export async function atribuirWorkItemAction(
  workItemId: string,
  assignedTo: string | null,
): Promise<WorkItemActionState> {
  return atualizarWorkItem(workItemId, { assigned_to: assignedTo }, "work_item.atribuido");
}
