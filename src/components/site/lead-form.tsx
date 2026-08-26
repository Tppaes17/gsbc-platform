"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitSiteLeadAction, type SiteLeadActionState } from "@/app/(site)/actions";

const initialState: SiteLeadActionState = { status: "idle", message: null };

export function LeadForm({
  origem,
  submitLabel,
  showMensagem = true,
}: {
  origem: "diagnostico" | "contato";
  submitLabel: string;
  showMensagem?: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    submitSiteLeadAction,
    initialState,
  );

  if (state.status === "success") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-brand-teal/30 bg-brand-teal/5 p-8 text-center">
        <CheckCircle2 className="size-8 text-brand-teal" />
        <p className="text-sm font-medium text-brand-ink">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="origem" value={origem} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="nome">Nome completo *</Label>
          <Input id="nome" name="nome" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">E-mail *</Label>
          <Input id="email" name="email" type="email" required />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="sindicatoNome">Sindicato</Label>
          <Input id="sindicatoNome" name="sindicatoNome" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="telefone">Telefone</Label>
          <Input id="telefone" name="telefone" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="cargo">Cargo / função</Label>
        <Input id="cargo" name="cargo" />
      </div>

      {showMensagem ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="mensagem">Mensagem</Label>
          <Textarea id="mensagem" name="mensagem" rows={4} />
        </div>
      ) : null}

      {state.status === "error" && state.message ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        disabled={isPending}
        className="bg-brand-gold text-brand-ink hover:bg-brand-gold-light"
      >
        {isPending ? "Enviando…" : submitLabel}
      </Button>
    </form>
  );
}
