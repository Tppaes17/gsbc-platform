import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface MobileRowMeta {
  label: string;
  value: ReactNode;
  priority?: "primary" | "secondary" | "detail";
}

export function MobileRowCard({
  title,
  subtitle,
  status,
  value,
  metadata,
  action,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  status?: ReactNode;
  value?: ReactNode;
  metadata?: MobileRowMeta[];
  action?: ReactNode;
  className?: string;
}) {
  const visibleMetadata = metadata?.filter((item) => item.priority !== "detail").slice(0, 4) ?? [];
  const detailMetadata = metadata?.filter((item) => item.priority === "detail") ?? [];

  return (
    <article className={cn("rounded-md border bg-card p-3 shadow-xs", className)}>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="break-words text-sm font-semibold leading-snug">{title}</div>
          {subtitle ? (
            <div className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">
              {subtitle}
            </div>
          ) : null}
        </div>
        {status ? <div className="shrink-0">{status}</div> : null}
      </div>

      {value ? <div className="mt-3 text-lg font-semibold tabular-nums">{value}</div> : null}

      {visibleMetadata.length > 0 ? (
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
          {visibleMetadata.map((item) => (
            <div key={item.label} className="min-w-0">
              <dt className="text-[0.68rem] font-semibold uppercase text-muted-foreground">
                {item.label}
              </dt>
              <dd className="mt-0.5 min-w-0 break-words text-sm">{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {detailMetadata.length > 0 ? (
        <details className="mt-3 border-t border-border-subtle pt-2">
          <summary className="cursor-pointer text-xs font-semibold text-primary">
            Ver detalhes
          </summary>
          <dl className="mt-2 grid gap-2">
            {detailMetadata.map((item) => (
              <div key={item.label}>
                <dt className="text-[0.68rem] font-semibold uppercase text-muted-foreground">
                  {item.label}
                </dt>
                <dd className="mt-0.5 break-words text-sm">{item.value}</dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}

      {action ? <div className="mt-3 border-t border-border-subtle pt-3">{action}</div> : null}
    </article>
  );
}
