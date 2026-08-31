import { cn } from "@/lib/utils";

export function formatBrl(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function FinancialCell({
  value,
  secondary,
  tone = "default",
}: {
  value: number;
  secondary?: string;
  tone?: "default" | "positive" | "warning" | "negative" | "muted";
}) {
  return (
    <span className="block text-right">
      <span
        className={cn(
          "block font-semibold tabular-nums",
          tone === "positive" ? "text-success" : null,
          tone === "warning" ? "text-warning-foreground" : null,
          tone === "negative" ? "text-destructive" : null,
          tone === "muted" ? "text-muted-foreground" : null,
        )}
      >
        {formatBrl(value)}
      </span>
      {secondary ? (
        <span className="block text-xs font-normal text-muted-foreground">{secondary}</span>
      ) : null}
    </span>
  );
}
