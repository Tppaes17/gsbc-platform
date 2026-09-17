# RF-03A.2B.1B Independent Backup POC Report

## Executive Summary

The local database backup/encryption/restore mechanism passed, but Option C failed its architecture gate. The POC created a PostgreSQL custom archive and role inventory, validated the archive, encrypted it with AES-256-GCM, verified an independent-copy simulation by SHA-256, wrote a canonical manifest/success marker and restored into a disposable local database. Unit/failure tests passed 14/14.

The POC cannot prove independent durability, physical Storage-object recovery, full Supabase platform/Auth configuration, a 30-minute production schedule, production-scale load or end-to-end RTO. These are hard gates. Per the artifact abort criteria, the result is **FAIL — USE PITR**. The tooling remains valuable as a supplemental independent logical backup after security hardening, not as the primary substitute for PITR.

## Scope And Safety

- Local Supabase only; production unchanged.
- Disposable restore DB created and dropped in the local DB container.
- Ephemeral key supplied through environment; no key/backup committed.
- Copy target under `/tmp`; no paid/external infrastructure.
- No scheduler, migration, application code, deployment, RF ingestion or billing change.

## Pipeline Result

```text
PRECHECK -> PG_DUMP/ROLES -> PG_RESTORE LIST VALIDATION
-> TAR -> AES-256-GCM -> LOCAL SECOND-DIRECTORY COPY
-> SHA-256 VERIFY -> CANONICAL MANIFEST -> SUCCESS MARKER
```

Measured local result:

- Source DB: 17,796,243 bytes.
- Dump: 823,235 bytes; dump phase 787 ms.
- Encrypted bundle: 853,028 bytes.
- Total backup pipeline: 1,241 ms.
- Total restore pipeline: 1,769 ms.
- Backup SLA <=30 minutes: PASS for small local POC only.

## Tests And Failure Injection

`npm run test:recovery-poc`: 14/14 PASS:

- canonical manifest determinism;
- encryption/decryption;
- wrong-key and corruption rejection;
- success-marker semantics;
- dump, encryption, copy, checksum and marker failures;
- duplicate/no-overlap lock and stale-lock recovery;
- tampered manifest rejection;
- retention selection.

Integrated failure injection:

- Missing DB container: exit 1, no success marker.
- Injected copy failure: exit 1, no success marker.

Two implementation defects were found and corrected during execution: a stream-close race that could leave an unsettled promise, and retention-tier fallthrough that retained duplicate daily points as weekly points.

## Restore And Coverage

Local DB restore passed with 56 public/RLS tables, 52 functions, 1,163 application grants, 2 Auth users, 2 Storage metadata rows and 46 migration records. Managed Supabase schemas/extensions and managed default ACLs require platform reconstruction. Physical Storage objects and external provider configuration were not restored.

Coverage: **CONDITIONAL/FAIL for primary production recovery**. Details are in `BACKUP_COVERAGE_MATRIX.md` and `RESTORE_TEST_REPORT.md`.

## RPO/RTO Decision

Target RPO <=1 hour: **NOT PROVEN**. There was no repeated 30-minute schedule, independent durable copy, production dataset or recovery-point-age monitor.

Target RTO <=4 hours: **PARTIAL / NOT PROVEN**. PostgreSQL local restore was fast, but full Auth/Storage/config/app readiness was not tested.

## Gate

```text
POC Gate: FAIL — USE PITR
P0: 0
P1: 4
RF-03A.2B: NO-GO
RF-03B: BLOCKED
```

Technical recommendation: proceed with the previously approved Balanced architecture using Supabase PITR 7 days before relevant financial operation. Retain the encrypted logical pipeline only as a future independently stored supplemental backup after the four P1 gaps are closed. No production implementation is authorized by this report.
