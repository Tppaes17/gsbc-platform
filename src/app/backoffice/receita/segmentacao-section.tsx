import Link from "next/link";
import { Building } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/design-system/empty-state";

interface EmpresaSegmento {
  empresaId: string;
  nome: string;
  total: number;
  count: number;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function SegmentacaoSection({ porEmpresa }: { porEmpresa: EmpresaSegmento[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Segmentação por empresa</CardTitle>
      </CardHeader>
      <CardContent>
        {porEmpresa.length === 0 ? (
          <EmptyState
            icon={Building}
            title="Nenhuma cobrança ainda"
            description="A segmentação por empresa aparece assim que houver cobranças registradas."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {porEmpresa.map((item) => (
              <li key={item.empresaId}>
                <Link
                  href={`/backoffice/cobrancas?empresaId=${item.empresaId}`}
                  className="flex items-center justify-between gap-3 border-b py-2 text-sm last:border-b-0 hover:text-primary"
                >
                  <span className="font-medium">{item.nome}</span>
                  <span className="text-muted-foreground">
                    {formatCurrency(item.total)} · {item.count} cobrança(s)
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
