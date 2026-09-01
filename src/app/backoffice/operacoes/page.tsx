import { redirect } from "next/navigation";
import { ListTodo } from "lucide-react";
import { PageHeader } from "@/components/design-system/page-header";
import { EmptyState } from "@/components/design-system/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { WorkItemRow } from "./work-item-row";

const PRIORIDADE_ORDEM: Record<string, number> = { high: 0, medium: 1, low: 2 };

export default async function OperacoesPage() {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    redirect("/backoffice");
  }

  const supabase = await createClient();

  const [{ data: abertos }, { data: concluidosHojeRaw }, { data: gsbcMembers }] = await Promise.all([
    supabase
      .from("work_items")
      .select("*")
      .in("status", ["aberto", "adiado"]),
    supabase
      .from("work_items")
      .select("id")
      .eq("status", "concluido")
      .gte("resolved_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    supabase
      .from("memberships")
      .select("user_id, users!memberships_user_id_fkey(full_name), tenants!inner(type)")
      .eq("tenants.type", "platform")
      .eq("status", "active"),
  ]);

  const responsaveis = (gsbcMembers ?? []).map((m) => {
    const u = Array.isArray(m.users) ? m.users[0] : m.users;
    return { id: m.user_id, nome: u?.full_name ?? "—" };
  });

  const itens = (abertos ?? []).sort((a, b) => {
    const p = (PRIORIDADE_ORDEM[a.prioridade] ?? 1) - (PRIORIDADE_ORDEM[b.prioridade] ?? 1);
    if (p !== 0) return p;
    if (!a.due_at) return 1;
    if (!b.due_at) return -1;
    return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
  });

  const agora = new Date().getTime();
  const vencidos = itens.filter((i) => i.due_at && new Date(i.due_at).getTime() < agora);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Central operacional"
        description="O que a equipe GSBC precisa fazer hoje — tarefas da régua de cobrança, falhas de automação, escalonamentos, pagamentos vencidos e negociações paradas."
      />

      <div className="grid gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-3">
        {[
          { label: "Fila total", value: itens.length, tone: "text-foreground" },
          {
            label: "Vencidos",
            value: vencidos.length,
            tone: vencidos.length > 0 ? "text-destructive" : "text-foreground",
          },
          { label: "Concluídos hoje", value: concluidosHojeRaw?.length ?? 0, tone: "text-emerald-700" },
        ].map((metric) => (
          <div key={metric.label} className="bg-card px-4 py-3">
            <p className="text-xs font-medium uppercase text-muted-foreground">{metric.label}</p>
            <p className={`mt-1 text-xl font-semibold tabular-nums ${metric.tone}`}>
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          {itens.length === 0 ? (
            <EmptyState
              icon={ListTodo}
              title="Fila vazia"
              description="Nenhuma ação pendente no momento. Novas tarefas aparecem quando a operação exigir intervenção humana."
              density="compact"
            />
          ) : (
            <div className="flex flex-col">
              {itens.map((item) => (
                <WorkItemRow key={item.id} item={item} responsaveis={responsaveis} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
