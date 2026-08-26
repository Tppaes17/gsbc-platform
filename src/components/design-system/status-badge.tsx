import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusTone = "neutral" | "info" | "positive" | "warning" | "negative";

interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
}

const toneClass: Record<StatusTone, string> = {
  neutral: "bg-muted text-muted-foreground border-transparent",
  info: "bg-accent text-accent-foreground border-transparent",
  positive: "bg-success/15 text-success border-transparent",
  warning: "bg-warning/20 text-warning-foreground border-transparent",
  negative: "bg-destructive/15 text-destructive border-transparent",
};

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn(toneClass[tone])}>
      {label}
    </Badge>
  );
}
