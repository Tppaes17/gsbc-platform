import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface EntityWorkspaceNavItem {
  id: string;
  label: string;
  meta?: ReactNode;
}

export interface EntitySummaryItem {
  label: string;
  value: ReactNode;
  tone?: "default" | "positive" | "warning" | "negative" | "muted";
}

export function EntityWorkspace({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("flex flex-col gap-5", className)}>{children}</div>;
}

export function EntityWorkspaceNav({ items }: { items: EntityWorkspaceNavItem[] }) {
  return (
    <nav
      aria-label="Navegação da entidade"
      className="sticky top-0 z-20 -mx-4 border-y bg-background/95 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-md sm:border sm:bg-card"
    >
      <div className="flex flex-wrap gap-1">
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="inline-flex min-h-9 items-center gap-1 rounded-md px-3 text-sm font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <span>{item.label}</span>
            {item.meta ? <span className="text-xs font-normal">{item.meta}</span> : null}
          </a>
        ))}
      </div>
    </nav>
  );
}

export function EntitySummaryStrip({ items }: { items: EntitySummaryItem[] }) {
  return (
    <dl className="grid gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-col gap-1 bg-card px-4 py-3">
          <dt className="text-xs font-medium uppercase text-muted-foreground">{item.label}</dt>
          <dd
            className={cn(
              "min-w-0 text-base font-semibold tabular-nums text-foreground",
              item.tone === "positive" ? "text-emerald-700" : null,
              item.tone === "warning" ? "text-amber-700" : null,
              item.tone === "negative" ? "text-destructive" : null,
              item.tone === "muted" ? "text-muted-foreground" : null,
            )}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function EntityWorkspaceSection({
  id,
  title,
  description,
  action,
  children,
  className,
}: {
  id: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-24 border-t pt-5", className)}>
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function EntityRelationshipSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-md border bg-card p-4", className)}>
      {children}
    </div>
  );
}

export function EntityEmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-md border border-dashed px-4 py-5">
      <p className="text-sm font-medium">{title}</p>
      {description ? <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}
