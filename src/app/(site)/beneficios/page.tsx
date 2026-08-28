import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, BadgeCheck, Eye, LayoutDashboard, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, FeatureCard, SectionHeading } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "Gestão de Benefícios — GSBC",
  description:
    "Administração centralizada dos benefícios da categoria, com fornecedores homologados e visibilidade de ponta a ponta.",
};

const pilares = [
  {
    icon: ShieldCheck,
    title: "Administração centralizada",
    description:
      "Todos os benefícios acordados para a categoria — conquistados via convenção, acordo coletivo ou negociação — passam a ser geridos em um único lugar, sem depender de controle manual disperso.",
  },
  {
    icon: BadgeCheck,
    title: "Fornecedores homologados",
    description:
      "Parceiros que atendem a base passam por um processo de homologação, com critérios de qualidade e conformidade antes de entrar na rede.",
  },
  {
    icon: LayoutDashboard,
    title: "Visibilidade em tempo real",
    description:
      "A diretoria do sindicato acompanha o que está sendo entregue à categoria, sem depender de relatórios avulsos ou pedidos pontuais à equipe.",
  },
  {
    icon: Eye,
    title: "Transparência com a base",
    description:
      "A categoria enxerga o andamento real dos benefícios conquistados em seu nome — parte do compromisso de transparência de ponta a ponta da GSBC.",
  },
];

export default function BeneficiosPage() {
  return (
    <div className="flex flex-col">
      <section className="bg-brand-ink py-16 sm:py-24">
        <Container>
          <SectionHeading
            as="h1"
            dark
            eyebrow="Gestão de benefícios"
            title="Do acordo conquistado ao benefício efetivamente recebido"
            description="A GSBC administra o que a negociação conquista, para que o direito da categoria não se perca entre a assinatura do acordo e o dia a dia do trabalhador."
          />
        </Container>
      </section>

      <section className="py-16 sm:py-24">
        <Container className="grid gap-5 sm:grid-cols-2">
          {pilares.map((item) => (
            <FeatureCard key={item.title} tone="teal" {...item} />
          ))}
        </Container>
      </section>

      <section className="bg-brand-ice/40 py-16 sm:py-20">
        <Container className="flex flex-col items-center gap-5 text-center">
          <h2 className="max-w-xl text-2xl font-bold text-brand-ink sm:text-3xl">
            Quer saber como isso funcionaria no seu sindicato?
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
