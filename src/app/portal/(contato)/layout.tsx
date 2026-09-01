import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentPortalContato } from "@/lib/auth/portal-session";
import { portalLogoutAction } from "../login/actions";

export default async function PortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  const contato = await getCurrentPortalContato();

  if (!contato) {
    redirect("/portal/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center justify-between border-b px-4 sm:px-6">
        <div>
          <p className="text-sm font-semibold">
            Portal de Regularização Empresarial
          </p>
          <p className="text-xs text-muted-foreground">{contato.empresaNome}</p>
        </div>
        <form action={portalLogoutAction}>
          <Button variant="ghost" size="sm" type="submit">
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </form>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-4xl flex-1 p-4 sm:p-6"
      >
        {children}
      </main>
    </div>
  );
}
