import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { Container, Eyebrow } from "@/components/site/ui";
import { LeadForm } from "@/components/site/lead-form";

export const metadata: Metadata = {
  title: "Solicitar demonstração — GSBC",
  description: "Solicite uma demonstração do GSBC para sua entidade sindical.",
};

const incluso = [
  "Demonstração do Command Center, workspaces e fluxos críticos com dados demo",
  "Conversa sobre instrumentos, obrigações, cobrança, conciliação e governança",
  "Mapeamento inicial de requisitos de implantação e permissões",
  "Próximos passos comerciais sem integração automática ou promessa de resultado",
];

export default function DiagnosticoPage() {
  return (
    <div className="py-16 sm:py-24">
      <Container className="grid gap-12 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-6">
          <Eyebrow>Demonstração guiada</Eyebrow>
          <h1 className="text-3xl font-bold tracking-tight text-brand-ink sm:text-4xl">
            Solicite uma demonstração do GSBC
          </h1>
          <p className="text-base text-brand-slate">
            Veja a plataforma operando sobre fluxos de compliance, receita,
            cobrança, negociação, financeiro e auditoria em um ambiente de
            demonstração.
          </p>
          <ul className="flex flex-col gap-3">
            {incluso.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 text-sm text-brand-navy"
              >
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-teal" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-brand-ice bg-white p-6 shadow-sm sm:p-8">
          <LeadForm origem="diagnostico" submitLabel="Solicitar demonstração" />
        </div>
      </Container>
    </div>
  );
}
