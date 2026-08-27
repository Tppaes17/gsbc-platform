"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/design-system/empty-state";
import { TrendingUp } from "lucide-react";
import type { MonthlyTrendPoint } from "@/lib/revenue/trend";

function formatCurrencyCompact(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", notation: "compact" });
}

export function TrendChart({ data }: { data: MonthlyTrendPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          Tendência mensal — previsto x realizado
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="Sem dados suficientes ainda"
            description="A tendência aparece assim que houver cobranças com vencimento e/ou pagamentos registrados."
          />
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="monthLabel" className="text-xs" />
                <YAxis tickFormatter={formatCurrencyCompact} className="text-xs" width={70} />
                <Tooltip
                  formatter={(value) => formatCurrencyCompact(Number(value))}
                  contentStyle={{ fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="previsto" name="Previsto (vencimento)" fill="var(--color-info, #60a5fa)" />
                <Bar dataKey="realizado" name="Realizado (pago no mês)" fill="var(--color-success, #34d399)" />
                <Line
                  type="monotone"
                  dataKey="realizadoAcumulado"
                  name="Realizado acumulado"
                  stroke="var(--color-primary, #1e2761)"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
