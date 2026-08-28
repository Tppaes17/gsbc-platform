import type { ReactNode } from "react";
import { StatusBadge } from "@/components/design-system/status-badge";

interface DetailHeaderMetadataItem {
  label: string;
  value: ReactNode;
}

interface DetailHeaderProps {
  title: string;
  subtitle?: string;
  status?: {
    label: string;
    tone?: "neutral" | "info" | "positive" | "warning" | "negative";
  };
  metadata?: DetailHeaderMetadataItem[];
  actions?: ReactNode;
}

/**
 * Cabeçalho padrão de página de detalhe (Stage 1 da revisão de design,
 * docs/design/stage-01-design-foundation.md) — separa identidade, status,
 * metadados e ações, no lugar do bloco de status/valor montado à mão em
 * cada página (empresa, cobrança, negociação).
 */
export function DetailHeader({
  title,
  subtitle,
  status,
  metadata,
  actions,
}: DetailHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b pb-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle ? (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>

      {status || (metadata && metadata.length > 0) ? (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          {status ? (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Status:</span>
              <StatusBadge label={status.label} tone={status.tone} />
            </div>
          ) : null}
          {metadata?.map((item) => (
            <div key={item.label} className="text-muted-foreground">
              {item.label}: <span className="font-medium text-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
