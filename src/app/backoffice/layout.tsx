import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { MobileSidebar } from "@/components/backoffice/mobile-sidebar";
import { SidebarNav } from "@/components/backoffice/sidebar-nav";
import { UserMenu } from "@/components/backoffice/user-menu";
import { getCurrentUser } from "@/lib/auth/session";

export default async function BackofficeLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.memberships.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <div className="flex max-w-md flex-col gap-2">
          <h1 className="text-lg font-semibold">Acesso ainda não liberado</h1>
          <p className="text-sm text-muted-foreground">
            Sua conta foi autenticada, mas ainda não possui vínculo (membership)
            com nenhum sindicato ou com a GSBC. Contate um administrador para
            liberar seu acesso.
          </p>
        </div>
      </div>
    );
  }

  const tenantLabel = user.isPlatformStaff
    ? "Backoffice GSBC"
    : (user.memberships[0]?.tenantName ?? "Portal do Sindicato");

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r bg-sidebar p-4 md:flex md:flex-col md:gap-6">
        <div className="px-2">
          <p className="text-lg font-semibold text-sidebar-foreground">GSBC</p>
          <p className="text-xs text-muted-foreground">{tenantLabel}</p>
        </div>
        <SidebarNav isPlatformStaff={user.isPlatformStaff} isOwner={user.isOwner} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <MobileSidebar
            isPlatformStaff={user.isPlatformStaff}
            isOwner={user.isOwner}
            tenantLabel={tenantLabel}
          />
          <p className="text-sm font-medium md:hidden">GSBC</p>
          <div className="ml-auto">
            <UserMenu user={user} />
          </div>
        </header>
        <main className="flex-1 overflow-x-auto p-6">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
