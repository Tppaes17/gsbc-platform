import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Handshake,
  Receipt,
  ScaleIcon,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RevenueKpis } from "@/lib/revenue/kpis";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const VALIDADA_STATUS =
  "approved,notified,contacted,negotiating,agreement_reached,partially_paid,paid,overdue,suspended,cancelled,legal_escalation,closed,contestada";

interface KpiDef {
  key: keyof RevenueKpis;
  label: string;
  icon: typeof Search;
  statusFilter: string | null;
  href?: string;
  tone?: "default" | "positive" | "warning" | "negative";
}

const KPI_DEFS: KpiDef[] = [
  {
    key: "identificada",
    label: "Receita identificada",
    icon: Search,
    statusFilter: null,
    href: "/backoffice/receita#segmentacao-receita",
  },
  { key: "validada", label: "Receita validada", icon: ShieldCheck, statusFilter: VALIDADA_STATUS },
  { key: "emCobranca", label: "Receita em cobrança", icon: Receipt, statusFilter: "approved,notified,contacted" },
  { key: "emNegociacao", label: "Receita em negociação", icon: Handshake, statusFilter: "negotiating" },
  { key: "acordada", label: "Receita acordada", icon: CheckCircle2, statusFilter: "agreement_reached", tone: "positive" },
  { key: "recebida", label: "Receita recebida", icon: CircleDollarSign, statusFilter: "paid,partially_paid", tone: "positive" },
  { key: "vencida", label: "Receita vencida", icon: AlertTriangle, statusFilter: "overdue", tone: "negative" },
  { key: "contestada", label: "Receita contestada", icon: ScaleIcon, statusFilter: "contestada", tone: "warning" },
];

const TONE_CLASS: Record<NonNullable<KpiDef["tone"]>, string> = {
  default: "text-foreground",
  positive: "text-success",
  warning: "text-warning",
  negative: "text-destructive",
};

export function KpiGrid({ kpis }: { kpis: RevenueKpis }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {KPI_DEFS.map((def) => {
        const Icon = def.icon;
        const valor = kpis[def.key];
        const card = (
          <Card className={def.statusFilter ? "transition-colors hover:border-primary/50" : undefined}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{def.label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-semibold ${TONE_CLASS[def.tone ?? "default"]}`}>
                {formatCurrency(valor)}
              </div>
            </CardContent>
          </Card>
        );

        if (!def.statusFilter) {
          return def.href ? (
            <Link key={def.key} href={def.href}>
              {card}
            </Link>
          ) : (
            <div key={def.key}>{card}</div>
          );
        }

        return (
          <Link key={def.key} href={`/backoffice/cobrancas?status=${def.statusFilter}`}>
            {card}
          </Link>
        );
      })}
    </div>
  );
}
