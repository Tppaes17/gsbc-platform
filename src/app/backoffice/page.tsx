import {
  Building,
  Building2,
  CircleDollarSign,
  FileText,
  Handshake,
  Receipt,
  ScrollText,
  Users,
} from "lucide-react";
import { MetricCard } from "@/components/design-system/metric-card";
import { PageHeader } from "@/components/design-system/page-header";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const COBRANCA_STATUS_ENCERRADO = ["paid", "cancelled", "closed"];

export default async function BackofficeDashboardPage() {
  const user = await requireCurrentUser();
  const supabase = await createClient();

  const [
    sindicatosCount,
    empresasCount,
    instrumentosCount,
    cobrancasAbertas,
    negociacoesAbertas,
    pagamentos,
    usersCount,
    membershipsCount,
  ] = await Promise.all([
    supabase.from("sindicatos").select("id", { count: "exact", head: true }),
    supabase.from("empresas").select("id", { count: "exact", head: true }),
    supabase
      .from("instrumentos")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("cobrancas")
      .select("valor_cobranca")
      .not("status", "in", `(${COBRANCA_STATUS_ENCERRADO.join(",")})`),
    supabase
      .from("negociacoes")
      .select("id", { count: "exact", head: true })
      .in("status", ["aberta", "em_negociacao"]),
    supabase.from("pagamentos").select("valor"),
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
  ]);

  const valorEmCobranca = (cobrancasAbertas.data ?? []).reduce(
    (sum, c) => sum + c.valor_cobranca,
    0,
  );
  const totalPago = (pagamentos.data ?? []).reduce((sum, p) => sum + p.valor, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Olá, ${user.fullName.split(" ")[0]}`}
        description={
          user.isPlatformStaff
            ? "Visão geral da operação GSBC."
            : `Visão geral — ${user.memberships[0]?.tenantName}.`
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label={user.isPlatformStaff ? "Sindicatos ativos" : "Meu sindicato"}
          value={String(sindicatosCount.count ?? 0)}
          icon={Building2}
        />
        <MetricCard
          label="Empresas cadastradas"
          value={String(empresasCount.count ?? 0)}
          icon={Building}
          hint="Escopo aplicado por RLS por tenant."
        />
        <MetricCard
          label="Instrumentos vigentes"
          value={String(instrumentosCount.count ?? 0)}
          icon={FileText}
          hint="Escopo aplicado por RLS por tenant."
        />
        <MetricCard
          label="Valor em cobrança"
          value={valorEmCobranca.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
          icon={Receipt}
          hint={`${cobrancasAbertas.data?.length ?? 0} cobrança(s) em aberto.`}
        />
        <MetricCard
          label="Negociações em andamento"
          value={String(negociacoesAbertas.count ?? 0)}
          icon={Handshake}
        />
        <MetricCard
          label="Total pago"
          value={totalPago.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
          icon={CircleDollarSign}
        />
        <MetricCard
          label="Usuários visíveis"
          value={String(usersCount.count ?? 0)}
          icon={Users}
          hint="Escopo aplicado por RLS por tenant."
        />
        <MetricCard
          label="Memberships ativas"
          value={String(membershipsCount.count ?? 0)}
          icon={ScrollText}
        />
      </div>

      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        O módulo de Documentos chega em uma próxima rodada. Esta tela mostra
        apenas dados reais do que já foi implementado — sem métricas
        fictícias.
      </div>
    </div>
  );
}
