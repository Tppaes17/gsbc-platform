import Link from "next/link";
import { Handshake } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/design-system/empty-state";
import { StatusBadge } from "@/components/design-system/status-badge";
import { negociacaoStatusOptions } from "@/lib/validation/negociacao";

interface NegociacaoItem {
  id: string;
  status: string;
  valor_atual: number | null;
  obrigacaoDescricao: string;
}

const STATUS_LABEL = Object.fromEntries(
  negociacaoStatusOptions.map((o) => [o.value, o.label]),
);

const STATUS_TONE: Record<string, "positive" | "neutral" | "warning" | "negative" | "info"> = {
  aberta: "info",
  em_negociacao: "warning",
  aceita: "positive",
  recusada: "negative",
  encerrada: "neutral",
};

function formatCurrency(value: number | null) {
  if (value === null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Lista somente leitura das negociações desta empresa — registrar novos
 * movimentos acontece na própria página da negociação.
 */
export function EmpresaNegociacoesList({
  negociacoes,
}: {
  negociacoes: NegociacaoItem[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Negociações</CardTitle>
      </CardHeader>
      <CardContent>
        {negociacoes.length === 0 ? (
          <EmptyState
            icon={Handshake}
            title="Nenhuma negociação iniciada"
            description="Negociações nascem de uma cobrança em andamento."
          />
        ) : (
          <ul className="flex flex-col gap-4">
            {negociacoes.map((negociacao) => {
              const tone = STATUS_TONE[negociacao.status] ?? "neutral";
              const label = STATUS_LABEL[negociacao.status] ?? negociacao.status;
              return (
                <li
                  key={negociacao.id}
                  className="flex flex-col gap-1 border-b pb-3 text-sm last:border-b-0 last:pb-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/backoffice/negociacoes/${negociacao.id}`}
                      className="font-medium hover:underline"
                    >
                      {negociacao.obrigacaoDescricao}
                    </Link>
                    <StatusBadge label={label} tone={tone} />
                  </div>
                  <span className="text-muted-foreground">
                    Valor negociado: {formatCurrency(negociacao.valor_atual)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
