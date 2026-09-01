import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/design-system/empty-state";
import { StatusBadge } from "@/components/design-system/status-badge";
import { CircleDollarSign } from "lucide-react";
import { formaPagamentoOptions } from "@/lib/validation/pagamento";

interface PagamentoItem {
  id: string;
  valor: number;
  data_pagamento: string;
  forma_pagamento: string;
  observacao: string | null;
  registradoPorNome: string | null;
  conciliacao?: {
    status: string;
    valorBruto: number;
    taxas: number;
    valorLiquido: number;
    repasses: { amount: number; status: string }[];
  } | null;
}

const FORMA_LABEL = Object.fromEntries(
  formaPagamentoOptions.map((o) => [o.value, o.label]),
);

const CONCILIACAO_LABEL: Record<string, string> = {
  pending: "Pendente",
  provider_reported: "Pagamento reportado externamente",
  reconciling: "Conciliando",
  partial: "Parcial",
  mismatch: "Divergência",
  manual_review: "Revisão manual",
  reconciled: "Conciliado",
  unidentified: "Não identificado",
  reversed: "Estornado",
  chargeback: "Chargeback",
  failed_review_required: "Falha em revisão",
};

const CONCILIACAO_TONE: Record<string, "neutral" | "info" | "positive" | "warning" | "negative"> = {
  pending: "neutral",
  provider_reported: "info",
  reconciling: "info",
  partial: "warning",
  mismatch: "negative",
  manual_review: "warning",
  reconciled: "positive",
  unidentified: "warning",
  reversed: "negative",
  chargeback: "negative",
  failed_review_required: "negative",
};

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
                {pagamento.conciliacao ? (
                  <div className="mt-2 grid gap-2 rounded-md border bg-muted/30 p-3 sm:grid-cols-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Conciliação</p>
                      <StatusBadge
                        label={CONCILIACAO_LABEL[pagamento.conciliacao.status] ?? pagamento.conciliacao.status}
                        tone={CONCILIACAO_TONE[pagamento.conciliacao.status] ?? "neutral"}
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Valor bruto</p>
                      <p className="font-medium">{formatCurrency(pagamento.conciliacao.valorBruto)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Taxas</p>
                      <p className="font-medium">{formatCurrency(pagamento.conciliacao.taxas)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Líquido / repasse</p>
                      <p className="font-medium">{formatCurrency(pagamento.conciliacao.valorLiquido)}</p>
                      <p className="text-xs text-muted-foreground">
                        {pagamento.conciliacao.repasses.length === 0
                          ? "Sem repasse calculado"
                          : `${pagamento.conciliacao.repasses.length} repasse(s) pendente(s)`}
                      </p>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
