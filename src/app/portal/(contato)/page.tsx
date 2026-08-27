import Link from "next/link";
import { FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/design-system/empty-state";
import { StatusBadge } from "@/components/design-system/status-badge";
import { requireCurrentPortalContato } from "@/lib/auth/portal-session";
import { createClient } from "@/lib/supabase/server";

// Rascunho/aguardando validação são estágios internos de preparo da
// cobrança — a empresa só vê depois que a GSBC aprovou (mesmo raciocínio
// do gate de início da régua de cobrança, Rodada 19).
const STATUS_OCULTOS_DA_EMPRESA = new Set(["draft", "pending_validation"]);

const STATUS_LABEL: Record<string, string> = {
  approved: "Aprovada",
  notified: "Notificada",
  contacted: "Em contato",
  negotiating: "Em negociação",
  agreement_reached: "Acordo firmado",
  partially_paid: "Parcialmente paga",
  paid: "Paga",
  overdue: "Vencida",
  suspended: "Suspensa",
  cancelled: "Cancelada",
  legal_escalation: "Escalada jurídica",
  closed: "Encerrada",
  contestada: "Contestada",
};

const STATUS_TONE: Record<string, "positive" | "neutral" | "warning" | "negative" | "info"> = {
  approved: "info",
  notified: "info",
  contacted: "info",
  negotiating: "warning",
  agreement_reached: "positive",
  partially_paid: "warning",
  paid: "positive",
  overdue: "negative",
  suspended: "neutral",
  cancelled: "neutral",
  legal_escalation: "negative",
  closed: "neutral",
  contestada: "warning",
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

export default async function PortalDashboardPage() {
  const contato = await requireCurrentPortalContato();
  const supabase = await createClient();

  const { data } = await supabase
    .from("cobrancas")
    .select("id, valor_cobranca, vencimento, status, obrigacoes(descricao)")
    .eq("empresa_id", contato.empresaId)
    .order("vencimento", { ascending: true });

  const cobrancas = (data ?? []).filter((c) => !STATUS_OCULTOS_DA_EMPRESA.has(c.status));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Olá, {contato.nome}</h1>
        <p className="text-sm text-muted-foreground">
          Pendências de {contato.empresaNome} junto ao Sindicato.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Cobranças</CardTitle>
        </CardHeader>
        <CardContent>
          {cobrancas.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Nenhuma pendência no momento"
              description="Quando houver uma cobrança em andamento, ela aparece aqui."
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {cobrancas.map((c) => {
                const obrigacao = Array.isArray(c.obrigacoes) ? c.obrigacoes[0] : c.obrigacoes;
                return (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-3 border-b pb-3 text-sm last:border-b-0 last:pb-0"
                  >
                    <Link href={`/portal/cobrancas/${c.id}`} className="flex flex-col">
                      <span className="font-medium hover:underline">
                        {obrigacao?.descricao ?? "Cobrança"}
                      </span>
                      <span className="text-muted-foreground">
                        Vencimento: {formatDate(c.vencimento)}
                      </span>
                    </Link>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{formatCurrency(c.valor_cobranca)}</span>
                      <StatusBadge
                        label={STATUS_LABEL[c.status] ?? c.status}
                        tone={STATUS_TONE[c.status] ?? "neutral"}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
