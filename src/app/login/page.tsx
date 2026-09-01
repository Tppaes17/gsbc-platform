import type { Metadata } from "next";
import Image from "next/image";
import { ClipboardList, LockKeyhole, ShieldCheck } from "lucide-react";
import { SiteLogo } from "@/components/site/logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar — GSBC",
};

const PILARES = [
  {
    icon: ShieldCheck,
    label: "Isolamento por tenant e acesso por papel",
  },
  {
    icon: ClipboardList,
    label: "Cobrança, negociação e conciliação com histórico",
  },
  {
    icon: LockKeyhole,
    label: "Ações críticas com consequência antes da confirmação",
  },
];

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-brand-ink lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(202,214,222,0.12),_transparent_55%)]" />
        <div className="relative flex flex-col gap-10">
          <SiteLogo dark />
          <div className="flex flex-col gap-4">
            <span className="text-xs font-semibold tracking-[0.2em] text-brand-teal uppercase">
              Backoffice operacional
            </span>
            <h1 className="max-w-md text-3xl font-bold tracking-tight text-white">
              Entre na plataforma de compliance, receita e operação sindical
            </h1>
            <p className="max-w-sm text-base text-brand-ice/85">
              Acesso restrito para equipes autorizadas operarem entidades,
              obrigações, cobranças, pagamentos, políticas e auditoria no mesmo
              contexto.
            </p>
          </div>
          <div className="overflow-hidden rounded-lg border border-white/10 bg-white shadow-sm">
            <Image
              src="/product-proof/login-transition.png"
              alt="Tela real do produto GSBC usada como continuidade visual do login."
              width={1440}
              height={900}
              priority
              className="h-auto w-full"
              sizes="50vw"
            />
          </div>
        </div>

        <ul className="relative flex flex-col gap-4">
          {PILARES.map((pilar) => (
            <li
              key={pilar.label}
              className="flex items-center gap-3 text-sm text-brand-ice/90"
            >
              <pilar.icon className="h-4 w-4 shrink-0 text-brand-teal" />
              {pilar.label}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex items-center justify-center bg-muted/40 px-4 py-16">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <div className="flex flex-col gap-1 lg:hidden">
            <SiteLogo />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Entrar</CardTitle>
              <p className="text-sm text-muted-foreground">
                Acesse com sua conta institucional GSBC.
              </p>
            </CardHeader>
            <CardContent>
              <LoginForm />
            </CardContent>
          </Card>
          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            Ambiente de acesso restrito a usuários autorizados.
          </p>
        </div>
      </section>
    </div>
  );
}
