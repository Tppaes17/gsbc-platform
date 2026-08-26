import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { Container, Eyebrow } from "@/components/site/ui";
import { LeadForm } from "@/components/site/lead-form";

export const metadata: Metadata = {
  title: "Contato — GSBC",
  description: "Fale com a equipe da GSBC.",
};

export default function ContatoPage() {
  return (
    <div className="py-16 sm:py-24">
      <Container className="grid gap-12 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-6">
          <Eyebrow>Fale com a GSBC</Eyebrow>
          <h1 className="text-3xl font-bold tracking-tight text-brand-ink sm:text-4xl">
            Vamos conversar sobre a sua parceria
          </h1>
          <p className="text-base text-brand-slate">
            Envie sua mensagem e a equipe da GSBC retorna o contato. Se
            preferir, escreva diretamente para o e-mail abaixo.
          </p>
          <a
            href="mailto:contato@gsbc.com.br"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-teal hover:underline"
          >
            <Mail className="size-4" />
            contato@gsbc.com.br
          </a>
        </div>

        <div className="rounded-2xl border border-brand-ice bg-white p-6 shadow-sm sm:p-8">
          <LeadForm origem="contato" submitLabel="Enviar mensagem" />
        </div>
      </Container>
    </div>
  );
}
