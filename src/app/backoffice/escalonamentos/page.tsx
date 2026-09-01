import { ListTodo, ShieldAlert, Clock } from "lucide-react";
import { MetricCard } from "@/components/design-system/metric-card";
import { PageHeader } from "@/components/design-system/page-header";
import { isEscalationApprover } from "@/lib/auth/permissions";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { EscalonamentosTable } from "./escalonamentos-table";

export default async function EscalonamentosPage() {
  const user = await requireCurrentUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("escalonamentos")
    .select("*, empresas(razao_social, nome_fantasia), tenants(name)")
    .order("iniciado_em", { ascending: false });

  const escalonamentos = data ?? [];
  const aguardandoAprovacao = escalonamentos.filter((e) => e.status === "aguardando_aprovacao");
  const enviadas = escalonamentos.filter((e) => e.status === "enviada" || e.status === "concluida");
  const meuPapelAprova = isEscalationApprover(user);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Escalonamentos"
        description="Notificação extrajudicial de cobranças que esgotaram a régua automática. Aprovação exclusiva do papel Jurídico antes de qualquer documento sair."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Total" value={String(escalonamentos.length)} icon={ListTodo} />
        <MetricCard
          label={meuPapelAprova ? "Aguardando sua aprovação" : "Aguardando aprovação do Jurídico"}
          value={String(aguardandoAprovacao.length)}
          icon={ShieldAlert}
          tone={aguardandoAprovacao.length > 0 ? "warning" : "default"}
        />
        <MetricCard label="Notificações enviadas" value={String(enviadas.length)} icon={Clock} />
      </div>

      <EscalonamentosTable data={escalonamentos} showTenantColumn={user.isPlatformStaff} />
    </div>
  );
}
