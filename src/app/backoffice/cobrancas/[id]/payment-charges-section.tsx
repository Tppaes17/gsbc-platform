"use client";

import { useTransition } from "react";
import { AlertTriangle, Banknote, QrCode } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/design-system/empty-state";
import { StatusBadge } from "@/components/design-system/status-badge";
import { criarChargeAction, simularWebhookAction } from "./payment-charge-actions";

const STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando pagamento",
  paid: "Paga",
  expired: "Expirada",
  cancelled: "Cancelada",
  refunded: "Estornada",
  failed: "Falhou",
};

const STATUS_TONE: Record<string, "positive" | "neutral" | "warning" | "negative" | "info"> = {
  pending: "warning",
  paid: "positive",
  expired: "negative",
  cancelled: "neutral",
  refunded: "neutral",
  failed: "negative",
};

interface ChargeItem {
  id: string;
  tipo: string;
  status: string;
  external_id: string | null;
  qr_code: string | null;
  linha_digitavel: string | null;
  expires_at: string | null;
  created_at: string;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR");
}

export function PaymentChargesSection({
  cobrancaId,
  charges,
}: {
  cobrancaId: string;
  charges: ChargeItem[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleCriar(tipo: "pix" | "boleto") {
    startTransition(async () => {
      const result = await criarChargeAction(cobrancaId, tipo);
      if (!result.error) toast.success("Cobrança gerada (simulação).");
      else toast.error(result.error);
    });
  }

  function handleSimular(chargeId: string, status: "PAGA" | "EXPIRADA" | "CANCELADA" | "ESTORNADA") {
    startTransition(async () => {
      const result = await simularWebhookAction(chargeId, status);
      if (!result.error) toast.success("Webhook simulado enviado.");
      else toast.error(result.error);
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">
          Cobrança via provider de pagamento
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            (STG-06 — SIMULAÇÃO, nenhum provider real conectado)
          </span>
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={isPending} onClick={() => handleCriar("pix")}>
            <QrCode className="h-4 w-4" />
            Gerar Pix
          </Button>
          <Button variant="outline" size="sm" disabled={isPending} onClick={() => handleCriar("boleto")}>
            <Banknote className="h-4 w-4" />
            Gerar boleto
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-muted-foreground">
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
          <span>
            Nenhum provider de pagamento real está conectado. Estas cobranças são
            simuladas — nenhum QR code ou boleto aqui pode ser pago de verdade.
          </span>
        </div>

        {charges.length === 0 ? (
          <EmptyState
            icon={QrCode}
            title="Nenhuma cobrança gerada"
            description="Gere um Pix ou boleto simulado para testar o fluxo de confirmação de pagamento via webhook."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {charges.map((charge) => (
              <li key={charge.id} className="flex flex-col gap-2 border-b pb-3 text-sm last:border-b-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge label={charge.tipo === "pix" ? "Pix" : "Boleto"} tone="info" />
                  <StatusBadge
                    label={STATUS_LABEL[charge.status] ?? charge.status}
                    tone={STATUS_TONE[charge.status] ?? "neutral"}
                  />
                  <span className="text-xs text-muted-foreground">
                    {charge.external_id} · gerada em {formatDate(charge.created_at)}
                  </span>
                </div>

                {charge.qr_code ? (
                  <code className="break-all rounded bg-muted px-2 py-1 text-xs">{charge.qr_code}</code>
                ) : null}
                {charge.linha_digitavel ? (
                  <code className="break-all rounded bg-muted px-2 py-1 text-xs">{charge.linha_digitavel}</code>
                ) : null}

                {charge.status === "pending" ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleSimular(charge.id, "PAGA")}
                    >
                      Simular: Pago
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleSimular(charge.id, "EXPIRADA")}
                    >
                      Simular: Expirado
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleSimular(charge.id, "CANCELADA")}
                    >
                      Simular: Cancelado
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
