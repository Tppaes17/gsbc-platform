import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DecisionTone = "neutral" | "warning" | "critical";

export interface DecisionQueueItem {
  id: string;
  title: string;
  reason: string;
  href: string;
  source: string;
  risk: string;
  sla: string;
  owner: string;
  impact?: string;
  tone?: DecisionTone;
}

const toneClass: Record<DecisionTone, string> = {
  neutral: "border-border",
  warning: "border-warning/40 bg-warning/5",
  critical: "border-destructive/35 bg-destructive/5",
};

const iconByTone = {
  neutral: CheckCircle2,
  warning: Clock,
  critical: AlertTriangle,
};

export function DecisionQueue({ items }: { items: DecisionQueueItem[] }) {
  if (items.length === 0) {
    return (
      <section className="flex flex-col gap-2 border-y border-border-subtle py-4">
        <div className="flex max-w-2xl items-start gap-3">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-success/10 text-success">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold">Nenhuma decisão suportada pendente</h2>
            <p className="text-sm text-muted-foreground">
              Tarefas, aprovações e exceções aparecem aqui apenas quando existem objetos reais e
              autorizados no escopo atual.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3 border-y border-border-subtle py-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-warning/15 text-warning-foreground">
          <ShieldAlert className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold">Decisões e exceções agora</h2>
          <p className="text-sm text-muted-foreground">
            Itens reais que exigem escolha, revisão ou ação autorizada no escopo atual.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {items.map((item) => {
          const tone = item.tone ?? "neutral";
          const Icon = iconByTone[tone];

          return (
            <article
              key={item.id}
              className={cn("rounded-md border bg-card p-3", toneClass[tone])}
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 gap-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <div className="flex min-w-0 flex-col gap-1">
                    <h3 className="text-sm font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.reason}</p>
                    <dl className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <dt className="font-medium text-foreground">Risco</dt>
                        <dd>{item.risk}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-foreground">SLA</dt>
                        <dd>{item.sla}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-foreground">Owner</dt>
                        <dd>{item.owner}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-foreground">Fonte</dt>
                        <dd>{item.source}</dd>
                      </div>
                    </dl>
                    {item.impact ? (
                      <p className="text-xs font-medium tabular-nums text-foreground">
                        Impacto defensável: {item.impact}
                      </p>
                    ) : null}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<Link href={item.href}>Abrir contexto</Link>}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
