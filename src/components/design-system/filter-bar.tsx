import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  children: ReactNode;
  className?: string;
}

/**
 * Casca de filtros contextuais (Stage 1 da revisão de design) — cada
 * filho é tipicamente um Select/grupo de campos; a tela decide quais
 * filtros fazem sentido (regra 30 do master prompt: não criar dezenas de
 * filtros).
 */
export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {children}
    </div>
  );
}
