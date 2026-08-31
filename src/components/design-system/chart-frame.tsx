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
    <section className="flex min-w-0 flex-col gap-4 border-y border-border-subtle bg-muted/30 px-4 py-5 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold tracking-normal">{title}</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">{question}</p>
          <p className="text-[0.72rem] font-medium text-muted-foreground">
            {metric} · {period}
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
