# RF-03A Architecture Decision

Data: 2026-09-17.

## Recommended Architecture

```text
Vercel scheduler/orchestrator
  -> durable job request with dataset/manifest identity
  -> dedicated batch worker with bounded local scratch disk
  -> private S3-compatible object storage
  -> isolated RF staging PostgreSQL
  -> quality gates
  -> dedicated RF canonical PostgreSQL
  -> future logical publication to GSBC readers
```

Vercel deve apenas descobrir/agendar/acompanhar. Download, extracao, parsing, COPY, normalizacao e indexacao devem rodar em worker batch dedicado, recuperavel e com filesystem temporario dimensionado.

## Decision Matrix

| Option | Isolation | Recovery | Complexity | Current evidence | Decision |
|---|---|---|---|---|---|
| A. Current PostgreSQL + RF schemas | Low | Fail: no PITR/physical backup | Low | Insufficient capacity | Reject for national load |
| B. Dedicated RF PostgreSQL only | High DB isolation | Must be configured | Medium | No object lifecycle | Viable but incomplete |
| C. Object storage + current canonical DB | Medium | Raw recoverable, DB risk remains | Medium | Shared DB blast radius | Not recommended |
| D. Object storage + dedicated RF PostgreSQL | High | Independently configurable | Higher | Best fit for scale/failure | Recommended |

## Worker

**Recommended Worker:** dedicated batch worker/job. Required capabilities:

- runtime measured in hours rather than request duration;
- bounded concurrency and cancellation;
- retry/checkpoint per file;
- enough scratch disk for largest compressed plus extracted file;
- outbound access to official Receita and object storage;
- server-side secrets and isolated service role;
- structured logs and metrics;
- restart from manifest/checkpoint without duplicate canonical rows.

CI runner is acceptable only for another controlled POC. It is not the preferred recurring production worker. Vercel Functions are orchestration only.

## Storage

**Recommended Storage:** private dedicated S3-compatible object storage, separate from the transactional database, using:

```text
rfb-cnpj/{dataset_version}/raw/
rfb-cnpj/{dataset_version}/extracted/
rfb-cnpj/{dataset_version}/manifest/
rfb-cnpj/{dataset_version}/logs/
```

Requirements: encryption, private ACL, lifecycle, retention lock as appropriate, multipart/resume, checksum metadata, least-privilege worker identity and tested restore/reprocess. Supabase Storage remains a possible staging alternative only after largest-file, cost, lifecycle and recovery validation.

## Bulk And Staging

- Use native `COPY` into disposable staging.
- Normalize set-wise; never ORM row-by-row.
- Keep staging isolated from current application workload.
- Create expensive indexes after bulk load when benchmark proves advantageous.
- Run quality/referential checks before publication.
- Publication remains a later explicit phase; RF-03A creates no activation path.

## Retention

Proposed pending cost measurement:

- canonical: active plus immediately previous version;
- manifests/checksums/job audit: long-term;
- raw archives: at least through successful publication and tested reprocessing, then lifecycle according to legal/operational policy;
- extracted files and staging: ephemeral, deleted after validated load;
- tenant links/classifications/decisions/audit: retained under GSBC domain policy and backup, never discarded with RF raw data.

Status: **Proposed - requires human architecture and cost approval**.
