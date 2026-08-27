import { AlertCircle, Clock, ListTodo, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/design-system/page-header";
import { MetricCard } from "@/components/design-system/metric-card";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { contestacaoTipoOptions } from "@/lib/validation/contestacao";
import { ContestacoesTable } from "./contestacoes-table";

const TIPO_LABEL = Object.fromEntries(contestacaoTipoOptions.map((o) => [o.value, o.label]));

const STATUS_LABEL: Record<string, string> = {
  aberta: "Aberta",
  em_analise: "Em análise",
  procedente: "Procedente",
  parcialmente_procedente: "Parcialmente procedente",
  improcedente: "Improcedente",
  inconclusiva: "Inconclusiva",
};

const STATUS_ABERTOS = new Set(["aberta", "em_analise"]);
const STATUS_RESOLVIDOS = ["procedente", "parcialmente_procedente", "improcedente", "inconclusiva"];

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function ContestacoesPage() {
  const user = await requireCurrentUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("contestacoes")
    .select("*, empresas(razao_social, nome_fantasia), tenants(name)")
    .order("aberta_em", { ascending: false });

  const contestacoes = data ?? [];

  const emAberto = contestacoes.filter((c) => STATUS_ABERTOS.has(c.status));
  const resolvidas = contestacoes.filter((c) => c.resolvida_em);
  const valorContestado = contestacoes.reduce((acc, c) => acc + (c.valor_alegado ?? 0), 0);

  const tempoMedioDias =
    resolvidas.length > 0
      ? resolvidas.reduce((acc, c) => {
          const dias =
            (new Date(c.resolvida_em!).getTime() - new Date(c.aberta_em).getTime()) /
            (1000 * 60 * 60 * 24);
          return acc + dias;
        }, 0) / resolvidas.length
      : null;

  const causas = contestacoes.reduce<Record<string, number>>((acc, c) => {
    acc[c.tipo] = (acc[c.tipo] ?? 0) + 1;
    return acc;
  }, {});

  const resultados = resolvidas.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Contestações"
        description="Volume, causas e resultado das contestações abertas contra cobranças (STG-04). Uma contestação aberta pausa a cobrança automaticamente até ser resolvida."
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <MetricCard label="Volume total" value={String(contestacoes.length)} icon={ListTodo} />
        <MetricCard
          label="Em aberto"
          value={String(emAberto.length)}
          icon={AlertCircle}
          tone={emAberto.length > 0 ? "warning" : "default"}
        />
        <MetricCard
          label="Tempo médio de resolução"
          value={tempoMedioDias !== null ? `${tempoMedioDias.toFixed(1)} dias` : "—"}
          icon={Clock}
        />
        <MetricCard label="Valor contestado" value={formatCurrency(valorContestado)} icon={Wallet} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Causas</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(causas).length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados ainda.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {Object.entries(causas)
                  .sort((a, b) => b[1] - a[1])
                  .map(([tipo, count]) => (
                    <li key={tipo} className="flex items-center justify-between">
                      <span>{TIPO_LABEL[tipo] ?? tipo}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Resultado (resolvidas)</CardTitle>
          </CardHeader>
          <CardContent>
            {resolvidas.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma contestação resolvida ainda.
              </p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {STATUS_RESOLVIDOS.filter((s) => resultados[s]).map((status) => (
                  <li key={status} className="flex items-center justify-between">
                    <span>{STATUS_LABEL[status] ?? status}</span>
                    <span className="text-muted-foreground">{resultados[status]}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <ContestacoesTable data={contestacoes} showTenantColumn={user.isPlatformStaff} />
    </div>
  );
}
