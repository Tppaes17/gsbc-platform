# RF-03A.2B - Capacity And Recovery Sizing

## Measured Baseline

| Measure | Value | Confidence |
| --- | ---: | --- |
| Official period | 2026-09 | MEASURED |
| ZIP files | 37 | MEASURED |
| Compressed input | 7,758,926,262 bytes (7.76 GB decimal) | MEASURED |
| Largest ZIP | 2,243,389,254 bytes | MEASURED |

No national extraction, canonical load, index build or WAL benchmark has been executed. Compressed bytes are not PostgreSQL bytes.

## Planning Envelope

The following is a risk envelope, not procurement sizing:

| Component | Assumption | Projected range |
| --- | --- | ---: |
| Extracted CSV | 3x-5x compressed; CNAE-only POC observed 4x but is not representative | 23.3-38.8 GB |
| Canonical heap + indexes | 1.5x-2.5x extracted; unbenchmarked | 34.9-97.0 GB per version |
| Two canonical versions | active N + candidate N+1 | 69.8-194.0 GB |
| Staging/extracted working set | up to one extracted national set | 23.3-38.8 GB |
| WAL | 0.5x-1.5x candidate canonical; unbenchmarked | 17.5-145.5 GB |
| Temp/index build | 0.25x-0.5x candidate canonical; unbenchmarked | 8.7-48.5 GB |
| Safety margin | 30% over working subtotal; owner approval required | variable |

Using only those assumptions, a defensive peak spans roughly **155-555 GB**. This broad range demonstrates uncertainty; it must not be converted into a purchase without a representative isolated benchmark.

Minimum raw retention of current+previous compressed periods is at least 15.52 GB before object versioning, multipart overhead, manifests, logs and growth. Backup/PITR storage, restore target and cross-region copies are additional.

## Capacity Gate

Current production allocation and free space are not observable from the collected evidence. The present database hosts the operational core and has no acceptable RF blast-radius isolation. Capacity headroom is therefore **UNKNOWN/FAIL FOR RF-03B**, regardless of its current small table footprint.

Required benchmark: representative official multi-entity load in an isolated RF target measuring extracted bytes, heap, TOAST, indexes, COPY throughput, index build, WAL, temp, vacuum, rollback, two-version overlap and restore duration.

## Cost Model (2026-09-17)

| Cost | Status | Evidence/estimate |
| --- | --- | --- |
| Current project plan | UNKNOWN | No billing export inspected; repository describes Free but this is not authoritative billing evidence |
| Supabase Pro | PROVIDER-DOCUMENTED | from USD 25/month; 8 GB included disk and 7-day daily backups |
| Supabase PITR | PROVIDER-DOCUMENTED | about USD 100/month per 7 days; requires paid plan and at least Small compute |
| Isolated physical restore/clone | PROVIDER-DOCUMENTED, amount UNKNOWN | paid-plan feature; creates a new billable project with matching compute/disk attributes |
| Dedicated RF PostgreSQL | UNKNOWN | provider, compute, disk/IOPS and retention undecided |
| Object storage/egress | UNKNOWN | provider, region, retention and lifecycle undecided |
| Worker/observability | UNKNOWN | provider/resources/job frequency undecided |

Sources: [Supabase backups](https://supabase.com/docs/guides/platform/backups), [restore to a new project](https://supabase.com/docs/guides/platform/clone-project), [pricing](https://supabase.com/pricing), accessed 2026-09-17.

