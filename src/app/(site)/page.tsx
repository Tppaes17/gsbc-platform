import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Building2,
  CheckCircle2,
  ClipboardList,
  LayoutDashboard,
  LockKeyhole,
  Receipt,
  Scale,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, Eyebrow, SectionHeading } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "GSBC — Plataforma para compliance, receita e operação sindical",
  description:
    "Plataforma SaaS B2B multi-tenant para entidades sindicais operarem compliance, cobrança, negociação, conciliação, governança e auditoria.",
};

const productProofs = [
  {
    title: "Command Center executivo",
    description:
      "Receita identificada, exposição em cobrança, negociações abertas, aging e decisões operacionais em uma visão governada.",
    image: "/product-proof/executive-command-center.png",
    alt: "Tela real do Executive Command Center do GSBC com indicadores de receita, cobrança e operação.",
  },
  {
    title: "Workspace da empresa",
    description:
      "Empresa, instrumentos, obrigações, cobranças, contatos, documentos e histórico reunidos no mesmo contexto operacional.",
    image: "/product-proof/empresa-workspace.png",
    alt: "Tela real do workspace de empresa no GSBC com relações operacionais e histórico.",
  },
  {
    title: "Cobranças em alta escala",
    description:
      "Grid operacional com filtros, status, prioridade, valores e navegação para detalhe sem perder rastreabilidade.",
    image: "/product-proof/cobrancas-enterprise-grid.png",
    alt: "Tela real da lista de cobranças do GSBC em formato de grid operacional.",
  },
  {
    title: "Ações críticas com consequência",
    description:
      "Pagamento manual, notificação e escalonamento exibem impacto, não efeito, reversibilidade e auditoria antes da confirmação.",
    image: "/product-proof/critical-workflow-payment.png",
    alt: "Tela real de confirmação crítica de pagamento manual no GSBC.",
  },
];

const capabilities = [
  {
    icon: Building2,
    title: "Compliance",
    description:
      "Empresas, instrumentos coletivos, obrigações, evidências e histórico preservados por entidade e contexto.",
  },
  {
    icon: Receipt,
    title: "Revenue Operations",
    description:
      "Cobranças, régua operacional, negociações, contestações e escalonamentos tratados como workflows rastreáveis.",
  },
  {
    icon: Banknote,
    title: "Financial Operations",
    description:
      "Pagamentos, conciliação, divergências, eventos compensatórios e repasses com idempotência e revisão manual quando necessário.",
  },
  {
    icon: ShieldCheck,
    title: "Governance",
    description:
      "Permissões por papel, trilha de auditoria, políticas versionadas e isolamento entre tenants como regra estrutural.",
  },
  {
    icon: LayoutDashboard,
    title: "Executive Intelligence",
    description:
      "Indicadores suportados por dados atuais do sistema para priorizar cobrança, exposição vencida e filas de decisão.",
  },
];

const workflowSteps = [
  "Estruturar entidades, instrumentos e obrigações com fonte e contexto.",
  "Operar cobranças, negociações, contestações e escalonamentos com histórico.",
  "Registrar pagamentos, reprocessar conciliações e tratar exceções financeiras.",
  "Governar permissões, políticas, auditoria e evidências sem depender de planilhas paralelas.",
];

const audiences = [
  "Presidência e diretoria",
  "Financeiro",
  "Jurídico",
  "Compliance e operação",
  "Administração sindical",
];

const faqs = [
  {
    question: "A GSBC é consultoria ou software?",
    answer:
      "É uma plataforma SaaS B2B vertical, operada com governança para entidades sindicais. Serviços e implantação podem apoiar o uso, mas a experiência principal é produto.",
  },
  {
    question: "Empresas são tenants?",
    answer:
      "Não no escopo atual. Empresas são objetos de enquadramento, compliance, cobrança e relacionamento dentro do tenant da entidade sindical.",
  },
  {
    question: "Uma cobrança significa dívida reconhecida?",
    answer:
      "Não automaticamente. Obrigação, cobrança, acordo, pagamento, baixa e quitação permanecem estados distintos e rastreáveis.",
  },
  {
    question: "A IA executa decisões críticas?",
    answer:
      "Não. Recursos assistivos podem sugerir leitura, prioridade ou rascunho, sempre subordinados à autorização humana e às políticas do sistema.",
  },
];

function ProductProofCard({
  proof,
  priority = false,
}: {
  proof: (typeof productProofs)[number];
  priority?: boolean;
}) {
  return (
    <article className="grid gap-4 border-t border-brand-ice/70 py-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold text-brand-ink">{proof.title}</h3>
        <p className="text-sm leading-6 text-brand-slate">
          {proof.description}
        </p>
      </div>
      <div className="overflow-hidden rounded-lg border border-brand-ice bg-white shadow-sm">
        <Image
          src={proof.image}
          alt={proof.alt}
          width={1440}
          height={900}
          priority={priority}
          className="h-auto w-full"
          sizes="(min-width: 1024px) 620px, 100vw"
        />
      </div>
    </article>
  );
}

export default function HomePage() {
  return (
    <div className="flex flex-col bg-white">
      <section className="relative min-h-[calc(100svh-4rem)] overflow-hidden bg-brand-ink text-white">
        <Image
          src="/product-proof/executive-command-center.png"
          alt="Tela real do produto GSBC mostrando o Command Center executivo."
          fill
          priority
          className="object-cover object-left-top opacity-40"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-brand-ink/78" />
        <Container className="relative flex min-h-[calc(100svh-4rem)] flex-col justify-center gap-8 py-14 sm:py-18 lg:py-20">
          <div className="flex max-w-3xl flex-col gap-5">
            <Eyebrow>Plataforma SaaS para entidades sindicais</Eyebrow>
            <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
              Compliance, receita e operação sindical em uma plataforma
              governada
            </h1>
            <p className="max-w-2xl text-base leading-7 text-brand-ice sm:text-lg">
              O GSBC organiza empresas, instrumentos, obrigações, cobranças,
              negociações, pagamentos e auditoria para que diretoria,
              financeiro, jurídico e operação trabalhem sobre o mesmo contexto.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
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
            <Button
              size="lg"
              variant="outline"
              className="border-white/40 bg-transparent text-white hover:bg-white/10"
              nativeButton={false}
              render={<Link href="#produto">Ver produto</Link>}
            />
          </div>
          <div className="grid max-w-3xl gap-3 text-sm text-brand-ice sm:grid-cols-3">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-brand-teal" />
              Multi-tenant
            </span>
            <span className="inline-flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-brand-teal" />
              Histórico auditável
            </span>
            <span className="inline-flex items-center gap-2">
              <Scale className="h-4 w-4 text-brand-teal" />
              Decisão humana
            </span>
          </div>
        </Container>
      </section>

      <section id="produto" className="py-14 sm:py-20">
        <Container className="flex flex-col gap-8">
          <SectionHeading
            eyebrow="Produto em primeiro plano"
            title="Telas reais, dados demo e capacidades suportadas"
            description="As imagens abaixo vêm do ambiente de demonstração usado nos testes automatizados. Elas provam o produto atual; não representam uma feature futura."
          />
          <div className="flex flex-col">
            {productProofs.map((proof, index) => (
              <ProductProofCard
                key={proof.title}
                proof={proof}
                priority={index === 0}
              />
            ))}
          </div>
        </Container>
      </section>

      <section
        id="capacidades"
        className="border-y border-brand-ice/70 bg-brand-ice/20 py-14 sm:py-20"
      >
        <Container className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeading
            eyebrow="Arquitetura de capacidades"
            title="Cobrança é motor; a plataforma é mais ampla"
            description="O GSBC conecta compliance, operação de receita, financeiro e governança sem tratar oportunidade, obrigação, cobrança, acordo ou pagamento como a mesma coisa."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {capabilities.map((capability) => (
              <article
                key={capability.title}
                className="border-t border-brand-ice pt-4"
              >
                <capability.icon className="mb-3 h-5 w-5 text-brand-teal" />
                <h3 className="text-base font-semibold text-brand-ink">
                  {capability.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-brand-slate">
                  {capability.description}
                </p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section id="operacao" className="py-14 sm:py-20">
        <Container className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div className="flex flex-col gap-6">
            <SectionHeading
              eyebrow="Como a operação flui"
              title="Fragmentação vira contexto, contexto vira decisão"
              description="Planilhas, e-mails e controles paralelos cedem lugar a workflows com estado, evidência e auditoria."
            />
            <ol className="grid gap-4">
              {workflowSteps.map((step, index) => (
                <li
                  key={step}
                  className="flex gap-3 border-t border-brand-ice pt-4 text-sm leading-6 text-brand-navy"
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-navy text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
          <div className="overflow-hidden rounded-lg border border-brand-ice bg-white shadow-sm">
            <Image
              src="/product-proof/critical-workflow-notification.png"
              alt="Tela real de revisão antes de envio de notificação no GSBC."
              width={1440}
              height={900}
              className="h-auto w-full"
              sizes="(min-width: 1024px) 520px, 100vw"
            />
          </div>
        </Container>
      </section>

      <section
        id="seguranca"
        className="bg-brand-ink py-14 text-white sm:py-20"
      >
        <Container className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionHeading
            dark
            eyebrow="Governança e segurança"
            title="Isolamento, permissão e auditoria como estrutura"
            description="A segurança multi-tenant existe no servidor e no banco. A interface reflete permissões, mas não é a barreira final de proteção."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              [
                "Tenant isolation",
                "Cada entidade contratante opera em escopo de tenant próprio.",
              ],
              [
                "Role-aware access",
                "Menus, ações e rotas respeitam permissões e falham fechados.",
              ],
              [
                "Audit trail",
                "Eventos críticos preservam ator, objeto, ação e resultado.",
              ],
              [
                "External effects",
                "Retries e webhooks financeiros são tratados com idempotência.",
              ],
            ].map(([title, description]) => (
              <article key={title} className="border-t border-white/15 pt-4">
                <LockKeyhole className="mb-3 h-5 w-5 text-brand-gold" />
                <h3 className="text-base font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-brand-ice/85">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-14 sm:py-20">
        <Container className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeading
            eyebrow="Para quem"
            title="Uma mesma plataforma para papéis diferentes"
            description="Diretoria acompanha exposição e decisões; financeiro trabalha pagamentos e conciliação; jurídico e compliance preservam evidência, política e trilha de decisão."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {audiences.map((audience) => (
              <div
                key={audience}
                className="flex items-center gap-3 border-t border-brand-ice py-4 text-sm font-medium text-brand-navy"
              >
                <Users className="h-4 w-4 text-brand-teal" />
                {audience}
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-y border-brand-ice/70 bg-brand-ice/20 py-14 sm:py-20">
        <Container className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionHeading
            eyebrow="Implantação"
            title="Antes de operar, o tenant precisa estar pronto"
            description="Configuração, usuários, instrumentos, políticas, templates e contratos passam por readiness antes de cobrança real, comunicação externa ou movimentação financeira."
          />
          <div className="grid gap-3">
            {[
              "Configuração acompanhada pela GSBC.",
              "Validação de usuários, permissões e autoridades.",
              "Instrumentos, obrigações e políticas com fonte rastreável.",
              "Ativação somente após readiness operacional.",
            ].map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 text-sm leading-6 text-brand-navy"
              >
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-brand-teal" />
                {item}
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section id="faq" className="py-14 sm:py-20">
        <Container className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeading
            eyebrow="Perguntas frequentes"
            title="Precisão antes de promessa"
            description="As respostas abaixo seguem os limites atuais do produto e distinguem operação, evidência, decisão humana e efeito financeiro."
          />
          <div className="grid gap-5">
            {faqs.map((item) => (
              <article
                key={item.question}
                className="border-t border-brand-ice pt-5"
              >
                <h3 className="flex items-center gap-2 text-base font-semibold text-brand-ink">
                  <BadgeCheck className="h-4 w-4 text-brand-teal" />
                  {item.question}
                </h3>
                <p className="mt-2 text-sm leading-6 text-brand-slate">
                  {item.answer}
                </p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-brand-navy py-14 text-white sm:py-20">
        <Container className="flex flex-col gap-6">
          <Eyebrow>Próximo passo</Eyebrow>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-semibold leading-tight text-white sm:text-4xl">
                Veja o GSBC operando sobre um fluxo sindical realista
              </h2>
              <p className="mt-3 text-base leading-7 text-brand-ice">
                A demonstração mostra produto, governança, cobrança, conciliação
                e auditoria com dados demo e sem prometer automações futuras
                como se já fossem atuais.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="bg-brand-gold text-brand-ink hover:bg-brand-gold-light"
                nativeButton={false}
                render={<Link href="/diagnostico">Solicitar demonstração</Link>}
              />
              <Button
                size="lg"
                variant="outline"
                className="border-white/40 bg-transparent text-white hover:bg-white/10"
                nativeButton={false}
                render={<Link href="/login">Entrar na plataforma</Link>}
              />
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
