import { notFound } from "next/navigation";
import { PageHeader } from "@/components/design-system/page-header";
import { StatusBadge } from "@/components/design-system/status-badge";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { EditSindicatoForm } from "./edit-sindicato-form";
import { OnboardingAction } from "./onboarding-action";

export default async function SindicatoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireCurrentUser();
  const supabase = await createClient();

  const { data: sindicato } = await supabase
    .from("sindicatos")
    .select("*, tenants(onboarding_status)")
    .eq("tenant_id", id)
    .single();

  if (!sindicato) {
    notFound();
  }

  const onboardingStatus = sindicato.tenants?.onboarding_status ?? "onboarding";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={sindicato.nome_fantasia ?? sindicato.razao_social}
        description={sindicato.razao_social}
        actions={
          user.isPlatformStaff && onboardingStatus === "onboarding" ? (
            <OnboardingAction tenantId={id} />
          ) : undefined
        }
      />

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Onboarding:</span>
        <StatusBadge
          label={onboardingStatus === "active" ? "Implantado" : "Em onboarding"}
          tone={onboardingStatus === "active" ? "positive" : "warning"}
        />
      </div>

      <EditSindicatoForm sindicato={sindicato} readOnly={!user.isPlatformStaff} />
    </div>
  );
}
