# RF-03A.2B - Production Recovery Runbook

Status: **PARTIAL / BLOCKED UNTIL PROTECTION AND ISOLATED RESTORE ARE PROVEN**.

This runbook is executable guidance, not evidence that restore capability exists. Never restore over production without an approved incident decision and a verified recovery point.

## Roles

- Incident Commander: owns severity, write freeze, communication, and cutover decision.
- Database Recovery Owner: selects recovery point, executes isolated restore, and preserves logs.
- Application Owner: validates migrations, configuration, smoke tests, and app restart.
- Security Owner: handles privileged compromise, credential rotation, access review, and evidence preservation.
- RF Data Owner: validates manifest, dataset version, provenance, and active pointer.
- Business Owner: accepts RPO loss, downtime, financial reconciliation, and paid recovery action.

## Common Recovery Flow

1. Declare incident, severity, affected tenants/services, first known bad time, and owners.
2. Preserve evidence. Export relevant provider/audit logs without secrets or PII. Do not destroy the suspected source.
3. Freeze writes when continued mutation increases damage. Pause payment webhooks/jobs only through an approved, reversible control; preserve incoming events for replay.
4. Identify the last known good point and record timezone, evidence, transaction boundaries, and expected data loss.
5. Inventory external side effects: payment provider events, emails, files, webhooks, object storage and RF publication state.
6. Select a backup strictly before the bad event. Record backup type, age, retention, integrity metadata, and failure domain.
7. Create a new isolated recovery target. Do not overwrite production. Disable outbound jobs/webhooks before application access.
8. Restore database and required encryption/configuration material using provider-supported procedure.
9. Validate server/Postgres version, migration baseline, schemas, extensions, tables, selected aggregate counts, constraints, indexes, RLS, grants, functions, triggers, Auth records and storage metadata. Never publish PII in evidence.
10. Run tenant-isolation, service-role, authentication, audit, payment idempotency and financial reconciliation tests.
11. For RF, validate manifest hash, active/previous versions, provenance, quality gates, row totals and atomic active pointer. Do not publish a candidate during recovery.
12. Reapply environment configuration and rotated secrets through the approved secret store. Do not copy old compromised credentials.
13. Execute application smoke tests against the isolated target with outbound integrations disabled or sandboxed.
14. Produce a recovery diff: missing interval, replayable events, non-replayable effects, reconciliation plan and measured duration.
15. Incident Commander and Business Owner decide cutover, selective repair, continued isolation, or abandonment. A technical PASS does not automatically authorize cutover.
16. If cutover is approved, use documented DNS/config switch, monitor error/latency/financial invariants, and retain rollback target.
17. Close only after reconciliation, security review, stakeholder sign-off, evidence retention, target cleanup and a corrective-action owner/date.

## Disaster Procedures

| ID | Detection | Containment | Recovery | Validation / target |
| --- | --- | --- | --- | --- |
| DR-01 accidental delete | audit event/count anomaly | freeze affected writes | PITR/isolated restore, copy validated rows, audit repair | tenant/RLS/FK and financial reconciliation; RPO <=15m, RTO <=4h proposed |
| DR-02 defective migration | deploy errors/schema checks | stop deploy and writes if destructive | restore isolated point or forward-fix after evidence; never blind rollback | migration baseline, functions, triggers, RLS, app smoke |
| DR-03 logical corruption | invariant/quality alerts | stop offending job | select pre-corruption point; restore or repair from isolated clone | domain invariants and event reconciliation |
| DR-04 defective RF publish | manifest/quality/link anomaly | keep N active; stop N+1 | atomically repoint to N, preserve candidate and evidence | active hash, links, search index and audit event |
| DR-05 storage exhaustion | disk/WAL/read-only alerts | stop RF load/index build | add approved capacity or clean only proven disposable staging | free-space threshold, core latency and WAL health |
| DR-06 database outage | health/provider alert | stop retries that amplify load | provider recovery/failover; restore only to isolated target | core smoke, Auth, payments, RLS |
| DR-07 privileged credential compromise | audit/security alert | revoke/rotate, freeze privileged jobs | restore only if integrity impacted; replay trusted events | access inventory, secrets rotation, audit chain |
| DR-08 provider/region outage | provider and synthetic alerts | declare regional incident | current design has no proven cross-region recovery; invoke provider and approved rebuild path | full-platform validation; RTO unknown |
| DR-09 unusable backup | restore/checksum failure | retain failed artifact and choose earlier point | alternate independent backup; otherwise unrecoverable interval | full restore checks; escalate P0 |
| DR-10 official dataset unavailable | discovery/network errors | keep active N; no publish | retry bounded discovery or use retained versioned raw | manifest stability and source provenance |

## Current Blockers

- No managed backup enumerated and PITR disabled.
- No isolated restore from a production backup.
- Custom JSON backup is non-transactional, same-provider, public-schema-only, and not a database restore artifact.
- No independent storage-object backup or cross-account/cross-region copy.
- No measured production RPO/RTO or production worker reachability.

