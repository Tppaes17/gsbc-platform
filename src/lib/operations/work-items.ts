import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type Client = SupabaseClient<Database>;
type WorkItemRow = Database["public"]["Tables"]["work_items"]["Row"];

export interface WorkItemInput {
  tenantId: string;
  tipo: WorkItemRow["tipo"];
  entityType: WorkItemRow["entity_type"];
  entityId: string;
  titulo: string;
  descricao?: string | null;
  prioridade?: WorkItemRow["prioridade"];
  dueAt?: string | null;
  motivo?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Idempotente: nunca duplica um item já aberto pra mesma combinação
 * tipo+entidade (índice único parcial em `work_items`, ver migration
 * 0021) — chamado tanto no caminho event-driven (engine.ts, no momento
 * em que o evento acontece) quanto no state-derived (sync.ts, a cada
 * varredura periódica).
 */
export async function criarWorkItemSeNaoExiste(supabase: Client, input: WorkItemInput) {
  const { data: existente } = await supabase
    .from("work_items")
    .select("id")
    .eq("tipo", input.tipo)
    .eq("entity_type", input.entityType)
    .eq("entity_id", input.entityId)
    .in("status", ["aberto", "adiado"])
    .maybeSingle();

  if (existente) return;

  await supabase.from("work_items").insert({
    tenant_id: input.tenantId,
    tipo: input.tipo,
    entity_type: input.entityType,
    entity_id: input.entityId,
    titulo: input.titulo,
    descricao: input.descricao ?? null,
    prioridade: input.prioridade ?? "medium",
    due_at: input.dueAt ?? null,
    motivo: input.motivo ?? null,
    metadata: input.metadata ?? null,
  });
}
