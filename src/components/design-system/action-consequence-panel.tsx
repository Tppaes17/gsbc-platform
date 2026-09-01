"use client";

import type { ReactNode } from "react";

interface ActionConsequenceItem {
  label: string;
  value: ReactNode;
  emphasis?: boolean;
}

interface ActionConsequencePanelProps {
  title?: string;
  items: ActionConsequenceItem[];
}

export function ActionConsequencePanel({
  title = "Consequência antes de confirmar",
  items,
}: ActionConsequencePanelProps) {
  if (items.length === 0) return null;

  return (
    <section className="rounded-md border bg-muted/30 p-3" aria-label={title}>
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      <dl className="mt-2 flex flex-col">
        {items.map((item, index) => (
          <div
            key={item.label}
            className={
              "flex items-start justify-between gap-4 py-2" +
              (index < items.length - 1 ? " border-b border-border-subtle" : "")
            }
          >
            <dt
              className={
                item.emphasis
                  ? "text-sm font-medium text-foreground"
                  : "text-sm text-muted-foreground"
              }
            >
              {item.label}
            </dt>
            <dd
              className={
                item.emphasis
                  ? "max-w-[68%] text-right text-sm font-semibold tabular-nums text-foreground"
                  : "max-w-[68%] text-right text-sm font-medium tabular-nums text-foreground"
              }
            >
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
