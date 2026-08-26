import { notFound } from "next/navigation";
import { PageHeader } from "@/components/design-system/page-header";
import { StatusBadge } from "@/components/design-system/status-badge";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ClausulasSection } from "./clausulas-section";
import { EditInstrumentoForm } from "./edit-instrumento-form";
import { ObrigacoesSection } from "./obrigacoes-section";

const STATUS_CONFIG: Record<string, { label: string; tone: "positive" | "neutral" | "warning" | "negative" }> = {
  draft: { label: "Rascunho", tone: "neutral" },
  active: { label: "Vigente", tone: "positive" },
  expired: { label: "Expirado", tone: "warning" },
  revoked: { label: "Revogado", tone: "negative" },
};

export default async function InstrumentoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireCurrentUser();
  const supabase = await createClient();

  const { data: instrumento } = await supabase
    .from("instrumentos")
    .select("*, tenants(name)")
    .eq("id", id)
    .single();

  if (!instrumento) {
    notFound();
  }

  const [{ data: empresas }, { data: clausulas }, { data: obrigacoesRaw }] =
    await Promise.all([
      supabase
        .from("empresas")
        .select("id, razao_social, nome_fantasia")
        .eq("tenant_id", instrumento.tenant_id)
        .order("razao_social"),
      supabase
        .from("clausulas")
        .select("id, numero, titulo, texto")
        .eq("instrumento_id", id)
        .order("created_at"),
      supabase
        .from("obrigacoes")
        .select(
          "id, descricao, periodicidade, vencimento, valor_referencia, status, empresas(razao_social, nome_fantasia), clausulas(titulo), cobrancas(id)",
        )
        .eq("instrumento_id", id)
        .order("created_at", { ascending: false }),
    ]);

  const empresaOptions = (empresas ?? []).map((e) => ({
    id: e.id,
    nome: e.nome_fantasia ?? e.razao_social,
  }));

  const clausulaOptions = (clausulas ?? []).map((c) => ({
    id: c.id,
    nome: c.numero ? `${c.numero} — ${c.titulo}` : c.titulo,
  }));

  const obrigacoes = (obrigacoesRaw ?? []).map((o) => {
    const empresa = Array.isArray(o.empresas) ? o.empresas[0] : o.empresas;
    const clausula = Array.isArray(o.clausulas) ? o.clausulas[0] : o.clausulas;
    const cobranca = Array.isArray(o.cobrancas) ? o.cobrancas[0] : o.cobrancas;
    return {
      id: o.id,
      descricao: o.descricao,
      periodicidade: o.periodicidade,
      vencimento: o.vencimento,
      valor_referencia: o.valor_referencia,
      status: o.status,
      empresaNome: empresa?.nome_fantasia ?? empresa?.razao_social ?? "—",
      clausulaTitulo: clausula?.titulo ?? null,
      cobrancaId: cobranca?.id ?? null,
    };
  });

  const statusConfig = STATUS_CONFIG[instrumento.status] ?? {
    label: instrumento.status,
    tone: "neutral" as const,
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={instrumento.titulo}
        description={`${instrumento.numero ?? "sem número"} · ${instrumento.tenants?.name ?? "—"}`}
      />

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Status:</span>
        <StatusBadge label={statusConfig.label} tone={statusConfig.tone} />
      </div>

      <EditInstrumentoForm
        instrumento={instrumento}
        empresas={empresaOptions}
        readOnly={!user.isPlatformStaff}
      />

      <ClausulasSection
        instrumentoId={instrumento.id}
        clausulas={clausulas ?? []}
        canManage={user.isPlatformStaff}
      />

      <ObrigacoesSection
        instrumentoId={instrumento.id}
        instrumentoEmpresaId={instrumento.empresa_id}
        empresas={empresaOptions}
        clausulas={clausulaOptions}
        obrigacoes={obrigacoes}
        canManage={user.isPlatformStaff}
      />
    </div>
  );
}
