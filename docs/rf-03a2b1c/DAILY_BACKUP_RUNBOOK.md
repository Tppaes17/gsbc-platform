# Daily Backup Runbook

No scheduler is installed. This is the manual/preflight procedure for a separately authorized daily job.

## Required Environment

```text
RECOVERY_POC_KEY_BASE64       32-byte key, base64; secret store only
RECOVERY_POC_OUTPUT           local state/failure directory
RECOVERY_POC_INDEPENDENT_DIR  independent encrypted destination
RECOVERY_POC_DB_CONTAINER     optional local-only container override
```

## Backup

```bash
npm run recovery:daily
```

Success requires exit code zero and a verified `.success.json` marker. The marker is created only after non-empty archive validation, encryption, copy, checksum and manifest hashing.

## Status

```bash
npm run recovery:status
```

Review `lastSuccessAt`, `backupAgeMs`, `backupDurationMs`, encrypted size, checksum/copy verification, `lastFailure`, `lastRestoreAt`, `lastRestoreDurationMs` and `lastRestoreResult`. Future alert thresholds: warning at 20 hours; critical/block onboarding at more than 24 hours or any invalid copy/checksum.

## Failure

- Do not create/manual-fake a marker.
- Preserve safe error metadata; never log keys, credentials or dump contents.
- Resolve lock only after verifying no process is active; stale lock defaults to one hour.
- Rerun only after the failed stage is understood.
- If no valid recovery point remains within 24 hours, baseline RPO is breached and development handling of irreconstructible data must stop.

## Retention

Proposal: keep 14 verified daily points. Weekly/monthly tiers are not justified for the current disposable pre-client dataset. Do not automate deletion until destination versioning and restore selection are verified.
