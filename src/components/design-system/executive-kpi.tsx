import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ExecutiveKpiTone = "default" | "positive" | "warning" | "critical";

interface ExecutiveKpiProps {
  label: string;
  value: string;
  period: string;
  context: string;
  href?: string;
  tone?: ExecutiveKpiTone;
  comparison?: ReactNode;
  supporting?: ReactNode;
  hero?: boolean;
}

const toneClass: Record<ExecutiveKpiTone, string> = {
  default: "border-border bg-card text-foreground",
  positive: "border-success/25 bg-success/5 text-success",
  warning: "border-warning/35 bg-warning/10 text-warning-foreground",
  critical: "border-destructive/30 bg-destructive/5 text-destructive",
};

export function ExecutiveKpi({
  label,
  value,
  period,
  context,
  href,
  tone = "default",
  comparison,
  supporting,
  hero = false,
}: ExecutiveKpiProps) {
  const content = (
    <div
      className={cn(
        "flex h-full flex-col justify-between rounded-lg border p-4 transition-colors",
        toneClass[tone],
        href ? "hover:border-primary/50" : null,
        hero ? "min-h-44" : "min-h-36",
      )}
    >
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase leading-none text-muted-foreground">
          {label}
        </p>
        <p className="text-xs text-muted-foreground">{period}</p>
      </div>
      <div className="flex flex-col gap-2">
        <p
          className={cn(
            "font-semibold tabular-nums tracking-normal",
            hero ? "text-4xl leading-none sm:text-5xl" : "text-2xl leading-tight",
          )}
        >
          {value}
        </p>
        {comparison ? <div className="text-xs text-muted-foreground">{comparison}</div> : null}
        <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
          {context}
        </p>
      </div>
      {supporting ? (
        <div className="border-t border-border-subtle pt-3 text-xs text-muted-foreground">
          {supporting}
        </div>
      ) : null}
    </div>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  );
}
