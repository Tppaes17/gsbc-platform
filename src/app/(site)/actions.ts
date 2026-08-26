"use server";

import { createClient } from "@/lib/supabase/server";
import { siteLeadSchema } from "@/lib/validation/site-lead";

export interface SiteLeadActionState {
  status: "idle" | "success" | "error";
  message: string | null;
}

export async function submitSiteLeadAction(
  _prevState: SiteLeadActionState,
  formData: FormData,
): Promise<SiteLeadActionState> {
  const parsed = siteLeadSchema.safeParse({
    origem: formData.get("origem"),
    nome: formData.get("nome"),
    sindicatoNome: formData.get("sindicatoNome") || undefined,
    cargo: formData.get("cargo") || undefined,
    email: formData.get("email"),
    telefone: formData.get("telefone") || undefined,
    mensagem: formData.get("mensagem") || undefined,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("site_leads").insert({
    origem: parsed.data.origem,
    nome: parsed.data.nome,
    sindicato_nome: parsed.data.sindicatoNome || null,
    cargo: parsed.data.cargo || null,
    email: parsed.data.email,
    telefone: parsed.data.telefone || null,
    mensagem: parsed.data.mensagem || null,
  });

  if (error) {
    return {
      status: "error",
      message: "Não foi possível enviar agora. Tente novamente em instantes.",
    };
  }

  return {
    status: "success",
    message: "Recebemos seu pedido. A equipe GSBC entrará em contato em breve.",
  };
}
