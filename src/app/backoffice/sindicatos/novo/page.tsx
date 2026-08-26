import { redirect } from "next/navigation";
import { PageHeader } from "@/components/design-system/page-header";
import { requireCurrentUser } from "@/lib/auth/session";
import { SindicatoForm } from "./sindicato-form";

export default async function NovoSindicatoPage() {
  const user = await requireCurrentUser();
  if (!user.isPlatformStaff) {
    redirect("/backoffice/sindicatos");
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Novo sindicato"
        description="Cadastro cria o tenant e o perfil do sindicato. O onboarding inicia como pendente."
      />
      <SindicatoForm />
    </div>
  );
}
