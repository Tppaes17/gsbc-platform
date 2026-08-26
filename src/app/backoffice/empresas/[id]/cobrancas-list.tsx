import Link from "next/link";
import { Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/design-system/empty-state";
import { StatusBadge } from "@/components/design-system/status-badge";
import { cobrancaStatusOptions } from "@/lib/validation/cobranca";

interface CobrancaItem {
  id: string;
  valor_cobranca: number;
  vencimento: string | null;
  status: string;
  obrigacaoDescricao: string;
}

const STATUS_LABEL = Object.fromEntries(
  cobrancaStatusOptions.map((o) => [o.value, o.label]),
);

const STATUS_TONE: Record<string, "positive" | "neutral" | "warning" | "negative" | "info"> = {
  draft: "neutral",
  pending_validation: "info",
  approved: "info",
  notified: "info",
  contacted: "info",
  negotiating: "warning",
  agreement_reached: "positive",
  partially_paid: "warning",
  paid: "positive",
  overdue: "negative",
  suspended: "neutral",
  cancelled: "neutral",
  legal_escalation: "negative",
  closed: "neutral",
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

/**
 * Lista somente leitura das cobranças desta empresa — a gestão (mudar
 * status, editar valores) acontece na própria página da cobrança.
 */
export function EmpresaCobrancasList({
  cobrancas,
}: {
  cobrancas: CobrancaItem[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Cobranças</CardTitle>
      </CardHeader>
      <CardContent>
        {cobrancas.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Nenhuma cobrança gerada"
            description="Cobranças nascem de uma obrigação validada."
          />
        ) : (
          <ul className="flex flex-col gap-4">
            {cobrancas.map((cobranca) => {
              const tone = STATUS_TONE[cobranca.status] ?? "neutral";
              const label = STATUS_LABEL[cobranca.status] ?? cobranca.status;
              return (
                <li
                  key={cobranca.id}
                  className="flex flex-col gap-1 border-b pb-3 text-sm last:border-b-0 last:pb-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/backoffice/cobrancas/${cobranca.id}`}
                      className="font-medium hover:underline"
                    >
                      {cobranca.obrigacaoDescricao}
                    </Link>
                    <StatusBadge label={label} tone={tone} />
                  </div>
                  <span className="text-muted-foreground">
                    {formatCurrency(cobranca.valor_cobranca)}
                    {" · Vencimento: "}
                    {formatDate(cobranca.vencimento)}
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
