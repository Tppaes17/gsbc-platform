type Severity = "info" | "warn" | "error";

export interface OperationalEvent {
  area:
    | "audit"
    | "backup"
    | "cron"
    | "payment_webhook"
    | "service_role"
    | "tenant_isolation";
  event: string;
  severity: Severity;
  tenantId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  correlationId?: string | null;
  message?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

function write(level: Severity, payload: OperationalEvent) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    ...payload,
  });

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }
}

export function recordOperationalEvent(event: OperationalEvent) {
  write(event.severity, event);
}
