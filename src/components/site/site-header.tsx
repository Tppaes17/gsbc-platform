"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteLogo } from "./logo";
import { siteNavItems } from "./nav-items";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-brand-ice/60 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" onClick={() => setOpen(false)}>
          <SiteLogo />
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {siteNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm font-medium text-brand-navy transition-colors hover:text-brand-teal",
                pathname === item.href && "text-brand-teal",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Button
            variant="ghost"
            nativeButton={false}
            render={<Link href="/login">Entrar</Link>}
          />
          <Button
            className="bg-brand-gold text-brand-ink hover:bg-brand-gold-light"
            nativeButton={false}
            render={<Link href="/diagnostico">Solicitar demonstração</Link>}
          />
        </div>

        <button
          type="button"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          className="inline-flex size-9 items-center justify-center rounded-lg text-brand-navy lg:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-brand-ice/60 bg-white px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-1">
            {siteNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-md px-2 py-2 text-sm font-medium text-brand-navy hover:bg-brand-ice/40",
                  pathname === item.href && "text-brand-teal",
                )}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/contato"
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-2 text-sm font-medium text-brand-navy hover:bg-brand-ice/40"
            >
              Contato
            </Link>
          </nav>
          <div className="mt-3 flex flex-col gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/login">Entrar</Link>}
            />
            <Button
              className="bg-brand-gold text-brand-ink hover:bg-brand-gold-light"
              nativeButton={false}
              render={<Link href="/diagnostico">Solicitar demonstração</Link>}
            />
          </div>
        </div>
      ) : null}
    </header>
  );
}
