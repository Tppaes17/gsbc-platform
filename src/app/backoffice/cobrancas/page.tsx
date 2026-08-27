import Link from "next/link";
import { X } from "lucide-react";
import { PageHeader } from "@/components/design-system/page-header";
import { requireCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { cobrancaStatusOptions } from "@/lib/validation/cobranca";
import type { CobrancaStatus } from "@/types/database.types";
import { CobrancasTable } from "./cobrancas-table";

const STATUS_LABEL: Record<string, string> = {
  ...Object.fromEntries(cobrancaStatusOptions.map((o) => [o.value, o.label])),
  contestada: "Contestada",
};

export default async function CobrancasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; empresaId?: string }>;
}) {
  const { status, empresaId } = await searchParams;
  const user = await requireCurrentUser();
  const supabase = await createClient();

  // Aceita uma lista separada por vírgula (drill-down do Revenue Command
  // Center, STG-08, onde um KPI como "validada" cobre vários status de
  // uma vez — ex. status=approved,notified,contacted). Vem de um link
  // interno nosso, não de input de usuário digitado; um valor inválido
  // aqui só resulta em 0 linhas, nunca num risco de segurança.
  const statusList = (status ? status.split(",").filter(Boolean) : []) as CobrancaStatus[];

  let query = supabase
    .from("cobrancas")
    .select("*, empresas(razao_social, nome_fantasia), tenants(name)")
    .order("vencimento");

  if (statusList.length === 1) query = query.eq("status", statusList[0]);
  else if (statusList.length > 1) query = query.in("status", statusList);
  if (empresaId) query = query.eq("empresa_id", empresaId);

  const { data } = await query;

  const filtroAtivo = status || empresaId;
  const statusLabelTexto = statusList.map((s) => STATUS_LABEL[s] ?? s).join(", ");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cobranças"
        description="Ações de regularização geradas a partir de obrigações. Cobranças nascem a partir de uma obrigação — veja Instrumentos ou a ficha da empresa."
      />
      {filtroAtivo ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            Filtrado {statusList.length > 0 ? `por status "${statusLabelTexto}"` : ""}
            {statusList.length > 0 && empresaId ? " e " : ""}
            {empresaId ? "por empresa" : ""} — {data?.length ?? 0} resultado(s).
          </span>
          <Link href="/backoffice/cobrancas" className="flex items-center gap-1 text-primary hover:underline">
            <X className="h-3 w-3" />
            Limpar filtro
          </Link>
        </div>
      ) : null}
      <CobrancasTable data={data ?? []} showTenantColumn={user.isPlatformStaff} />
    </div>
  );
}
