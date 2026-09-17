# RF-03A.2B Production Recovery Readiness Report

## Executive Summary

GSBC is **not recovery-ready for RF-03B**. The official RF source and manifest are verified, but the production operational core has no enumerated managed backup, PITR is disabled, and no real production backup has been restored to an isolated target. The existing daily JSON export is a useful supplemental stopgap, but it is not transactionally consistent and cannot recreate the database.

The hard gates for restore proof, critical RPO, capacity and blast-radius isolation fail. The current database must not receive a national RF load. Option D - dedicated versioned object storage plus dedicated RF PostgreSQL - remains the technical recommendation and requires owner approval, sizing benchmark and paid infrastructure decisions.

**Gate: NO-GO. RF-03B: BLOCKED.** No production or paid change was performed.

## Baseline And Environment

| Attribute | Result | Evidence class |
| --- | --- | --- |
| Project | GBSC / `zjtuvsgigymgludplghd` | OBSERVED local link/Management API |
| Region | `eu-west-1` | OBSERVED Management API |
| PostgreSQL migrations | local/remote `0001`-`0046` aligned | TESTED |
| Provider backup inventory | `backups=null`, `physical_backup_data={}` | OBSERVED 2026-09-17 |
| WAL-G | enabled | OBSERVED |
| PITR | disabled | OBSERVED |
| Billing plan/allocation | UNKNOWN | no billing/capacity export inspected |
| RF national jobs/data | absent; RF canonical/raw tables currently empty | OBSERVED remote table statistics |
| Official source | WebDAV 207; 2026-09; 37 ZIPs; 7,758,926,262 bytes | TESTED RF-03A.2A.1 |

No restore against production, production write, migration, deployment, RF download or infrastructure creation occurred.

## Data Criticality And Recovery Mode

- Class A, irreconstructible: tenants, Auth/profiles, memberships, contracts, configurations, validated classifications, human decisions, charges, payments, reconciliation, audit, delivery evidence, legal/private contacts and publication decisions. Required mode: managed BACKUP/PITR plus isolated RESTORE proof and financial/event reconciliation.
- Class B, externally reconstructible: official RF raw and most canonical facts. Required mode: REDOWNLOAD or versioned raw BACKUP, then deterministic REBUILD. Manifest/provenance and GSBC links remain Class A.
- Class C, derived: search, caches, projections and materialized outputs. Required mode: RECOMPUTE from validated canonical.

## Backup, PITR, Retention And Failure Domain

### Observed

- Supabase Management API: WAL-G enabled, PITR disabled, no physical backups enumerated.
- Repository cron: daily logical JSON export to private `db-backups`, deletion after 14 days.
- Export reads each `public` table through separate PostgREST requests and separately lists Auth users.
- Local test passed, but only parses arrays and inserts table counts into a temporary local table before rollback.

### Limitations

The JSON artifact is not a consistent database snapshot. It omits DDL, non-public schemas including RF canonical/raw, constraints, indexes, RLS, grants, functions, triggers, extensions, custom role secrets and Storage objects. The bucket shares provider/account/project failure domain with the primary. Production execution history, encryption properties, restore credentials, independent export and alert delivery were not observed.

Provider documentation states paid projects receive daily physical backups by plan retention, PITR is a paid add-on, database backups do not restore Storage objects, project deletion also deletes associated provider backups, and isolated physical restore creates a new billable project. These are provider capabilities, not proof that this project currently has them.

Current backup: **PARTIAL**. PITR: **DISABLED**. Backup retention: custom logical export intends 14 days; managed retention is absent/unknown. Failure domain: **UNACCEPTABLE** for critical recovery.

## Restore And PITR Evidence

The isolated production restore hard gate was not executed because no physical backup was enumerated and a provider clone/paid target requires owner authorization. No result was fabricated.

The local smoke test passed in 16.0 seconds, but proves only JSON readability and selected table presence. It is not an isolated database restore and yields no production RPO/RTO.

Restore capability: **PARTIAL / NOT VERIFIED FOR PRODUCTION**. Isolated production restore: **NOT EXECUTED**. Restore duration: **UNKNOWN**.

## RPO And RTO

The proposed objectives are class-specific in `docs/rf-03a2b/RPO_RTO_MATRIX.md`. Critical transactional/audit target is RPO <=15 minutes and operational RTO <=4 hours; current protection cannot demonstrate either. RF canonical target is RPO <=24 hours and RTO <=24 hours, with raw redownload allowed up to 48 hours; these are also untested.

Targets require owner acceptance. Current achieved RPO/RTO: **UNKNOWN**.

## Disaster Readiness

The runbook covers DR-01 accidental delete, DR-02 defective migration, DR-03 logical corruption, DR-04 defective RF publish, DR-05 storage exhaustion, DR-06 database outage, DR-07 privileged compromise, DR-08 provider/region outage, DR-09 unusable backup and DR-10 temporary source outage.

The procedures are operationally structured but remain partial because no production recovery point, isolated target, cutover path or measured validation exists. Provider/region/account loss has no proven independent copy.

## RF Recovery And Version Rollback

Required model: N remains active; N+1 loads in isolation; validation precedes atomic audited pointer switch; N remains recoverable; defective N+1 is discarded or pointer rolls back to N. Preserve versioned raw, manifest, provenance, loader version and quality report. Recompute search/indexes; discard staging/extracted.

This model is PROPOSED and untested nationally. No ingestion or publish implementation was started.

## Placement And Blast Radius

Operational and RF schemas currently share one PostgreSQL instance. Separate schemas do not isolate disk, WAL, IOPS, vacuum, locks, CPU/memory, connections, backup or restore. National load could put Auth, collections, billing, payments and audit into read-only or unavailable states.

Option A is rejected and C is not recommended. Option D - dedicated versioned object storage plus dedicated RF PostgreSQL - is recommended, `PROPOSED — OWNER APPROVAL REQUIRED`. Option B remains viable only with a durable raw-object strategy.

## Capacity And Sizing

Only 7,758,926,262 compressed bytes, period 2026-09 and 37 files are measured. A deliberately broad assumption envelope estimates 155-555 GB peak for extraction, staging, two canonical/index versions, WAL, temp and 30% safety margin. This is not procurement sizing.

Current allocation/free disk/IOPS are unknown, and no representative national benchmark exists. Headroom: **UNKNOWN/FAIL FOR RF-03B**. The current operational database is unsuitable regardless of current small relation sizes.

## Cost

Known provider documentation as of 2026-09-17: Supabase Pro starts at USD 25/month with 7-day daily backups and 8 GB disk; 7-day PITR is approximately USD 100/month and also requires paid plan/eligible compute. A physical restore to a new project is billable. Dedicated RF DB, object storage, worker, egress, observability and test targets remain UNKNOWN until provider/region/retention and benchmark are selected.

No purchase, plan change or paid resource was authorized or performed.

## Observability Requirements

Before RF-03B, assign alert owner/severity and monitor database/storage utilization, WAL/archive lag, connections, CPU/memory, IOPS/latency, backup failure, PITR window health, last successful restore-test age, RF job heartbeat/failure, quality gate, publish/rollback and worker source reachability. Existing structured backup failure logs are a baseline, not an alerting/recovery control.

## Security

Required: encryption in transit/at rest/backups, private least-privilege identities, independently protected restore credentials, audited access, secret rotation after compromise and no PII in evidence. Provider-managed encryption may exist, but project backup encryption, independent-copy encryption and restore access were not observed and remain UNKNOWN.

## Findings

Counts and evidence are in `docs/rf-03a2b/RECOVERY_RISK_REGISTER.md`:

- P0: 1
- P1: 5
- P2: 3
- P3: 1

The P0 is absence of proven reliable recovery for critical production data. Blocking P1s cover PITR/RPO, fragile logical backup/failure domain, shared RF blast radius, unknown capacity and missing production-worker reachability.

## Verification Commands

- `npx playwright test e2e/phase0-backup-restore.spec.ts`: PASS, 1/1 local smoke test.
- `npm run test:rf-source-probe`: PASS, 14/14.
- `npx tsc --noEmit`: PASS.
- `npm run lint`: PASS with zero errors and one pre-existing React Compiler warning in `data-table.tsx`.
- `npx supabase migration list --local`: PASS, local/remote 0001-0046 aligned.
- RF-02 structural SQL and RF-02B privilege SQL executed directly with `psql -v ON_ERROR_STOP=1`: PASS with transaction rollback.
- `npx supabase test db`: runner incompatibility, because the existing SQL regression files are assertion scripts without TAP plans; reported zero test failures but exited 1 for `No plan found`. This was not represented as a test PASS.

## ADRs And Governance

- ADR-RF-013 Database Placement: updated; `PROPOSED — OWNER APPROVAL REQUIRED`.
- ADR-RF-016 Backup/PITR Strategy: updated; `BLOCKED — INSUFFICIENT EVIDENCE`.
- ADR-RF-017 Recovery Objectives: created; `PROPOSED — OWNER APPROVAL REQUIRED`.
- ADR-RF-018 RF Version Recovery Model: created; `PROPOSED — OWNER APPROVAL REQUIRED`.
- Existing ADR-RF-014 remains Ingestion Scheduling and ADR-RF-015 remains Dataset Retention. They were not silently repurposed to conflicting names from the execution artifact. Capacity is governed by `CAPACITY_AND_RECOVERY_SIZING.md`.

## Owner Decisions Required

1. Approve critical RPO/RTO and retention objectives.
2. Choose whether to upgrade/protect the operational database with PITR or an equivalent independently recoverable design. Current documented 7-day PITR cost is about USD 100/month plus eligible paid plan/compute.
3. Authorize a paid isolated restore target and restoration drill after protection exists.
4. Approve Option D, provider, region, budget and operations owner for RF DB/object storage/worker.
5. Approve independent/cross-account retention for critical backups and Storage objects.

These actions are reversible only to varying degrees; disabling PITR later reduces future recovery coverage, while restore targets can be destroyed after evidence capture. No action should begin without explicit owner authorization and cost review.

## RF-03B Preconditions

- Zero P0 and no blocking P1.
- Real managed/independent critical backup observed with retention.
- PITR/equivalent meets approved critical RPO.
- Production backup restored to an isolated target and fully validated.
- Measured RTO accepted.
- RF Option D approved and provisioned with isolated recovery controls.
- Representative load/recovery benchmark proves capacity headroom.
- Production worker proves official-source reachability.
- Monitoring owners and alerts are active.

## Gate

**RF-03A.2B Gate: NO-GO. RF-03B: BLOCKED.**

The gate cannot be downgraded to GO WITH CONDITIONS because restore proof, required PITR/equivalent, capacity and essential blast-radius isolation are hard gates.

## Sources

- [Supabase Database Backups](https://supabase.com/docs/guides/platform/backups)
- [Supabase Restore to a New Project](https://supabase.com/docs/guides/platform/clone-project)
- [Supabase Pricing](https://supabase.com/pricing)
- [Supabase Database Size](https://supabase.com/docs/guides/platform/database-size)
