import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BarChart3,
  Handshake,
  Receipt,
  Scale,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, SectionHeading } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "Como Funciona a Parceria — GSBC",
  description:
    "Diagnóstico inicial, cobrança extrajudicial, negociação, gestão de benefícios, relatórios periódicos e, só em último caso, encaminhamento judicial.",
};

const etapas = [
  {
    icon: Search,
    title: "Diagnóstico inicial",
    description:
      "Levantamento gratuito e sem compromisso dos passivos e obrigações previstas em convenções e acordos coletivos do sindicato.",
  },
  {
    icon: Receipt,
    title: "Cobrança extrajudicial",
    description:
      "A GSBC conduz a cobrança diretamente com as empresas, com prazos, prioridade e responsável definidos para cada caso.",
  },
  {
    icon: Handshake,
    title: "Negociação",
    description:
      "Quando necessário, propostas e contrapropostas são negociadas até um acordo — tudo registrado e vinculado à cobrança de origem.",
  },
  {
    icon: ShieldCheck,
    title: "Gestão de benefícios",
    description:
      "Os benefícios acordados passam a ser administrados de forma centralizada, com visibilidade para a diretoria do sindicato.",
  },
  {
    icon: BarChart3,
    title: "Relatórios periódicos",
    description:
      "A diretoria acompanha o andamento de cada caso através de relatórios e do dashboard da plataforma — nunca no escuro.",
  },
  {
    icon: Scale,
    title: "Encaminhamento judicial",
    description:
      "Só como último recurso, quando a via extrajudicial se esgota — a exceção, não a regra da operação.",
  },
];

export default function ComoFuncionaPage() {
  return (
    <div className="flex flex-col">
      <section className="bg-brand-ink py-16 sm:py-24">
        <Container>
          <SectionHeading
            dark
            eyebrow="Como funciona a parceria"
            title="Um fluxo claro, do primeiro diagnóstico ao benefício entregue"
            description="Seis etapas — a via extrajudicial é sempre priorizada; o Judiciário é o último recurso, não o ponto de partida."
          />
        </Container>
      </section>

      <section className="py-16 sm:py-24">
        <Container>
          <ol className="flex flex-col gap-6">
            {etapas.map((etapa, index) => (
              <li
                key={etapa.title}
                className="flex flex-col gap-4 rounded-2xl border border-brand-ice bg-white p-6 shadow-sm sm:flex-row sm:items-start sm:gap-6 sm:p-8"
              >
                <div className="flex items-center gap-3 sm:flex-col sm:items-center sm:gap-2">
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-teal/10 text-lg font-bold text-brand-teal">
                    {index + 1}
                  </span>
                  <etapa.icon className="hidden size-5 text-brand-slate sm:block" />
                </div>
                <div className="flex flex-col gap-2">
                  <h2 className="text-lg font-semibold text-brand-ink">{etapa.title}</h2>
                  <p className="text-sm text-brand-slate">{etapa.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="bg-brand-ice/40 py-16 sm:py-20">
        <Container className="flex flex-col items-center gap-5 text-center">
          <h2 className="max-w-xl text-2xl font-bold text-brand-ink sm:text-3xl">
            Pronto para começar pelo diagnóstico?
          </h2>
          <Button
            size="lg"
            className="bg-brand-gold text-brand-ink hover:bg-brand-gold-light"
            nativeButton={false}
            render={
              <Link href="/diagnostico">
                Solicitar diagnóstico gratuito
                <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
        </Container>
      </section>
    </div>
  );
}
