import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/design-system/page-header";
import { EmptyState } from "@/components/design-system/empty-state";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { CobrancaForm } from "./cobranca-form";

export default async function NovaCobrancaPage({
  searchParams,
}: {
  searchParams: Promise<{ obrigacaoId?: string }>;
}) {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    redirect("/backoffice/cobrancas");
  }

  const { obrigacaoId } = await searchParams;
  const supabase = await createClient();

  if (!obrigacaoId) {
    const { data: obrigacoes } = await supabase
      .from("obrigacoes")
      .select(
        "id, descricao, valor_referencia, empresas(razao_social, nome_fantasia), cobrancas(id)",
      )
      .order("created_at", { ascending: false });

    const semCobranca = (obrigacoes ?? []).filter((o) => {
      const cobranca = Array.isArray(o.cobrancas) ? o.cobrancas[0] : o.cobrancas;
      return !cobranca;
    });

    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Gerar cobrança"
          description="Selecione a obrigação que deu origem à cobrança."
        />
        {semCobranca.length === 0 ? (
          <EmptyState
            title="Nenhuma obrigação disponível"
            description="Todas as obrigações já têm uma cobrança, ou nenhuma obrigação foi cadastrada ainda."
          />
        ) : (
          <ul className="flex max-w-xl flex-col divide-y rounded-lg border">
            {semCobranca.map((o) => {
              const empresa = Array.isArray(o.empresas)
                ? o.empresas[0]
                : o.empresas;
              return (
                <li key={o.id}>
                  <Link
                    href={`/backoffice/cobrancas/novo?obrigacaoId=${o.id}`}
                    className="flex flex-col gap-0.5 p-3 text-sm hover:bg-muted"
                  >
                    <span className="font-medium">{o.descricao}</span>
                    <span className="text-muted-foreground">
                      {empresa?.nome_fantasia ?? empresa?.razao_social ?? "—"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  const { data: obrigacao } = await supabase
    .from("obrigacoes")
    .select(
      "id, descricao, valor_referencia, vencimento, empresas(razao_social, nome_fantasia)",
    )
    .eq("id", obrigacaoId)
    .single();

  if (!obrigacao) {
    redirect("/backoffice/cobrancas/novo");
  }

  const empresa = Array.isArray(obrigacao.empresas)
    ? obrigacao.empresas[0]
    : obrigacao.empresas;

  const { data: gsbcMembers } = await supabase
    .from("memberships")
    .select("user_id, users!memberships_user_id_fkey(full_name), tenants!inner(type)")
    .eq("tenants.type", "platform")
    .eq("status", "active");

  const responsaveis = (gsbcMembers ?? []).map((m) => {
    const u = Array.isArray(m.users) ? m.users[0] : m.users;
    return { id: m.user_id, nome: u?.full_name ?? "—" };
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Gerar cobrança"
        description={`${obrigacao.descricao} · ${empresa?.nome_fantasia ?? empresa?.razao_social ?? "—"}`}
      />
      <CobrancaForm
        obrigacaoId={obrigacao.id}
        valorSugerido={
          obrigacao.valor_referencia ? String(obrigacao.valor_referencia) : ""
        }
        vencimentoSugerido={obrigacao.vencimento ?? ""}
        responsaveis={responsaveis}
      />
    </div>
  );
}
