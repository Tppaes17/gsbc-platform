import Link from "next/link";
import { FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/design-system/empty-state";
import { StatusBadge } from "@/components/design-system/status-badge";

interface ObrigacaoItem {
  id: string;
  descricao: string;
  vencimento: string | null;
  valor_referencia: number | null;
  status: string;
  instrumentoId: string;
  instrumentoTitulo: string;
}

const STATUS_CONFIG: Record<string, { label: string; tone: "positive" | "neutral" | "warning" | "negative" | "info" }> = {
  pending_validation: { label: "Aguardando validação", tone: "info" },
  validated: { label: "Validada", tone: "positive" },
  contested: { label: "Contestada", tone: "warning" },
  fulfilled: { label: "Cumprida", tone: "positive" },
  cancelled: { label: "Cancelada", tone: "neutral" },
};

function formatCurrency(value: number | null) {
  if (value === null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

/**
 * Lista somente leitura das obrigações desta empresa — a gestão (adicionar,
 * validar) acontece na página do instrumento de origem (regra 21: a
 * obrigação nasce do instrumento, não da empresa).
 */
export function EmpresaObrigacoesList({
  obrigacoes,
}: {
  obrigacoes: ObrigacaoItem[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          Instrumentos e obrigações
        </CardTitle>
      </CardHeader>
      <CardContent>
        {obrigacoes.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nenhuma obrigação registrada"
            description="Obrigações são criadas a partir de um instrumento coletivo."
          />
        ) : (
          <ul className="flex flex-col gap-4">
            {obrigacoes.map((obrigacao) => {
              const config = STATUS_CONFIG[obrigacao.status] ?? {
                label: obrigacao.status,
                tone: "neutral" as const,
              };
              return (
                <li
                  key={obrigacao.id}
                  className="flex flex-col gap-1 border-b pb-3 text-sm last:border-b-0 last:pb-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{obrigacao.descricao}</span>
                    <StatusBadge label={config.label} tone={config.tone} />
                  </div>
                  <span className="text-muted-foreground">
                    <Link
                      href={`/backoffice/instrumentos/${obrigacao.instrumentoId}`}
                      className="hover:underline"
                    >
                      {obrigacao.instrumentoTitulo}
                    </Link>
                    {" · Vencimento: "}
                    {formatDate(obrigacao.vencimento)}
                    {" · "}
                    {formatCurrency(obrigacao.valor_referencia)}
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
