import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/design-system/page-header";
import { StatusBadge } from "@/components/design-system/status-badge";
import { Timeline, type TimelineItem } from "@/components/design-system/timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireCurrentUser } from "@/lib/auth/session";
import { isAiConfigured } from "@/lib/ai/client";
import { createClient } from "@/lib/supabase/server";
import {
  negociacaoEventoTipoOptions,
  negociacaoStatusOptions,
} from "@/lib/validation/negociacao";
import { DecidirDescontoDialog } from "./decidir-desconto-dialog";
import { EventoForm } from "./evento-form";
import { NegotiationCopilotSection } from "./negotiation-copilot-section";

const STATUS_LABEL = Object.fromEntries(
  negociacaoStatusOptions.map((o) => [o.value, o.label]),
);
const TIPO_LABEL = Object.fromEntries(
  negociacaoEventoTipoOptions.map((o) => [o.value, o.label]),
);

const STATUS_TONE: Record<string, "positive" | "neutral" | "warning" | "negative" | "info"> = {
  aberta: "info",
  em_negociacao: "warning",
  aceita: "positive",
  aguardando_aprovacao: "warning",
  recusada: "negative",
  encerrada: "neutral",
};

function formatCurrency(value: number | null) {
  if (value === null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function NegociacaoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireCurrentUser();
  const supabase = await createClient();

  const { data: negociacao } = await supabase
    .from("negociacoes")
    .select(
      "*, empresas(id, razao_social, nome_fantasia), tenants(name), cobrancas(id, valor_cobranca, obrigacoes(descricao)), users!negociacoes_responsavel_id_fkey(full_name)",
    )
    .eq("id", id)
    .single();

  if (!negociacao) {
    notFound();
  }

  const empresa = Array.isArray(negociacao.empresas)
    ? negociacao.empresas[0]
    : negociacao.empresas;
  const cobranca = Array.isArray(negociacao.cobrancas)
    ? negociacao.cobrancas[0]
    : negociacao.cobrancas;
  const obrigacao = Array.isArray(cobranca?.obrigacoes)
    ? cobranca?.obrigacoes[0]
    : cobranca?.obrigacoes;
  const responsavel = Array.isArray(negociacao.users)
    ? negociacao.users[0]
    : negociacao.users;

  const { data: eventos } = await supabase
    .from("negociacao_eventos")
    .select("id, tipo, valor, condicoes, created_at, users(full_name)")
    .eq("negociacao_id", id)
    .order("created_at", { ascending: false });

  const timelineItems: TimelineItem[] = (eventos ?? []).map((evento) => {
    const author = Array.isArray(evento.users) ? evento.users[0] : evento.users;
    const valorLabel = evento.valor !== null ? formatCurrency(evento.valor) : null;
    const label = [TIPO_LABEL[evento.tipo] ?? evento.tipo, valorLabel]
      .filter(Boolean)
      .join(" — ");
    const description = [evento.condicoes, author ? `por ${author.full_name}` : null]
      .filter(Boolean)
      .join(" · ");
    return {
      id: evento.id,
      label,
      description: description || undefined,
      timestamp: evento.created_at,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={empresa?.nome_fantasia ?? empresa?.razao_social ?? "Negociação"}
        description={`${obrigacao?.descricao ?? "—"} · ${negociacao.tenants?.name ?? "—"}`}
        actions={
          user.isPlatformStaff && negociacao.status !== "aguardando_aprovacao" ? (
            <EventoForm negociacaoId={negociacao.id} />
          ) : undefined
        }
      />

      {negociacao.status === "aguardando_aprovacao" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed p-3 text-sm">
          <div>
            <p className="font-medium">Aguardando aprovação de desconto (STG-11 — Policy Engine)</p>
            <p className="text-xs text-muted-foreground">
              O valor aceito é menor que o valor original da cobrança — a política &quot;Desconto
              exige aprovação&quot; exige que o Owner decida antes de virar acordo firmado.
            </p>
          </div>
          {user.isOwner ? (
            <div className="flex gap-2">
              <DecidirDescontoDialog negociacaoId={negociacao.id} aprovado={true} />
              <DecidirDescontoDialog negociacaoId={negociacao.id} aprovado={false} />
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Aguardando decisão do Owner.</span>
          )}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <StatusBadge
            label={STATUS_LABEL[negociacao.status] ?? negociacao.status}
            tone={STATUS_TONE[negociacao.status] ?? "neutral"}
          />
        </div>
        <div className="text-sm text-muted-foreground">
          Valor original da cobrança:{" "}
          <span className="font-medium text-foreground">
            {formatCurrency(cobranca?.valor_cobranca ?? null)}
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
          Valor negociado atual:{" "}
          <span className="font-medium text-foreground">
            {formatCurrency(negociacao.valor_atual)}
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
          Responsável:{" "}
          <span className="font-medium text-foreground">
            {responsavel?.full_name ?? "Sem responsável definido"}
          </span>
        </div>
        {cobranca ? (
          <Link
            href={`/backoffice/cobrancas/${cobranca.id}`}
            className="text-sm text-primary hover:underline"
          >
            Ver cobrança de origem
          </Link>
        ) : null}
        {empresa ? (
          <Link
            href={`/backoffice/empresas/${empresa.id}`}
            className="text-sm text-primary hover:underline"
          >
            Ver ficha da empresa
          </Link>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <Timeline items={timelineItems} />
        </CardContent>
      </Card>

      {user.isPlatformStaff ? (
        <NegotiationCopilotSection negociacaoId={negociacao.id} aiConfigured={isAiConfigured()} />
      ) : null}
    </div>
  );
}
