import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TableToolbarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  count?: number;
  countLabel?: string;
  selectedCount?: number;
  actions?: ReactNode;
  onReset?: () => void;
  className?: string;
}

/**
 * Casca da barra de ferramentas de tabela (Stage 1 da revisão de design —
 * componente ainda sem busca/filtro ligados a nenhuma tela; Stage 4
 * conecta a lógica real por tabela). Todos os slots são opcionais.
 */
export function TableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Buscar...",
  filters,
  count,
  countLabel,
  selectedCount,
  actions,
  onReset,
  className,
}: TableToolbarProps) {
  const hasSearch = onSearchChange !== undefined;
  const hasActiveFilter = Boolean(searchValue) || Boolean(onReset && selectedCount);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {hasSearch ? (
        <Input
          value={searchValue ?? ""}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-9 max-w-xs"
        />
      ) : null}
      {filters}
      {onReset && hasActiveFilter ? (
        <Button variant="ghost" size="sm" onClick={onReset}>
          <X className="h-4 w-4" />
          Limpar filtros
        </Button>
      ) : null}
      <div className="ml-auto flex items-center gap-3">
        {selectedCount ? (
          <span className="text-sm text-muted-foreground">
            {selectedCount} selecionada(s)
          </span>
        ) : count !== undefined ? (
          <span className="text-sm text-muted-foreground">
            {count} {countLabel ?? "registro(s)"}
          </span>
        ) : null}
        {actions}
      </div>
    </div>
  );
}
