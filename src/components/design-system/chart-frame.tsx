import type { ReactNode } from "react";

interface ChartFrameProps {
  title: string;
  question: string;
  metric: string;
  period: string;
  children: ReactNode;
  action?: ReactNode;
  fallback?: ReactNode;
}

export function ChartFrame({
  title,
  question,
  metric,
  period,
  children,
  action,
  fallback,
}: ChartFrameProps) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{question}</p>
          <p className="text-xs text-muted-foreground">
            Métrica: {metric} · Período: {period}
          </p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
      {fallback ? (
        <div className="sr-only" aria-label={`Resumo acessível de ${title}`}>
          {fallback}
        </div>
      ) : null}
    </section>
  );
}
