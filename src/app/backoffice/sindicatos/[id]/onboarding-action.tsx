"use client";

import { useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/design-system/confirmation-dialog";
import { completeOnboardingAction } from "../actions";

export function OnboardingAction({ tenantId }: { tenantId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <ConfirmationDialog
      trigger={
        <Button variant="outline" disabled={isPending}>
          <CheckCircle2 className="h-4 w-4" />
          Concluir onboarding
        </Button>
      }
      title="Concluir onboarding do sindicato?"
      description="A partir de agora, o administrador do próprio sindicato poderá convidar e gerenciar a equipe dele. A GSBC continua podendo gerenciar normalmente."
      confirmLabel="Concluir onboarding"
      onConfirm={() => {
        startTransition(() => {
          void completeOnboardingAction(tenantId);
        });
      }}
    />
  );
}
