"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_GROUPS, type NavItem } from "./nav-items";

function canShowItem(
  item: NavItem,
  isPlatformStaff: boolean,
  isOwner: boolean,
) {
  return (
    (!item.requiresPlatformStaff || isPlatformStaff) && (!item.ownerOnly || isOwner)
  );
}

function isRouteActive(pathname: string, href: string) {
  if (href === "/backoffice") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({
  isPlatformStaff,
  isOwner,
  onNavigate,
}: {
  isPlatformStaff: boolean;
  isOwner: boolean;
  /** Chamado ao clicar num item — usado pela MobileSidebar pra fechar o
   * drawer após navegar. Mesma fonte de itens/permissão da sidebar
   * desktop (regra da Seção 14 do master prompt: nunca duplicar a regra
   * de navegação autorizada). */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) =>
      canShowItem(item, isPlatformStaff, isOwner),
    ),
  })).filter((group) => group.items.length > 0);

  return (
    <nav aria-label="Navegação do backoffice" className="flex flex-col gap-4">
      {groups.map((group) => {
        const hasActiveItem = group.items.some((item) =>
          isRouteActive(pathname, item.href),
        );

        return (
          <section key={group.id} aria-labelledby={`nav-group-${group.id}`}>
            <div
              id={`nav-group-${group.id}`}
              className={cn(
                "mb-1 px-3 text-[0.7rem] font-semibold leading-none tracking-normal",
                hasActiveItem ? "text-sidebar-foreground" : "text-muted-foreground",
              )}
            >
              {group.label}
            </div>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const isActive = isRouteActive(pathname, item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex min-h-8 items-center gap-2 rounded-md border border-transparent px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                      isActive
                        ? "border-sidebar-accent bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/82 hover:bg-sidebar-accent/55 hover:text-sidebar-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </nav>
  );
}
