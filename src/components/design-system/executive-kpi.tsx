import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, Info } from "lucide-react";
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
  default: "border-border/70 bg-card text-foreground",
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
  return (
    <article
      className={cn(
        "group flex h-full flex-col justify-between rounded-md border p-4 transition-colors",
        toneClass[tone],
        href ? "hover:border-primary/45" : null,
        hero ? "min-h-36" : "min-h-28",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-[0.72rem] font-semibold uppercase leading-none text-muted-foreground">
          {label}
          </p>
          <p className="truncate text-xs text-muted-foreground">{period}</p>
        </div>
        <details className="group/details relative shrink-0">
          <summary
            aria-label={`Definição de ${label}`}
            className="flex size-6 cursor-pointer list-none items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <Info className="h-3.5 w-3.5" aria-hidden="true" />
          </summary>
          <p className="absolute right-0 top-8 z-20 w-72 rounded-md bg-foreground px-3 py-2 text-xs leading-relaxed text-background shadow-sm">
            {context}
          </p>
        </details>
      </div>
      <div className="mt-5 flex flex-col gap-2">
        <p
          className={cn(
            "font-bold tabular-nums tracking-normal text-foreground",
            hero ? "text-4xl leading-none sm:text-[2.6rem]" : "text-xl leading-tight",
          )}
        >
          {value}
        </p>
        {comparison ? <div className="text-xs font-medium text-muted-foreground">{comparison}</div> : null}
      </div>
      <div className="mt-4 flex min-h-5 items-center justify-between gap-3 border-t border-border-subtle pt-3 text-xs text-muted-foreground">
        <div>{supporting}</div>
        {href ? (
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-1 font-semibold text-primary hover:underline"
          >
            Abrir <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </article>
  );
}
