"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Building, CalendarDays, FileText, ListFilter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/design-system/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  EmpresaSegment,
  ObrigacaoSegment,
  PeriodoSegment,
  StatusSegment,
} from "@/lib/revenue/segments";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function SegmentList<T>({
  items,
  empty,
  children,
}: {
  items: T[];
  empty: { icon: typeof Building; title: string; description: string };
  children: (item: T) => ReactNode;
}) {
  if (items.length === 0) {
    return <EmptyState icon={empty.icon} title={empty.title} description={empty.description} />;
  }

  return <ul className="flex flex-col gap-2">{items.map(children)}</ul>;
}

export function SegmentacaoSection({
  porEmpresa,
  porObrigacao,
  porPeriodo,
  porStatus,
}: {
  porEmpresa: EmpresaSegment[];
  porObrigacao: ObrigacaoSegment[];
  porPeriodo: PeriodoSegment[];
  porStatus: StatusSegment[];
}) {
  return (
    <Card id="segmentacao-receita">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Segmentação de receita</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="empresa">
          <TabsList className="flex h-auto w-full flex-wrap justify-start">
            <TabsTrigger value="empresa">
              <Building className="h-4 w-4" />
              Empresa
            </TabsTrigger>
            <TabsTrigger value="obrigacao">
              <FileText className="h-4 w-4" />
              Obrigação
            </TabsTrigger>
            <TabsTrigger value="periodo">
              <CalendarDays className="h-4 w-4" />
              Período
            </TabsTrigger>
            <TabsTrigger value="status">
              <ListFilter className="h-4 w-4" />
              Status
            </TabsTrigger>
          </TabsList>

          <TabsContent value="empresa">
            <SegmentList
              items={porEmpresa}
              empty={{
                icon: Building,
                title: "Nenhuma cobrança ainda",
                description: "A segmentação por empresa aparece assim que houver cobranças registradas.",
              }}
            >
              {(item) => (
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
              )}
            </SegmentList>
          </TabsContent>

          <TabsContent value="obrigacao">
            <SegmentList
              items={porObrigacao}
              empty={{
                icon: FileText,
                title: "Nenhuma obrigação identificada",
                description: "A segmentação por obrigação aparece quando houver obrigações não canceladas.",
              }}
            >
              {(item) => (
                <li key={item.obrigacaoId}>
                  <Link
                    href={
                      item.count > 0
                        ? `/backoffice/cobrancas?obrigacaoId=${item.obrigacaoId}`
                        : `/backoffice/instrumentos/${item.instrumentoId ?? ""}`
                    }
                    className="flex items-center justify-between gap-3 border-b py-2 text-sm last:border-b-0 hover:text-primary"
                  >
                    <span className="font-medium">{item.descricao}</span>
                    <span className="text-muted-foreground">
                      {formatCurrency(item.total)} · {item.count} cobrança(s)
                    </span>
                  </Link>
                </li>
              )}
            </SegmentList>
          </TabsContent>

          <TabsContent value="periodo">
            <SegmentList
              items={porPeriodo}
              empty={{
                icon: CalendarDays,
                title: "Sem vencimentos",
                description: "A segmentação por período aparece quando houver cobranças com vencimento.",
              }}
            >
              {(item) => (
                <li key={item.month}>
                  <Link
                    href={`/backoffice/cobrancas?vencimentoInicio=${item.vencimentoInicio}&vencimentoFim=${item.vencimentoFim}`}
                    className="flex items-center justify-between gap-3 border-b py-2 text-sm last:border-b-0 hover:text-primary"
                  >
                    <span className="font-medium">{item.label}</span>
                    <span className="text-muted-foreground">
                      {formatCurrency(item.total)} · {item.count} cobrança(s)
                    </span>
                  </Link>
                </li>
              )}
            </SegmentList>
          </TabsContent>

          <TabsContent value="status">
            <SegmentList
              items={porStatus}
              empty={{
                icon: ListFilter,
                title: "Sem cobranças por status",
                description: "A segmentação por status aparece quando houver cobranças registradas.",
              }}
            >
              {(item) => (
                <li key={item.status}>
                  <Link
                    href={`/backoffice/cobrancas?status=${item.status}`}
                    className="flex items-center justify-between gap-3 border-b py-2 text-sm last:border-b-0 hover:text-primary"
                  >
                    <span className="font-medium">{item.label}</span>
                    <span className="text-muted-foreground">
                      {formatCurrency(item.total)} · {item.count} cobrança(s)
                    </span>
                  </Link>
                </li>
              )}
            </SegmentList>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
