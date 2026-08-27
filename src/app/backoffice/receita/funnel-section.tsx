import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ConversionResult, FunnelResult, FunnelStage } from "@/lib/revenue/funnel";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPercent(value: number | null) {
  if (value === null) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

// Mesmo corte de rank de src/lib/revenue/funnel.ts, em status atuais —
// serve pro link de drill-down. Pode divergir um pouco do número
// cumulativo do funil (que usa o maior rank já alcançado na história,
// via cobranca_eventos): uma cobrança cancelada depois de negociar
// ainda conta em "Negociado" no funil, mas não aparece aqui (status
// atual já não é mais um dos listados) — limitação conhecida, documentada
// no rodada doc.
const STAGE_STATUS_FILTER: Partial<Record<FunnelStage, string>> = {
  validado: "approved,notified,contacted,negotiating,agreement_reached,partially_paid,paid,overdue,suspended,cancelled,legal_escalation,closed,contestada",
  cobrado: "notified,contacted,overdue,suspended,contestada,negotiating,agreement_reached,legal_escalation,partially_paid,paid",
  negociado: "negotiating,agreement_reached,legal_escalation,partially_paid,paid",
  recebido: "partially_paid,paid",
};

export function FunnelSection({
  funnel,
  conversoes,
}: {
  funnel: FunnelResult[];
  conversoes: ConversionResult[];
}) {
  const maiorValor = Math.max(...funnel.map((f) => f.valor), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Funil de receita</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          {funnel.map((estagio, index) => {
            const largura = Math.max((estagio.valor / maiorValor) * 100, estagio.valor > 0 ? 4 : 0);
            const statusFilter = STAGE_STATUS_FILTER[estagio.stage];
            const conteudo = (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{estagio.label}</span>
                  <span className="text-muted-foreground">
                    {formatCurrency(estagio.valor)} ·{" "}
                    {estagio.stage === "identificado"
                      ? `${estagio.count} obrigação(ões)`
                      : `${estagio.count} cobrança(s)`}
                  </span>
                </div>
                <div className="h-6 w-full overflow-hidden rounded bg-muted">
                  <div
                    className="h-full rounded bg-primary transition-all"
                    style={{ width: `${largura}%` }}
                  />
                </div>
              </div>
            );

            return (
              <div key={estagio.stage}>
                {statusFilter ? (
                  <Link
                    href={`/backoffice/cobrancas?status=${statusFilter}`}
                    className="block rounded transition-opacity hover:opacity-80"
                  >
                    {conteudo}
                  </Link>
                ) : (
                  conteudo
                )}
                {index < conversoes.length ? (
                  <p className="ml-2 mt-1 text-xs text-muted-foreground">
                    ↓ conversão pra {conversoes[index].toLabel.toLowerCase()}:{" "}
                    <span className="font-medium">{formatPercent(conversoes[index].rate)}</span>
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Cada estágio conta cobranças que já chegaram ao menos até ali em algum momento
          (via histórico de status) — mesmo que tenham sido canceladas depois.
        </p>
      </CardContent>
    </Card>
  );
}
