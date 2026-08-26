import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Bell,
  Brain,
  ClipboardCheck,
  Globe,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, FeatureCard, SectionHeading, StatCard } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "Tecnologia — GSBC",
  description:
    "Plataforma digital própria: automação de notificações, IA para análise preditiva, dashboard em tempo real e trilha de auditoria completa.",
};

const features = [
  {
    icon: Bell,
    title: "Automação de notificações",
    description:
      "Cada mudança de status de uma cobrança ou negociação gera um evento registrado — a base para comunicação estruturada em cada etapa.",
  },
  {
    icon: Brain,
    title: "IA para análise preditiva",
    description:
      "Priorização de casos com maior probabilidade de regularização, direcionando o esforço da equipe para onde ele rende mais.",
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard em tempo real",
    description:
      "Visão consolidada de cobranças, negociações e acordos em andamento, com o valor total em cobrança sempre à vista.",
  },
  {
    icon: Globe,
    title: "Plataforma digital própria",
    description:
      "Cada sindicato parceiro acessa sua própria área, com isolamento completo de dados entre entidades — a mesma plataforma que já roda a operação.",
  },
  {
    icon: ShieldCheck,
    title: "Controle de acesso por papel",
    description:
      "Permissões definidas por função dentro de cada organização — nenhum usuário vê ou altera mais do que o seu papel permite.",
  },
  {
    icon: ClipboardCheck,
    title: "Trilha de auditoria completa",
    description:
      "Toda ação relevante — de quem, quando e o quê — fica registrada e consultável, sustentando a transparência da parceria.",
  },
];

export default function TecnologiaPage() {
  return (
    <div className="flex flex-col">
      <section className="bg-brand-ink py-16 sm:py-24">
        <Container>
          <SectionHeading
            dark
            eyebrow="Tecnologia a serviço do sindicato"
            title="A mesma plataforma que roda a operação, na mão da diretoria"
            description="Não é uma promessa de roadmap: é o sistema que já processa cobranças, negociações e benefícios dos sindicatos parceiros."
          />
        </Container>
      </section>

      <section className="bg-brand-navy py-12">
        <Container className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <StatCard value="30–40%" label="Redução de trabalho operacional manual" />
          <StatCard value="100%" label="Cobranças e negociações com histórico auditável" />
          <StatCard value="1" label="Plataforma única para toda a operação" />
        </Container>
      </section>

      <section className="py-16 sm:py-24">
        <Container className="flex flex-col gap-10">
          <SectionHeading
            title="O que a plataforma entrega, na prática"
            description="Cada módulo abaixo já existe e roda com dados reais — não é uma maquete."
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((item) => (
              <FeatureCard key={item.title} tone="teal" {...item} />
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-brand-ice/40 py-16 sm:py-20">
        <Container className="flex flex-col items-center gap-5 text-center">
          <h2 className="max-w-xl text-2xl font-bold text-brand-ink sm:text-3xl">
            Já é parceiro? Acesse a plataforma.
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              className="bg-brand-gold text-brand-ink hover:bg-brand-gold-light"
              nativeButton={false}
              render={<Link href="/login">Entrar na plataforma</Link>}
            />
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={
                <Link href="/diagnostico">
                  Ainda não é parceiro? Solicitar diagnóstico
                  <ArrowRight className="h-4 w-4" />
                </Link>
              }
            />
          </div>
        </Container>
      </section>
    </div>
  );
}
