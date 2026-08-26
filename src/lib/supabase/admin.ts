import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { supabaseEnv } from "./env";

/**
 * Cliente com service role — contorna RLS inteiramente.
 *
 * Uso EXCLUSIVO para operações administrativas privilegiadas que não têm
 * equivalente com o cliente autenticado normal (hoje: convidar usuário via
 * `auth.admin.inviteUserByEmail`). Nunca usar para ler/escrever tabelas de
 * negócio — essas operações devem passar pelo cliente autenticado
 * (`lib/supabase/server.ts`), que respeita RLS. Nunca importar este módulo
 * em código que possa rodar no cliente.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    supabaseEnv.url,
    supabaseEnv.serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
