import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Eye, Lock, ScrollText, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, FeatureCard, SectionHeading } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "Compliance — GSBC",
  description:
    "Isolamento de dados por sindicato, controle de acesso por papel e trilha de auditoria completa em cada ação relevante da plataforma.",
};

const pilares = [
  {
    icon: Lock,
    title: "Isolamento de dados por sindicato",
    description:
      "Os dados de cada sindicato parceiro são isolados no nível do banco de dados — um sindicato nunca acessa informações de outro, por construção, não apenas por regra de tela.",
  },
  {
    icon: Users,
    title: "Controle de acesso por papel",
    description:
      "Permissões concedidas por função dentro de cada organização (nunca fixadas na conta do usuário) — cada pessoa vê e altera exatamente o que seu papel autoriza.",
  },
  {
    icon: ScrollText,
    title: "Trilha de auditoria completa",
    description:
      "Toda ação relevante — criação, edição, mudança de status — é registrada com quem fez, quando fez e o que mudou, de forma consultável a qualquer momento.",
  },
  {
    icon: Eye,
    title: "Transparência com a diretoria",
    description:
      "A GSBC executa a operação; o sindicato acompanha cada etapa — cobranças, negociações e benefícios — sem depender de relatórios avulsos.",
  },
];

export default function CompliancePage() {
  return (
    <div className="flex flex-col">
      <section className="bg-brand-ink py-16 sm:py-24">
        <Container>
          <SectionHeading
            dark
            eyebrow="Compliance"
            title="Regularização extrajudicial com rigor de conformidade"
            description="Compliance aqui não é um selo: é a arquitetura da plataforma que sustenta cada cobrança, negociação e benefício gerido pela GSBC."
          />
        </Container>
      </section>

      <section className="py-16 sm:py-24">
        <Container className="grid gap-5 sm:grid-cols-2">
          {pilares.map((item) => (
            <FeatureCard key={item.title} tone="navy" {...item} />
          ))}
        </Container>
      </section>

      <section className="bg-brand-ice/40 py-16 sm:py-20">
        <Container className="flex flex-col items-center gap-5 text-center">
          <h2 className="max-w-xl text-2xl font-bold text-brand-ink sm:text-3xl">
            Tem dúvidas sobre segurança e conformidade de dados?
          </h2>
          <Button
            size="lg"
            className="bg-brand-gold text-brand-ink hover:bg-brand-gold-light"
            nativeButton={false}
            render={
              <Link href="/contato">
                Falar com a GSBC
                <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
        </Container>
      </section>
    </div>
  );
}
