import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/design-system/empty-state";
import { CircleDollarSign } from "lucide-react";
import { formaPagamentoOptions } from "@/lib/validation/pagamento";

interface PagamentoItem {
  id: string;
  valor: number;
  data_pagamento: string;
  forma_pagamento: string;
  observacao: string | null;
  registradoPorNome: string | null;
}

const FORMA_LABEL = Object.fromEntries(
  formaPagamentoOptions.map((o) => [o.value, o.label]),
);

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

export function PagamentosList({
  pagamentos,
  valorReferencia,
}: {
  pagamentos: PagamentoItem[];
  /** Valor a quitar — o negociado (se houver acordo aceito) ou o original. */
  valorReferencia: number;
}) {
  const totalPago = pagamentos.reduce((sum, p) => sum + p.valor, 0);
  const saldo = Math.max(valorReferencia - totalPago, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Pagamentos</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-6 text-sm">
          <span className="text-muted-foreground">
            Total pago:{" "}
            <span className="font-medium text-foreground">
              {formatCurrency(totalPago)}
            </span>
          </span>
          <span className="text-muted-foreground">
            Saldo devedor:{" "}
            <span className="font-medium text-foreground">
              {formatCurrency(saldo)}
            </span>
          </span>
        </div>

        {pagamentos.length === 0 ? (
          <EmptyState
            icon={CircleDollarSign}
            title="Nenhum pagamento registrado"
            description="Pagamentos registrados aqui atualizam o status da cobrança automaticamente."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {pagamentos.map((pagamento) => (
              <li
                key={pagamento.id}
                className="flex flex-col gap-1 border-b pb-3 text-sm last:border-b-0 last:pb-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{formatCurrency(pagamento.valor)}</span>
                  <span className="text-muted-foreground">
                    {formatDate(pagamento.data_pagamento)}
                  </span>
                </div>
                <span className="text-muted-foreground">
                  {FORMA_LABEL[pagamento.forma_pagamento] ?? pagamento.forma_pagamento}
                  {pagamento.observacao ? ` · ${pagamento.observacao}` : ""}
                  {pagamento.registradoPorNome
                    ? ` · registrado por ${pagamento.registradoPorNome}`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
