import { redirect } from "next/navigation";
import { PageHeader } from "@/components/design-system/page-header";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { DecisoesList } from "./decisoes-list";
import { PolicyCard } from "./policy-card";

export default async function PoliticasPage() {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    redirect("/backoffice");
  }

  const supabase = await createClient();

  const [{ data: policies }, { data: decisoesRaw }] = await Promise.all([
    supabase.from("policies").select("*").order("categoria").order("nome"),
    supabase
      .from("policy_decisoes")
      .select("id, entity_type, entity_id, resultado, motivo, created_at, policies(nome)")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const decisoes = (decisoesRaw ?? []).map((d) => {
    const policy = Array.isArray(d.policies) ? d.policies[0] : d.policies;
    return {
      id: d.id,
      policyNome: policy?.nome ?? "—",
      entityType: d.entity_type,
      entityId: d.entity_id,
      resultado: d.resultado,
      motivo: d.motivo,
      createdAt: d.created_at,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Políticas"
        description="Centraliza as regras de decisão/automação da plataforma (STG-11) — versionadas, auditáveis, ativáveis/desativáveis e explicáveis. Nenhuma linguagem de regra própria: a lógica de cada política vive em código, esta tela só documenta e registra."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {(policies ?? []).map((p) => (
          <PolicyCard
            key={p.id}
            id={p.id}
            nome={p.nome}
            descricao={p.descricao}
            categoria={p.categoria}
            enforcement={p.enforcement}
            versao={p.versao}
            ativa={p.ativa}
            parametros={p.parametros}
            canToggle={user.isOwner}
          />
        ))}
      </div>

      <DecisoesList decisoes={decisoes} />
    </div>
  );
}
