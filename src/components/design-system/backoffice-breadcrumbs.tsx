"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/components/backoffice/nav-items";
import { cn } from "@/lib/utils";

const DOMAIN_BY_PREFIX: Record<string, string> = {
  "/backoffice/receita": "Receita",
  "/backoffice/prospectos": "Receita",
  "/backoffice/cobrancas": "Receita",
  "/backoffice/negociacoes": "Receita",
  "/backoffice/escalonamentos": "Receita",
  "/backoffice/empresas": "Compliance",
  "/backoffice/instrumentos": "Compliance",
  "/backoffice/contestacoes": "Compliance",
  "/backoffice/financeiro": "Financeiro",
  "/backoffice/conciliacao": "Financeiro",
  "/backoffice/contratos-financeiros": "Financeiro",
  "/backoffice/operacoes": "Operação",
  "/backoffice/politicas": "Governança",
  "/backoffice/usuarios": "Governança",
  "/backoffice/auditoria": "Governança",
  "/backoffice/sindicatos": "Governança",
};

function routeLabel(pathname: string) {
  const match = NAV_ITEMS.filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return match?.label ?? "Backoffice";
}

function domainLabel(pathname: string) {
  const match = Object.entries(DOMAIN_BY_PREFIX)
    .filter(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))
    .sort((a, b) => b[0].length - a[0].length)[0];

  return match?.[1] ?? "Visão Geral";
}

function isDetailPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  return segments.length > 2 && !["novo"].includes(segments.at(-1) ?? "");
}

export function BackofficeBreadcrumbs({ className }: { className?: string }) {
  const pathname = usePathname();

  if (pathname === "/backoffice") {
    return (
      <nav aria-label="Breadcrumb" className={cn("text-xs text-muted-foreground", className)}>
        <ol className="flex min-w-0 items-center gap-1">
          <li aria-current="page" className="truncate">Visão Geral</li>
        </ol>
      </nav>
    );
  }

  const label = routeLabel(pathname);
  const domain = domainLabel(pathname);
  const currentLabel = pathname.endsWith("/novo")
    ? "Novo"
    : isDetailPath(pathname)
      ? "Detalhe"
      : label;

  return (
    <nav aria-label="Breadcrumb" className={cn("text-xs text-muted-foreground", className)}>
      <ol className="flex min-w-0 items-center gap-1">
        <li className="hidden truncate sm:block">{domain}</li>
        <li aria-hidden="true" className="hidden sm:block">/</li>
        {currentLabel === label ? (
          <li aria-current="page" className="truncate text-foreground">{label}</li>
        ) : (
          <>
            <li className="truncate">
              <Link href={NAV_ITEMS.find((item) => item.label === label)?.href ?? "/backoffice"} className="hover:text-foreground">
                {label}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="truncate text-foreground">{currentLabel}</li>
          </>
        )}
      </ol>
    </nav>
  );
}
