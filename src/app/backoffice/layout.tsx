import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { BackofficeContentFrame } from "@/components/backoffice/backoffice-content-frame";
import { SidebarNav } from "@/components/backoffice/sidebar-nav";
import { Topbar } from "@/components/backoffice/topbar";
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
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 overflow-y-auto border-r bg-sidebar p-4 md:flex md:flex-col md:gap-6">
        <div className="px-2">
          <p className="text-lg font-semibold text-sidebar-foreground">GSBC</p>
          <p className="text-xs text-muted-foreground">{tenantLabel}</p>
        </div>
        <SidebarNav isPlatformStaff={user.isPlatformStaff} isOwner={user.isOwner} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} tenantLabel={tenantLabel} />
        <main className="flex-1 overflow-x-auto p-4 sm:p-6">
          <BackofficeContentFrame>{children}</BackofficeContentFrame>
        </main>
      </div>
    </div>
  );
}
