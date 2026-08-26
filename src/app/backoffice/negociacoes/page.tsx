import { PageHeader } from "@/components/design-system/page-header";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { NegociacoesTable } from "./negociacoes-table";

export default async function NegociacoesPage() {
  const user = await requireCurrentUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("negociacoes")
    .select(
      "*, empresas(razao_social, nome_fantasia), tenants(name), cobrancas(valor_cobranca, obrigacoes(descricao))",
    )
    .order("updated_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Negociações"
        description="Propostas, contrapropostas e desfecho das cobranças em negociação. Negociações nascem a partir de uma cobrança — veja a página da cobrança."
      />
      <NegociacoesTable data={data ?? []} showTenantColumn={user.isPlatformStaff} />
    </div>
  );
}
