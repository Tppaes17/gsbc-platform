import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageSectionProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Agrupa uma seção dentro de uma página longa (Stage 1 da revisão de
 * design, docs/design/stage-01-design-foundation.md) — substitui o padrão
 * anterior de heading solto + Card avulso repetido em cada página de
 * detalhe.
 */
export function PageSection({
  title,
  description,
  action,
  children,
  className,
}: PageSectionProps) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-medium text-foreground">{title}</h2>
          {description ? (
            <p className="text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
