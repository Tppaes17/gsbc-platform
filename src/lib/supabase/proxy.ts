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

  // Portal de Regularização Empresarial (STG-05) — shell separado do
  // backoffice, para o terceiro tipo de principal (contato de empresa,
  // sem membership). Gate aqui é só "está autenticado" — a checagem de
  // "é mesmo um contato de portal ativo" fica com
  // requireCurrentPortalContato() em cada página (mesma autoridade final:
  // RLS), evitando duplicar a consulta a empresa_contatos a cada request.
  if (!user && pathname.startsWith("/portal") && pathname !== "/portal/login") {
    const loginUrl = new URL("/portal/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Sem redirect automático de /portal/login pra /portal aqui: "está
  // autenticado" (único dado que o proxy tem sem consultar
  // empresa_contatos) não é o mesmo que "é um contato de portal" — um
  // staff/sindicato logado (sessão válida em /backoffice) também
  // passaria nesse teste, e ao cair em /portal seria imediatamente
  // rejeitado por requireCurrentPortalContato() e mandado de volta pra
  // /portal/login por getCurrentPortalContato() no layout — loop
  // infinito. A própria página de login trata sozinha o caso de alguém
  // já autenticado que reabre /portal/login.

  return response;
}
