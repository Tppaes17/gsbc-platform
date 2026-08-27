import { EmptyState } from "@/components/design-system/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollText } from "lucide-react";

interface DecisaoItem {
  id: string;
  policyNome: string;
  entityType: string;
  entityId: string;
  resultado: string;
  motivo: string;
  createdAt: string;
}

const RESULTADO_TONE: Record<string, string> = {
  aprovado: "text-emerald-600",
  aprovacao_necessaria: "text-amber-600",
  rejeitado: "text-red-600",
  work_item_criado: "text-amber-600",
  ativada: "text-emerald-600",
  desativada: "text-muted-foreground",
};

export function DecisoesList({ decisoes }: { decisoes: DecisaoItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Decisões recentes</CardTitle>
      </CardHeader>
      <CardContent>
        {decisoes.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="Nenhuma decisão registrada ainda"
            description="Cada vez que uma política avalia algo — um desconto, um pagamento, uma contestação — fica um registro aqui, explicando o porquê."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {decisoes.map((d) => (
              <li key={d.id} className="flex flex-col gap-0.5 border-b pb-2 text-sm last:border-b-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{d.policyNome}</span>
                  <span className={`text-xs font-medium ${RESULTADO_TONE[d.resultado] ?? "text-muted-foreground"}`}>
                    {d.resultado}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {d.motivo} · {d.entityType} · {new Date(d.createdAt).toLocaleString("pt-BR")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
