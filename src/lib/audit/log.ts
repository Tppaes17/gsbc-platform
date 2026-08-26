import "server-only";
import { createClient } from "@/lib/supabase/server";

interface LogAuditEventInput {
  tenantId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Registra um evento de auditoria via a função Postgres `log_audit_event`
 * (security definer), único caminho de escrita permitido em audit_logs.
 * Chamar a partir de toda Server Action que crie, altere, aprove ou
 * cancele uma entidade sensível (regra 17).
 */
export async function logAuditEvent(input: LogAuditEventInput) {
  const supabase = await createClient();

  const { error } = await supabase.rpc("log_audit_event", {
    p_tenant_id: input.tenantId,
    p_action: input.action,
    p_entity_type: input.entityType,
    p_entity_id: input.entityId,
    p_old_data: input.oldData ?? null,
    p_new_data: input.newData ?? null,
    p_metadata: input.metadata ?? null,
  });

  if (error) {
    throw new Error(`Falha ao registrar auditoria: ${error.message}`);
  }
}
