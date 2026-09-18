# RF-03A.2B.1C Pre-Production Recovery Baseline

Status: **CONDITIONAL — PRE-PRODUCTION ONLY**  
Date: 2026-09-18

## Decision And Scope

GSBC is in development/pre-revenue with no onboarded clients. High-frequency Option C is rejected. The owner approved a daily encrypted logical-backup baseline while keeping the current Supabase plan and deferring PITR.

This baseline does not authorize clients, financial go-live, production-grade DR, national RF ingestion or any claim that RPO/RTO are achieved.

## Implemented Baseline

- Reused the tested custom `pg_dump`/roles bundle.
- AES-256-GCM authenticated encryption; key separate from artifact/Git.
- SHA-256 copy verification, canonical manifest and success marker.
- Explicit independent-directory configuration.
- `recovery:daily` manual command and `recovery:status` observability command.
- Safe last-failure record without secrets.
- Local disposable restore with application ACL replay and validation.
- No scheduler, production connection, paid resource or billing change.

## Measured Execution

An encrypted local-development backup was written to the existing OneDrive File Provider path and restored from that path:

| Metric | Result |
| --- | ---: |
| Source database | 17,796,243 bytes |
| Dump | 823,235 bytes |
| Encrypted artifact | 853,028 bytes |
| Dump duration | 591 ms |
| Full backup duration | 941 ms |
| PostgreSQL restore | 1,472 ms |
| Full restore/validation | 2,321 ms |

Validated: 56 public tables with RLS, 140 policies, 52 functions, 1,163 application grants, 2 Auth users, 2 Storage metadata rows, migration baseline 46 and tenant isolation (one own tenant, zero foreign tenants).

The dataset is small and synthetic/local. One successful run proves the pipeline, not a daily service level. Filesystem placement proves a copy in OneDrive's local File Provider directory; remote cloud-sync completion was not independently observed.

## POC Findings Reclassified

| Prior finding | Classification now | Reason |
| --- | --- | --- |
| Independent durable copy untested | Needed now, PARTIAL | OneDrive path tested; remote sync/versioning/ACL evidence incomplete |
| Storage object bytes absent | Production onboarding requirement | Local/pre-client data is disposable; cannot remain open at onboarding |
| Full Auth/platform config manual | Production onboarding requirement | Git/config inventory helps development; full drill mandatory before clients |
| RPO <=1 h/scheduler scale unproven | Closed as rejected requirement | High-frequency Option C rejected |
| Key management/rotation untested | Needed before unattended daily operation | Ephemeral POC key is not an operational key lifecycle |
| Managed schema/default ACL portability | Documented reconstruction dependency | Application ACL/RLS passed; platform bootstrap still needed |

## Current-Stage Findings

These severities apply only to the declared development/pre-revenue stage with no onboarded clients and disposable/reconstructible local data. They do not reduce the production onboarding gate.

| ID | Severity | Finding | Required disposition |
| --- | --- | --- | --- |
| PRE-RCV-001 | P2 | Daily cadence and persistent key management are not configured, so RPO <=24 h is not proven. | Authorize and validate unattended operation before relying on the baseline. |
| PRE-RCV-002 | P2 | OneDrive File Provider placement was tested, but remote sync, versioning and access controls were not independently evidenced. | Verify the remote failure domain and retention controls. |
| PRE-RCV-003 | P3 | Full Supabase Auth, Storage object bytes and platform configuration recovery remains incomplete. | Keep client onboarding blocked until a complete production recovery review and drill pass. |

Current-stage counts: **P0 0, P1 0, P2 2, P3 1**. PRE-RCV-001 through PRE-RCV-003 become production blockers if the stage changes, real client data is introduced or financial operations begin.

## Gate

```text
DAILY PIPELINE: PASS AS MANUAL LOCAL BASELINE
INDEPENDENT COPY: PARTIAL
ISOLATED DATABASE RESTORE: PASS
RPO <=24H: NOT PROVEN
RTO <=24H: PARTIAL
PRODUCTION CLIENT ONBOARDING: BLOCKED
PRE-PRODUCTION BASELINE: CONDITIONAL
```

The next operational decision is whether to authorize a durable key store, confirm OneDrive sync/security and install an unattended daily scheduler. Those are not silently inferred from this baseline.
