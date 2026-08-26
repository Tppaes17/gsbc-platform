import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  Brain,
  Building2,
  ClipboardList,
  Eye,
  EyeOff,
  FileSearch,
  FileSignature,
  Gavel,
  Handshake,
  LayoutDashboard,
  Receipt,
  ShieldCheck,
  TrendingDown,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, Eyebrow, FeatureCard, SectionHeading, StatCard } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "GSBC — Gestora Sindical de Benefícios & Compliance",
  description:
    "Regularização extrajudicial, gestão de benefícios e tecnologia a serviço do trabalhador. Uma nova frente de parceria com o movimento sindical.",
};

const desafios = [
  {
    icon: FileSearch,
    title: "Passivos difíceis de rastrear",
    description:
      "Obrigações previstas em convenções e acordos coletivos se perdem entre planilhas, e-mails e processos manuais dispersos.",
  },
  {
    icon: Gavel,
    title: "Judicialização lenta e cara",
    description:
      "Levar cada pendência à Justiça consome anos e recursos — e o trabalhador continua esperando pelo que já tem direito.",
  },
  {
    icon: ClipboardList,
    title: "Gestão de benefícios manual",
    description:
      "Sem um sistema central, o acompanhamento de benefícios depende de controle informal e sujeito a falhas.",
  },
  {
    icon: EyeOff,
    title: "Pouca transparência com a base",
    description:
      "A categoria raramente enxerga o andamento real das cobranças e negociações feitas em seu nome.",
  },
];

const solucoes = [
  {
    icon: Receipt,
    title: "Cobrança Extrajudicial",
    description: "Regularização de passivos sem a lentidão do Judiciário.",
  },
  {
    icon: Handshake,
    title: "Negociação de Passivos",
    description: "Propostas, contrapropostas e acordos conduzidos com transparência.",
  },
  {
    icon: FileSignature,
    title: "Intermediação de ACT",
    description: "Apoio técnico na construção e no acompanhamento de acordos coletivos.",
  },
  {
    icon: Building2,
    title: "Enquadramento Sindical",
    description: "Regularização da base representada junto às empresas.",
  },
  {
    icon: ShieldCheck,
    title: "Gestão de Benefícios",
    description: "Administração centralizada dos benefícios da categoria.",
  },
  {
    icon: BadgeCheck,
    title: "Homologação de Fornecedores",
    description: "Curadoria de parceiros que atendem a base com qualidade e conformidade.",
  },
];

const tecnologia = [
  {
    icon: Bell,
    title: "Automação de notificações",
    description: "Comunicação estruturada em cada etapa da cobrança e da negociação.",
  },
  {
    icon: TrendingDown,
    title: "30–40% de redução operacional",
    description: "Menos trabalho manual repetitivo para a equipe do sindicato.",
  },
  {
    icon: Brain,
    title: "IA para análise preditiva",
    description: "Priorização de casos com maior probabilidade de regularização.",
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard em tempo real",
    description: "Visão consolidada de cobranças, negociações e acordos em andamento.",
  },
];

const valorParceiro = [
  {
    icon: ShieldCheck,
    title: "Regularização sem judicialização",
    description: "Resultado prático para a categoria, sem o desgaste de processos longos.",
  },
  {
    icon: Eye,
    title: "Transparência de ponta a ponta",
    description: "O sindicato acompanha cada etapa — a GSBC executa, a categoria enxerga.",
  },
  {
    icon: Brain,
    title: "Tecnologia dedicada",
    description: "Plataforma própria construída para a realidade da gestão sindical.",
  },
  {
    icon: Users,
    title: "Foco no trabalhador",
    description: "Toda a operação existe para transformar direito previsto em benefício recebido.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden bg-brand-ink">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(202,214,222,0.12),_transparent_55%)]" />
        <Container className="relative flex flex-col gap-8 py-20 sm:py-28">
          <Eyebrow>Apresentação institucional para sindicatos parceiros</Eyebrow>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Uma nova frente de parceria com o movimento sindical
          </h1>
          <p className="max-w-2xl text-lg text-brand-ice/85">
            Regularização extrajudicial, gestão de benefícios e tecnologia a
            serviço do trabalhador — para que direito previsto em convenção
            coletiva vire benefício de fato recebido.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
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
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10"
              nativeButton={false}
              render={<Link href="/como-funciona">Como funciona a parceria</Link>}
            />
          </div>
        </Container>
      </section>

      <section className="bg-brand-navy py-12">
        <Container className="grid grid-cols-2 gap-8">
          <StatCard value="30–40%" label="Redução de trabalho operacional manual" />
          <StatCard value="0" label="Custo do diagnóstico inicial" />
        </Container>
      </section>

      <section className="py-16 sm:py-24">
        <Container className="flex flex-col gap-10">
          <SectionHeading
            eyebrow="O desafio que enfrentamos juntos"
            title="A distância entre o direito previsto e o benefício recebido"
            description="Quatro problemas recorrentes na gestão sindical de passivos e benefícios — que a GSBC existe para resolver."
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {desafios.map((item) => (
              <FeatureCard key={item.title} tone="navy" {...item} />
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-brand-ice/40 py-16 sm:py-24">
        <Container className="flex flex-col gap-10">
          <SectionHeading
            eyebrow="Nossas soluções"
            title="Uma operação completa, do diagnóstico ao benefício entregue"
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {solucoes.map((item) => (
              <FeatureCard key={item.title} tone="teal" {...item} />
            ))}
          </div>
          <Link
            href="/solucoes"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-teal hover:underline"
          >
            Conhecer todas as soluções
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Container>
      </section>

      <section className="py-16 sm:py-24">
        <Container className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <SectionHeading
            eyebrow="Tecnologia a serviço do sindicato"
            title="Uma plataforma digital própria, construída para essa operação"
            description="Automação, priorização por IA e visibilidade em tempo real — para a equipe do sindicato e para a base representada."
          />
          <div className="grid gap-5 sm:grid-cols-2">
            {tecnologia.map((item) => (
              <FeatureCard key={item.title} tone="gold" {...item} />
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-brand-navy py-16 sm:py-24">
        <Container className="flex flex-col gap-10">
          <SectionHeading
            dark
            align="center"
            eyebrow="Por que ser parceiro da GSBC"
            title="Resultado para a categoria, tranquilidade para a diretoria"
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {valorParceiro.map((item) => (
              <div
                key={item.title}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-6"
              >
                <item.icon className="size-6 text-brand-gold" />
                <h3 className="text-base font-semibold text-white">{item.title}</h3>
                <p className="text-sm text-brand-ice/80">{item.description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-24">
        <Container className="flex flex-col items-center gap-6 rounded-3xl bg-brand-ink px-6 py-14 text-center sm:px-16">
          <h2 className="max-w-xl text-3xl font-bold text-white sm:text-4xl">
            Vamos construir essa parceria
          </h2>
          <p className="max-w-xl text-brand-ice/85">
            Diagnóstico inicial gratuito, sem compromisso. Entenda em poucos
            dias o potencial de regularização de passivos e ganho de
            eficiência para o seu sindicato.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              className="bg-brand-gold text-brand-ink hover:bg-brand-gold-light"
              nativeButton={false}
              render={<Link href="/diagnostico">Solicitar diagnóstico gratuito</Link>}
            />
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10"
              nativeButton={false}
              render={<Link href="/contato">Falar com a GSBC</Link>}
            />
          </div>
        </Container>
      </section>
    </div>
  );
}
