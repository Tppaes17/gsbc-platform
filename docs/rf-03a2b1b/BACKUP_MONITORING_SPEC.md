# Backup Monitoring Specification

No production monitor or scheduler was installed.

## Required Signals

- Last attempted, completed and verified recovery-point timestamps.
- Recovery-point age; warning at 45 minutes, critical/blocking above 60 minutes.
- Stage duration: precheck, dump, validation, encryption, copy, checksum and total.
- Source DB size, dump/encrypted size and growth rate.
- Lock owner/age, overlap rejection and stale-lock recovery.
- Failure stage/error code, retry count and consecutive failures.
- Checksum/marker validity and independent destination availability.
- Last successful restore-drill date, duration and validation result.

## Semantics

- Success exists only after durable copy verification, canonical manifest and success marker.
- Failed/partial runs emit an observable error and never advance last-success time.
- Scheduler must not silently skip overlap; it emits `LOCKED` and evaluates recovery-point age.
- Alert owner, delivery channel, escalation SLA and maintenance suppression require owner approval.
- No backup key, connection string, PII or dump content may appear in telemetry.

The POC proves error exits and no-marker behavior, not alert delivery.
