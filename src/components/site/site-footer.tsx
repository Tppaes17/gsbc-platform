import Link from "next/link";
import { SiteLogo } from "./logo";
import { siteNavItems } from "./nav-items";

export function SiteFooter() {
  return (
    <footer className="bg-brand-ink text-brand-ice">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-14 sm:px-6 lg:flex-row lg:justify-between">
        <div className="flex max-w-sm flex-col gap-4">
          <SiteLogo dark />
          <p className="text-sm text-brand-ice/80">
            Regularização extrajudicial, gestão de benefícios e tecnologia a
            serviço do trabalhador — uma nova frente de parceria com o
            movimento sindical.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold tracking-wider text-white uppercase">
              Navegação
            </span>
            {siteNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-brand-ice/80 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold tracking-wider text-white uppercase">
              Parceria
            </span>
            <Link href="/diagnostico" className="text-sm text-brand-ice/80 hover:text-white">
              Diagnóstico gratuito
            </Link>
            <Link href="/contato" className="text-sm text-brand-ice/80 hover:text-white">
              Contato
            </Link>
            <Link href="/login" className="text-sm text-brand-ice/80 hover:text-white">
              Acessar plataforma
            </Link>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold tracking-wider text-white uppercase">
              Contato
            </span>
            <a
              href="mailto:contato@gsbc.com.br"
              className="text-sm text-brand-ice/80 hover:text-white"
            >
              contato@gsbc.com.br
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-5 text-center text-xs text-brand-ice/60 sm:px-6">
        © {new Date().getFullYear()} GSBC — Gestora Sindical de Benefícios &amp;
        Compliance. Todos os direitos reservados.
      </div>
    </footer>
  );
}
