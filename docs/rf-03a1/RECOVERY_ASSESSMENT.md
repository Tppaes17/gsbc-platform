# RF-03A.1 Recovery Assessment

## Current Evidence

Read-only command:

`npx supabase backups list --project-ref zjtuvsgigymgludplghd --output json`

Observed:

```json
{
  "backups": null,
  "physical_backup_data": {},
  "pitr_enabled": false,
  "region": "eu-west-1",
  "walg_enabled": true
}
```

This is not recovery readiness. WAL-G capability does not prove retained restore points, an accepted RPO/RTO or a successful restore exercise.

## Data Classes

| Class | Reconstructible | Required recovery |
|---|---|---|
| Official raw archives | Yes, only while the exact source remains available; preserving approved raw removes that dependency | Versioned object storage, checksums, lifecycle and restore/reprocess test |
| RF canonical | Yes from preserved raw + manifest + code version | DB backup/PITR or documented rebuild; publication pointer must remain reversible |
| Staging/extracted | Yes | No long-term backup; deterministic cleanup and retry |
| GSBC company links | No | Operational DB backup/PITR and restore test |
| Human classifications/decisions | No | Operational DB backup/PITR and audit retention |
| Future diff events | No once they drive decisions/history | Dedicated durable backup and retention |

## Proposed Objectives

Status: `PROPOSED — OWNER APPROVAL REQUIRED`.

- GSBC operational DB: RPO <= 15 minutes; RTO <= 4 hours.
- RF dedicated canonical: RPO <= 24 hours if raw/manifest/code are preserved; RTO <= 24 hours.
- Non-reconstructible links, decisions and diff events: same RPO/RTO as the GSBC operational DB.
- Restore exercise: isolated target, quarterly and before production RF activation; verify row counts, constraints, RLS/grants, checksums and application smoke tests.

These are engineering proposals, not approved business commitments.

## Required Closure Evidence

1. Owner approves RPO/RTO and retention.
2. GSBC operational PITR or equivalent recoverable backup is enabled.
3. Dedicated RF database backup/PITR policy is configured before national load.
4. Object versioning/lifecycle is configured and least privilege validated.
5. An isolated restore/rebuild exercise passes with measured elapsed time.
6. Runbook names owners, escalation, rollback and publication-pointer recovery.

## Status

`BACKUP / PITR: FAIL`

No destructive restore test was attempted against production.
