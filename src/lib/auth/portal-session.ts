import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { CurrentPortalContato } from "@/types/domain";

/**
 * Sessão do Portal de Regularização Empresarial (STG-05) — contexto de
 * autorização totalmente separado de getCurrentUser()/requireCurrentUser()
 * (staff GSBC/sindicato). Um contato de empresa nunca tem membership, só
 * um vínculo 1:1 em empresa_contatos.user_id com portal_access_status
 * = 'active'. Cacheado por requisição, mesmo padrão de session.ts.
 */
export const getCurrentPortalContato = cache(
  async (): Promise<CurrentPortalContato | null> => {
    const supabase = await createClient();

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) return null;

    const { data: contato } = await supabase
      .from("empresa_contatos")
      .select("id, nome, email, empresa_id, empresas(razao_social, tenant_id)")
      .eq("user_id", authUser.id)
      .eq("portal_access_status", "active")
      .maybeSingle();

    if (!contato) return null;

    const empresa = Array.isArray(contato.empresas) ? contato.empresas[0] : contato.empresas;
    if (!empresa) return null;

    return {
      contatoId: contato.id,
      userId: authUser.id,
      nome: contato.nome,
      email: contato.email ?? authUser.email ?? "",
      empresaId: contato.empresa_id,
      empresaNome: empresa.razao_social,
      tenantId: empresa.tenant_id,
    };
  },
);

export async function requireCurrentPortalContato(): Promise<CurrentPortalContato> {
  const contato = await getCurrentPortalContato();
  if (!contato) {
    throw new Error("Não autenticado no portal.");
  }
  return contato;
}
