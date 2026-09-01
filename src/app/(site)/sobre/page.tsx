import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Cpu, Heart, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoFull } from "@/components/site/logo";
import { Container, Eyebrow, SectionHeading } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "Sobre a GSBC",
  description:
    "Quem somos, nossos valores e o roadmap de expansão da parceria com sindicatos.",
};

const valores = [
  {
    icon: Scale,
    title: "Ética e Transparência",
    description:
      "A GSBC executa a operação; o sindicato acompanha cada etapa. Sem isso, não há confiança para sustentar a parceria.",
  },
  {
    icon: Heart,
    title: "Compromisso Social",
    description:
      "Toda a operação existe para transformar direito previsto em convenção em benefício de fato recebido pelo trabalhador.",
  },
  {
    icon: Cpu,
    title: "Inovação e Tecnologia",
    description:
      "Uma plataforma digital própria substitui controle manual disperso por processo estruturado e auditável.",
  },
];

const roadmap = [
  {
    fase: "Ano 1 — Fundação",
    descricao:
      "8–10 sindicatos parceiros, plataforma em operação, primeiros diagnósticos e cobranças conduzidos ponta a ponta.",
  },
  {
    fase: "Ano 2 — Expansão",
    descricao:
      "Ampliação da base de sindicatos parceiros e maturação dos módulos de negociação e gestão de benefícios.",
  },
  {
    fase: "Ano 3 — Referência Nacional",
    descricao:
      "Consolidação da GSBC como referência em regularização extrajudicial e gestão de benefícios para o movimento sindical.",
  },
];

export default function SobrePage() {
  return (
    <div className="flex flex-col">
      <section className="bg-brand-ink py-16 sm:py-24">
        <Container className="flex flex-col gap-6">
          <LogoFull dark className="mb-2 items-start text-left" />
          <Eyebrow>Quem somos</Eyebrow>
          <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Uma gestora criada para aproximar o sindicato do resultado que ele
            já tem direito
          </h1>
          <p className="max-w-2xl text-brand-ice/85">
            A GSBC — Gestora Sindical de Benefícios &amp; Compliance nasceu como
            uma nova frente de parceria com o movimento sindical: regularização
            extrajudicial, gestão de benefícios e tecnologia a serviço do
            trabalhador.
          </p>
        </Container>
      </section>

      <section className="py-16 sm:py-24">
        <Container className="flex flex-col gap-10">
          <SectionHeading title="Nossos valores" />
          <div className="grid gap-5 sm:grid-cols-3">
            {valores.map((item) => (
              <div
                key={item.title}
                className="flex flex-col gap-3 rounded-2xl border border-brand-ice bg-white p-6 shadow-sm"
              >
                <item.icon className="size-6 text-brand-teal" />
                <h3 className="text-base font-semibold text-brand-ink">
                  {item.title}
                </h3>
                <p className="text-sm text-brand-slate">{item.description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-brand-navy py-16 sm:py-24">
        <Container className="flex flex-col gap-10">
          <SectionHeading dark title="Roadmap da parceria" />
          <div className="grid gap-5 sm:grid-cols-3">
            {roadmap.map((item, index) => (
              <div
                key={item.fase}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-6"
              >
                <span className="text-sm font-semibold text-brand-gold">
                  0{index + 1}
                </span>
                <h3 className="text-base font-semibold text-white">
                  {item.fase}
                </h3>
                <p className="text-sm text-brand-ice/80">{item.descricao}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container className="flex flex-col items-center gap-5 text-center">
          <h2 className="max-w-xl text-2xl font-bold text-brand-ink sm:text-3xl">
            Vamos construir essa parceria
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
