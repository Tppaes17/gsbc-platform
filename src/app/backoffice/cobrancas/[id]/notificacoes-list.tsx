import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/design-system/status-badge";

interface NotificacaoItem {
  id: string;
  destinatario_email: string;
  assunto: string;
  status: string;
  erro: string | null;
  created_at: string;
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotificacoesList({ notificacoes }: { notificacoes: NotificacaoItem[] }) {
  if (notificacoes.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Notificações enviadas</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-3">
          {notificacoes.map((n) => (
            <li
              key={n.id}
              className="flex flex-col gap-1 border-b pb-3 text-sm last:border-b-0 last:pb-0"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{n.destinatario_email}</span>
                <StatusBadge
                  label={n.status === "enviada" ? "Enviada" : "Falha"}
                  tone={n.status === "enviada" ? "positive" : "negative"}
                />
              </div>
              <span className="text-muted-foreground">
                {formatTimestamp(n.created_at)}
                {n.erro ? ` · ${n.erro}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
