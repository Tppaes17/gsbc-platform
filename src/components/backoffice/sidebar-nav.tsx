"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";

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

  const items = NAV_ITEMS.filter(
    (item) =>
      (!item.requiresPlatformStaff || isPlatformStaff) && (!item.ownerOnly || isOwner),
  );

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const isActive =
          item.href === "/backoffice"
            ? pathname === item.href
            : pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/60",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
