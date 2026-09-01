import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PortalLoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Portal de Regularização Empresarial — GSBC",
};

export default function PortalLoginPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-screen items-center justify-center bg-muted/40 px-4"
    >
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">
            Portal de Regularização Empresarial
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Acesse as pendências da sua empresa com o Sindicato. Informe o
            e-mail cadastrado — enviaremos um link de acesso seguro e
            temporário.
          </p>
        </CardHeader>
        <CardContent>
          <PortalLoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
