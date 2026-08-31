import type { ReactNode } from "react";
import { BackofficeBreadcrumbs } from "./backoffice-breadcrumbs";

interface PageHeaderProps {
  title: string;
  description?: string;
  metadata?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
  showBreadcrumbs?: boolean;
}

export function PageHeader({
  title,
  description,
  metadata,
  status,
  actions,
  showBreadcrumbs = true,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        {showBreadcrumbs ? <BackofficeBreadcrumbs /> : null}
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h1 className="min-w-0 text-2xl font-semibold tracking-normal">{title}</h1>
          {status}
        </div>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
        {metadata ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {metadata}
          </div>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
