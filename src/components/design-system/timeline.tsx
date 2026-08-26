export interface TimelineItem {
  id: string;
  label: string;
  description?: string;
  timestamp: string;
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Timeline universal (regra 25) — usada para o histórico de cobranças,
 * negociações e acordos. Itens mais recentes primeiro.
 */
export function Timeline({ items }: { items: TimelineItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum evento registrado ainda.
      </p>
    );
  }

  return (
    <ol className="flex flex-col">
      {items.map((item, index) => (
        <li key={item.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
            {index < items.length - 1 ? (
              <span className="w-px flex-1 bg-border" />
            ) : null}
          </div>
          <div className="flex flex-col gap-0.5 pb-4">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium">{item.label}</span>
              <span className="text-xs text-muted-foreground">
                {formatTimestamp(item.timestamp)}
              </span>
            </div>
            {item.description ? (
              <p className="text-sm text-muted-foreground">
                {item.description}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
