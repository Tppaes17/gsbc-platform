import { type NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Callback de confirmação de e-mail do Supabase Auth — compartilhado por
 * qualquer fluxo baseado em link por e-mail (convite de membership,
 * Rodada 2; magic link/convite do Portal de Regularização Empresarial,
 * STG-05). Troca o código/token pelo cookie de sessão de verdade; nunca
 * confiar em nada do lado do cliente pra isso.
 *
 * Dois formatos de callback coexistem dependendo do fluxo do GoTrue:
 * `code` (PKCE — o formato real observado em magic link/invite nesta
 * versão, verificado ao vivo) e `token_hash`+`type` (fluxo OTP mais
 * antigo/alternativo) — trata os dois em vez de assumir um só.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/portal";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  const failureTarget = next.startsWith("/portal") ? "/portal/login" : "/login";
  return NextResponse.redirect(
    `${origin}${failureTarget}?error=link_invalido`,
  );
}
