import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Resumo financeiro somente leitura na ficha 360º — o registro de
 * pagamentos acontece na página da cobrança (/backoffice/financeiro tem a
 * visão consolidada entre empresas).
 */
export function EmpresaFinanceiroSummary({
  totalCobrado,
  totalPago,
  saldoEmAberto,
  vencidasCount,
}: {
  totalCobrado: number;
  totalPago: number;
  /** Contra o valor de referência (negociado, quando houver acordo aceito — ver Rodada 13), não o total cobrado. */
  saldoEmAberto: number;
  vencidasCount: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Financeiro</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Total cobrado</span>
            <span className="text-lg font-semibold">{formatCurrency(totalCobrado)}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Total pago</span>
            <span className="text-lg font-semibold">{formatCurrency(totalPago)}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Saldo em aberto</span>
            <span className="text-lg font-semibold">{formatCurrency(saldoEmAberto)}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Cobranças vencidas</span>
            <span
              className={
                vencidasCount > 0
                  ? "text-lg font-semibold text-destructive"
                  : "text-lg font-semibold"
              }
            >
              {vencidasCount}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
