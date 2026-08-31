const AUDIT_EVENT_LABELS: Record<string, string> = {
  "payment_compensation_event.refund": "Estorno de compensação registrado",
  "payment_compensation_event.chargeback": "Chargeback registrado",
  "payment_reconciliation.created": "Conciliação registrada",
  "payment_reconciliation.reprocessed": "Conciliação reprocessada",
  "financial_repasse.paid": "Repasse realizado",
  "financial_repasse.failed": "Falha no repasse registrada",
};

export function auditEventLabel(action: string) {
  return AUDIT_EVENT_LABELS[action] ?? action;
}

export function AuditEventLabel({ action }: { action: string }) {
  const label = auditEventLabel(action);

  if (label === action) {
    return <span>{action}</span>;
  }

  return (
    <span className="inline-flex max-w-full flex-col">
      <span>{label}</span>
      <span className="break-all text-xs font-normal text-muted-foreground">{action}</span>
    </span>
  );
}
