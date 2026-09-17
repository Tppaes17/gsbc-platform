# RF-03A.1 Infrastructure Options

## Current Inventory

| Component | Verified | Unknown |
|---|---|---|
| Supabase project | `GBSC`, ref `zjtuvsgigymgludplghd`, `eu-west-1`, PostgreSQL 17.6, `ACTIVE_HEALTHY` | Plan, compute, memory, IOPS, DB allocation, current usage, egress quota, connection tier |
| Supabase recovery | WAL-G enabled, PITR disabled, no backups enumerated | Daily-backup retention and tested restore |
| Vercel project | `gsbc-platform`, Next.js, Node 24.x, sandbox `iad1`, no failover region | Plan, Fluid Compute state, memory setting, spend limits |
| Existing object storage | Private `db-backups` bucket with 500 MB limit for current logical backup flow | Suitability for RF largest object, multipart, lifecycle and national capacity |
| RF runtime | No RF cron, worker, queue, bucket or production pipeline | Provider and approved capacity |

The connected Vercel API returned HTTP 403 for project inspection. The authenticated CLI exposed only the fields above. Unobserved capacity fields remain unknown.

## Database Placement

| Option | Capacity | Isolation | Recovery | Complexity | Decision |
|---|---|---|---|---|---|
| A. Current GSBC PostgreSQL + RF schemas | Unknown | Low | Fails current PITR gate | Low | Reject for national ingestion |
| B. Dedicated RF PostgreSQL only | Independently scalable | High | Must be configured | Medium | Viable but incomplete without durable raw storage |
| C. Object storage + current GSBC canonical | Unknown | Medium | Raw recoverable; shared DB remains at risk | Medium | Not recommended |
| D. Object storage + dedicated RF PostgreSQL | Independently scalable | High | Independent PITR/restore | Higher | Recommended |

The current database hosts tenant, authentication, billing, payment, webhook and collection workloads. National COPY, index creation, WAL growth, autovacuum and storage exhaustion would share that failure domain.

## Worker Options

| Option | Fit | Decision |
|---|---|---|
| Vercel Functions | Request duration and memory limits do not fit an unbounded national download/extract/load job. | Orchestration and status API only |
| Supabase Edge Functions | 256 MB memory, 2 s CPU/request and bounded wall-clock runtime are incompatible with the CPU/disk workload. | Reject for ingestion |
| GitHub-hosted Actions | Ephemeral runner, 14 GB standard disk and six-hour job ceiling; useful for bounded POC, not preferred as production data plane. | POC/manual verification only |
| Long-lived VM | Technically viable but requires patching, scheduling, supervision and idle-capacity operations. | Fallback |
| Managed container batch job | Supports container image, explicit CPU/memory/disk, timeout, retry, cancellation, queueing and scale-to-zero. | Recommended model; provider pending |

### Minimum worker contract

- Runtime: configurable in hours; exact timeout follows representative benchmark plus approved margin.
- Memory/CPU: numeric minimum remains unknown until official multi-entity benchmark.
- Scratch disk: at least largest compressed object plus largest extracted object, checkpoint overhead and approved margin.
- Network: outbound official-source and private-storage access; region aligned with storage/database when possible.
- Concurrency: one dataset publication candidate at a time; bounded per-file parallelism only after benchmark.
- Reliability: retry by failure class, checkpoint per file, heartbeat, cancellation and idempotent resume.
- Security: isolated identity, secret manager, no browser-exposed credentials, least-privilege DB/storage access.
- Observability: structured job/file metrics, manifest hash, bytes, rows, rejects, checkpoints, resource saturation and alerts.

```text
Recommended production worker:
Managed container batch job, provider pending owner approval

Role of Vercel:
Discovery trigger/orchestration/status only

Why:
The workload needs durable retries, checkpoints, scratch disk and hours-scale execution.

Rejected alternatives:
Vercel and Edge Functions are bounded request runtimes; hosted CI is ephemeral and capacity-limited.
```

## Object Storage Options

| Option | Fit | Decision |
|---|---|---|
| Current `db-backups` bucket | 500 MB cap and a different recovery purpose | Reject for RF |
| Dedicated Supabase Storage bucket | Private access available, but capacity, largest object, multipart/resume, lifecycle, cost and restore are unverified | Conditional candidate |
| Dedicated S3-compatible object storage | Multipart/resume, versioning, checksums, lifecycle and independent blast radius can satisfy the contract | Recommended class; provider pending |

```text
Recommended RF object storage:
Private, dedicated, versioned S3-compatible bucket in the selected worker/DB region

Expected peak requirement:
UNKNOWN; calculate from official manifest, retention overlap and multipart headroom

Retention:
Canonical current+previous; manifests/audit long-term; raw window pending owner approval; extracted/staging ephemeral

Lifecycle:
Abort incomplete multipart uploads; expire extracted/staging after validated load; transition/expire raw only under approved policy
```

## Cost Drivers

No total is defensible before source volume, provider, region and retention are known.

| Driver | Status |
|---|---|
| Worker CPU/memory/runtime | OWNER INPUT REQUIRED after benchmark |
| Scratch disk and network | UNKNOWN |
| Raw/extracted/log object storage | UNKNOWN |
| Dedicated PostgreSQL compute/storage/IOPS | OWNER INPUT REQUIRED |
| PITR and backup retention | OWNER INPUT REQUIRED |
| Inter-region egress | Avoid by co-location; price UNKNOWN |
| Logs/metrics retention | OWNER INPUT REQUIRED |

Official provider references consulted: Vercel Function limits, GitHub Actions runner limits, Supabase Edge Function limits, Supabase database backups, AWS Batch retries/timeouts and Amazon S3 multipart/lifecycle documentation.
