import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  density?: "default" | "compact";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  density = "default",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-4 text-center ${
        density === "compact" ? "py-6" : "py-16"
      }`}
    >
      {Icon ? <Icon className="h-8 w-8 text-muted-foreground" /> : null}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">{title}</p>
        {description ? (
          <p className="max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
