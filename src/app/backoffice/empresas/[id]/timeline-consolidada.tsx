import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Timeline, type TimelineItem } from "@/components/design-system/timeline";

/**
 * Linha do tempo unificada da ficha 360º (regra 25 — "a plataforma
 * registra"): junta obrigações, eventos de cobrança, eventos de
 * negociação e pagamentos num único feed cronológico, sem nova tabela —
 * é uma composição das timelines por entidade já existentes.
 */
export function TimelineConsolidada({ items }: { items: TimelineItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Timeline consolidada</CardTitle>
      </CardHeader>
      <CardContent>
        <Timeline items={items} />
      </CardContent>
    </Card>
  );
}
