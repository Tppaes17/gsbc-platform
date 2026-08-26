import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";
import { supabaseEnv } from "./env";

/**
 * Refresca a sessão Supabase a cada requisição e protege rotas autenticadas.
 * Chamada a partir de proxy.ts (Next.js 16 renomeou middleware.ts -> proxy.ts).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    supabaseEnv.url,
    supabaseEnv.anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Rodada 1: um único shell autenticado em /backoffice serve tanto staff GSBC
  // quanto usuários de sindicato, com o menu filtrado por papel (ver
  // src/app/backoffice/layout.tsx). O Portal do Sindicato como ambiente visual
  // separado (regra 35) é planejado para a Rodada 8.
  if (!user && pathname.startsWith("/backoffice")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/backoffice", request.url));
  }

  return response;
}
