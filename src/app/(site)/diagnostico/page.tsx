import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { Container, Eyebrow } from "@/components/site/ui";
import { LeadForm } from "@/components/site/lead-form";

export const metadata: Metadata = {
  title: "Diagnóstico gratuito — GSBC",
  description:
    "Solicite o diagnóstico gratuito e sem compromisso para o seu sindicato.",
};

const incluso = [
  "Levantamento inicial de passivos e obrigações previstas em convenções e acordos coletivos",
  "Estimativa do potencial de regularização extrajudicial",
  "Apresentação da plataforma digital da GSBC",
  "Proposta de parceria sob medida, sem compromisso",
];

export default function DiagnosticoPage() {
  return (
    <div className="py-16 sm:py-24">
      <Container className="grid gap-12 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-6">
          <Eyebrow>Sem compromisso</Eyebrow>
          <h1 className="text-3xl font-bold tracking-tight text-brand-ink sm:text-4xl">
            Solicite o diagnóstico gratuito
          </h1>
          <p className="text-base text-brand-slate">
            Em poucos dias, entenda o potencial real de regularização de
            passivos e o ganho de eficiência que a parceria com a GSBC
            representa para o seu sindicato.
          </p>
          <ul className="flex flex-col gap-3">
            {incluso.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-brand-navy">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-teal" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-brand-ice bg-white p-6 shadow-sm sm:p-8">
          <LeadForm origem="diagnostico" submitLabel="Solicitar diagnóstico gratuito" />
        </div>
      </Container>
    </div>
  );
}
