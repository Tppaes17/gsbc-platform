import type { LucideIcon } from "lucide-react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface RiskPanelProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  tone?: "warning" | "negative";
  action?: React.ReactNode;
}

const toneClass = {
  warning: "border-warning/40 bg-warning/10 text-warning-foreground [&_svg]:text-warning",
  negative: "border-destructive/40 bg-destructive/10 text-destructive [&_svg]:text-destructive",
} as const;

/**
 * Sinaliza que algo exige atenção (cobrança vencida, negociação parada,
 * falha de automação) — Stage 1 da revisão de design. Reservado para
 * situações reais de risco (regra do master prompt: não usar RiskPanel
 * para mensagens comuns).
 */
export function RiskPanel({
  title,
  description,
  icon: Icon = AlertTriangle,
  tone = "warning",
  action,
}: RiskPanelProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3",
        toneClass[tone],
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium">{title}</p>
          {description ? (
            <p className="text-sm opacity-90">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
    </div>
  );
}
