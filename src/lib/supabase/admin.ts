import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { supabaseEnv } from "./env";

/**
 * Cliente com service role — contorna RLS inteiramente.
 *
 * Uso EXCLUSIVO para: (1) operações administrativas sem equivalente no
 * cliente autenticado (ex.: convidar usuário via
 * `auth.admin.inviteUserByEmail`); (2) jobs server-side sem sessão de
 * usuário, como o cron do motor de cobrança
 * (`src/lib/collection/engine.ts`, STG-02) — nesses casos não existe
 * `auth.uid()` pra RLS avaliar, então a autorização é "é o próprio job
 * do sistema rodando", não um usuário. Fora desses dois casos, toda
 * leitura/escrita de tabela de negócio deve passar pelo cliente
 * autenticado (`lib/supabase/server.ts`), que respeita RLS. Nunca
 * importar este módulo em código que possa rodar no cliente.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    supabaseEnv.url,
    supabaseEnv.serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
