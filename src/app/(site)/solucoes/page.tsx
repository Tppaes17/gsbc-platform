import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  FileSignature,
  Handshake,
  Receipt,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, IconCircle, SectionHeading } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "Soluções — GSBC",
  description:
    "Cobrança extrajudicial, negociação de passivos, intermediação de ACT, enquadramento sindical, gestão de benefícios e homologação de fornecedores.",
};

const solucoes = [
  {
    icon: Receipt,
    title: "Cobrança Extrajudicial",
    description:
      "A GSBC identifica e conduz a regularização de obrigações previstas em instrumentos coletivos diretamente com as empresas. Cada cobrança tem status, responsável e histórico completo de eventos, visível ao sindicato na plataforma.",
  },
  {
    icon: Handshake,
    title: "Negociação de Passivos",
    description:
      "Quando a cobrança direta não resolve, entra a negociação: propostas, contrapropostas e o acordo final ficam registrados e vinculados à cobrança de origem — nada se perde entre etapas.",
  },
  {
    icon: FileSignature,
    title: "Intermediação de ACT",
    description:
      "Apoio técnico na construção, revisão e acompanhamento de Acordos Coletivos de Trabalho, com o mesmo rigor documental usado no restante da operação.",
  },
  {
    icon: Building2,
    title: "Enquadramento Sindical",
    description:
      "Regularização da base representada junto às empresas — a ficha 360º de cada empresa reúne instrumentos, obrigações, cobranças e contatos em um só lugar.",
  },
  {
    icon: ShieldCheck,
    title: "Gestão de Benefícios",
    description:
      "Administração centralizada dos benefícios da categoria, com visibilidade de ponta a ponta para a diretoria do sindicato acompanhar o que está sendo entregue.",
  },
  {
    icon: BadgeCheck,
    title: "Homologação de Fornecedores",
    description:
      "Curadoria de parceiros e fornecedores que atendem a base, com critérios de qualidade e conformidade antes da homologação.",
  },
];

export default function SolucoesPage() {
  return (
    <div className="flex flex-col">
      <section className="bg-brand-ink py-16 sm:py-24">
        <Container>
          <SectionHeading
            as="h1"
            dark
            eyebrow="Nossas soluções"
            title="Uma operação completa para a gestão sindical de passivos e benefícios"
            description="Seis frentes que cobrem todo o ciclo — do primeiro contato com a empresa até o benefício entregue ao trabalhador."
          />
        </Container>
      </section>

      <section className="py-16 sm:py-24">
        <Container className="flex flex-col gap-6">
          {solucoes.map((item) => (
            <div
              key={item.title}
              className="flex flex-col gap-4 rounded-2xl border border-brand-ice bg-white p-6 shadow-sm sm:flex-row sm:items-start sm:gap-6 sm:p-8"
            >
              <IconCircle icon={item.icon} tone="teal" />
              <div className="flex flex-col gap-2">
                <h2 className="text-lg font-semibold text-brand-ink">
                  {item.title}
                </h2>
                <p className="text-sm text-brand-slate">{item.description}</p>
              </div>
            </div>
          ))}
        </Container>
      </section>

      <section className="bg-brand-ice/40 py-16 sm:py-20">
        <Container className="flex flex-col items-center gap-5 text-center">
          <h2 className="max-w-xl text-2xl font-bold text-brand-ink sm:text-3xl">
            Quer entender qual solução se encaixa no seu sindicato?
          </h2>
          <Button
            size="lg"
            className="bg-brand-gold text-brand-ink hover:bg-brand-gold-light"
            nativeButton={false}
            render={
              <Link href="/diagnostico">
                Solicitar demonstração
                <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
        </Container>
      </section>
    </div>
  );
}
