import { cn } from "@/lib/utils";

interface FinancialSummaryRow {
  label: string;
  value: number;
  tone?: "positive" | "negative" | "neutral";
  emphasis?: boolean;
}

interface FinancialSummaryProps {
  rows: FinancialSummaryRow[];
  className?: string;
}

const toneClass = {
  positive: "text-financial-positive",
  negative: "text-financial-negative",
  neutral: "text-financial-neutral",
} as const;

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Apresentação de valores financeiros já existentes — nunca recalcula
 * (Stage 1 da revisão de design). Usada em cobrança, negociação,
 * pagamento e acordo, no lugar de linhas de texto soltas.
 */
export function FinancialSummary({ rows, className }: FinancialSummaryProps) {
  return (
    <dl className={cn("flex flex-col", className)}>
      {rows.map((row, index) => (
        <div
          key={row.label}
          className={cn(
            "flex items-baseline justify-between gap-4 py-2",
            index < rows.length - 1 && "border-b border-border-subtle",
          )}
        >
          <dt
            className={cn(
              "text-sm",
              row.emphasis ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            {row.label}
          </dt>
          <dd
            className={cn(
              "font-variant-numeric-tabular text-sm tabular-nums",
              row.emphasis ? "text-base font-semibold" : "font-medium",
              row.tone ? toneClass[row.tone] : "text-foreground",
            )}
          >
            {formatCurrency(row.value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
