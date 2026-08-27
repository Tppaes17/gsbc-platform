"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { portalLoginSchema } from "@/lib/validation/portal";

export interface PortalLoginState {
  message: string | null;
}

const GENERIC_MESSAGE =
  "Se este e-mail tiver acesso ao portal, enviamos um link de acesso — confira sua caixa de entrada.";

/**
 * Sempre retorna a mesma mensagem genérica, exista ou não o e-mail como
 * contato com acesso ao portal — evita que a resposta do formulário sirva
 * pra enumerar quais empresas/e-mails têm acesso (regra de segurança
 * explícita do roadmap do STG-05: "testar enumeração de IDs").
 */
export async function requestPortalLoginAction(
  _prevState: PortalLoginState,
  formData: FormData,
): Promise<PortalLoginState> {
  const parsed = portalLoginSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? "E-mail inválido." };
  }

  const email = parsed.data.email;
  const admin = createAdminClient();

  const { data: contato } = await admin
    .from("empresa_contatos")
    .select("id")
    .eq("email", email)
    .in("portal_access_status", ["invited", "active"])
    .maybeSingle();

  if (contato) {
    const supabase = await createClient();
    await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/portal`,
      },
    });
  }

  return { message: GENERIC_MESSAGE };
}

export async function portalLogoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/portal/login");
}
