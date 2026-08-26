import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.types";
import { supabaseEnv } from "./env";

/**
 * Cliente Supabase para uso em Server Components, Server Actions e Route Handlers.
 * `setAll` falha silenciosamente quando chamado a partir de um Server Component puro
 * (sem permissão de escrita em cookies) — nesses casos a sessão é refrescada pelo proxy.ts.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseEnv.url, supabaseEnv.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Chamado a partir de um Server Component sem acesso de escrita — ignorado
          // porque o proxy.ts já cuida de refrescar a sessão a cada requisição.
        }
      },
    },
  });
}
