import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Agrupa campos de um formulário longo sob um título (Stage 1 da revisão
 * de design, usado a partir do Stage 6 — Forms). Ex.: "Dados cadastrais",
 * "Contato", "Informações financeiras".
 */
export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <fieldset className={cn("flex flex-col gap-3 border-0 p-0", className)}>
      <legend className="flex flex-col gap-0.5 px-0">
        <span className="text-sm font-medium text-foreground">{title}</span>
        {description ? (
          <span className="text-xs font-normal text-muted-foreground">{description}</span>
        ) : null}
      </legend>
      <div className="flex flex-col gap-4">{children}</div>
    </fieldset>
  );
}
