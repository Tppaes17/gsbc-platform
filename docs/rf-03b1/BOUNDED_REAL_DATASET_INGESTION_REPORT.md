# RF-03B.1 Bounded Real Dataset Ingestion Report

Status: **CONDITIONAL — BOUNDED PRE-PRODUCTION EVIDENCE ONLY**  
Date: 2026-09-18

## Executive Result

The official `Empresas1.zip` was downloaded from Receita WebDAV, matched the approved manifest, passed structural and local-integrity validation, expanded safely, and streamed 4,494,860 rows with zero parser rejection. A deterministic 100,000-row subset was loaded and normalized twice into the approved RF schemas inside one local transaction. Idempotency, version activation/previous-version retention semantics and rollback passed; all data was removed.

The bounded pipeline works, but this single group does not establish national capacity. Measured JSON staging, indexes and WAL materially reinforce the dedicated PostgreSQL/worker hypothesis. Prefix search is not national-ready and production-worker reachability is unknown.

## Gate

```text
OFFICIAL DOWNLOAD/INTEGRITY: PASS
SAFE EXTRACTION: PASS
FULL-FILE STREAM PARSE: PASS
BOUNDED STAGING/NORMALIZATION: PASS
QUALITY RECONCILIATION: PASS
IDEMPOTENCY: PASS
FAILURE HANDLING: PASS
CNPJ ALPHANUMERIC PATH: PASS (SYNTHETIC)
POSTGRES QUERY BENCHMARK: PARTIAL
CAPACITY PROJECTION: CONDITIONAL
PRIVACY/CLEANUP: PASS
CURRENT-STAGE P0: 0
CURRENT-STAGE P1: 0
RF-03B.1: CONDITIONAL
RF-03B.2: CONDITIONAL — OWNER AUTHORIZATION REQUIRED
```

No production, billing, migration, scheduler, CI ingestion, deploy hook or national ingestion was changed. The benchmark command is manual only.

## Cost Direction

- Current local execution: USD 0 incremental, OBSERVED.
- Raw 7.76 GB fits within Cloudflare R2's documented 10 GB Standard free tier only without retained extra versions; a two-version/raw/log allowance exceeds it. Standard storage is documented at USD 0.015/GB-month after free allowance, but provider/account/security approval is absent.
- Database, worker, backup/recovery and monitoring costs remain UNKNOWN until the owner selects capacity and retention. The 0.5-1.5 TB assumed peak envelope means the current free/shared architecture must not be treated as a national cost baseline.

Sources: official manifest in `docs/rf-03a2a1/OFFICIAL_DATASET_MANIFEST.json`; Cloudflare R2 pricing `https://developers.cloudflare.com/r2/pricing/`; compute pricing must be quoted for the selected region/provider.
