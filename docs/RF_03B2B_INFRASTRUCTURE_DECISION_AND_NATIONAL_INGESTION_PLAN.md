# RF-03B.2B — Infrastructure Decision & National Ingestion Plan

> **TARGET DEFERRED — NATIONAL PRODUCTION BUDGET GATE REQUIRED.** For the current pre-revenue phase, the governing decision is `RF_03B2B_ZERO_INCREMENTAL_COST_PRE_REVENUE_PLAN.md`. Nothing in this target plan authorizes purchase, provisioning or national ingestion.

Date: 2026-09-18  
Scope: architecture and decision package only. No provisioning, purchase, production change, national ingestion or publish was performed.

## 1. Executive Decision Summary

Adopt a **dedicated RF PostgreSQL project + private versioned object storage + ephemeral container batch worker**, physically separated from the GSBC transactional database. Publish with a transactional version pointer; keep the previous two full versions and immutable change events. Process partitions sequentially, use durable checkpoints and acquire a dataset lease before any download.

Recommended scenario: **B — Recommended production**.

| Owner question | Decision |
| --- | --- |
| Database | Dedicated PostgreSQL, 16 vCPU / 64 GB RAM class, 2 TB gp3 starting allocation |
| Object storage | S3-compatible private bucket; RAW-6 retention, versioning and lifecycle |
| Worker | Ephemeral 8 vCPU / 16-32 GB RAM / 100-200 GB encrypted scratch |
| Expected cost | USD 1,400-1,800/month; quote before purchase |
| Monthly window | 18-30 h planning window; 36 h hard operational window |
| Publish | Metadata-only pointer switch in one transaction |
| Rollback | Metadata-only to N-1, target RTO under 15 minutes |
| Main unknown | QSA database density and production network/IO performance |
| Purchase needed | Dedicated DB, worker runtime, object storage, monitoring/recovery |
| Not needed | Kafka, Spark, Kubernetes, external search engine or distributed DB |
| Authorization requested | Approve Scenario B procurement/provisioning and only then a separately gated first national ingestion |

## 2. Evidence From RF-03B.2A

- Estabelecimentos: 339,164,748 compressed bytes, 1,079,385,539 extracted bytes, 4,753,435 rows, zero rejected.
- Simples: 308,027,792 compressed bytes, 3,174,996,384 extracted bytes, 50,396,768 national rows, zero rejected.
- Joins: 50,000/50,000 for Company-Establishment and Company-Simples; no sample orphan.
- Indexed lookups were sub-10 ms on 50k-row local samples. They are evidence of index choice, not national SLO proof.
- Peak sampled RSS was below 390 MB per parser phase. Database load/index build dominates the national resource decision.
- Two independent executions produced identical source bytes, ETags, SHA-256 and counts. This supports determinism and proves the need for a mandatory lease.

## 3. National Dataset Inventory

Inventory is from the validated 2026-09 official manifest. Counts and compressed bytes are MEASURED.

| Family | Files | Compressed bytes | Production role | Key/relationship |
| --- | ---: | ---: | --- | --- |
| Empresas | 10 | 1,378,757,366 | Legal entity root | `cnpj_root` |
| Estabelecimentos | 10 | 5,381,336,206 | Full CNPJ, location, status, CNAE | root to Empresa; canonical CNPJ |
| Sócios/QSA | 10 | 690,732,909 | Public QSA, separately governed | `cnpj_root` to Empresa |
| Simples/MEI | 1 | 308,027,792 | Option flags and effective dates | `cnpj_root` |
| CNAEs | 1 | 22,078 | Reference | CNAE code |
| Municípios | 1 | 43,443 | Reference | municipality code |
| Naturezas | 1 | 1,563 | Reference | legal nature code |
| Qualificações | 1 | 980 | Reference | qualification code |
| Países | 1 | 2,745 | Reference | country code |
| Motivos | 1 | 1,180 | Reference | registration reason code |

Total: 37 ZIPs and 7,758,926,262 compressed bytes. QSA is required for the complete public dataset but remains **UNKNOWN / NOT BENCHMARKED** for canonical density and privacy lifecycle.

## 4. Assumptions & Unknowns

| ID | Premise | Type | Evidence/confidence | Impact if wrong |
| --- | --- | --- | --- | --- |
| A1 | 238 GB floor per canonical version for three measured groups | DERIVED | RF-03B.1/2A, medium | DB undersizing |
| A2 | Three full canonical versions require ~714 GB before QSA/diff/provenance | DERIVED | arithmetic, medium | retention pressure |
| A3 | QSA canonical size | UNKNOWN | no authorized benchmark | capacity and privacy increase |
| A4 | 0.9-1.4 TB steady state | EXTRAPOLATED | measured groups plus margins, medium-low | cost/tier changes |
| A5 | 1.8-3.0 TB combined peak envelope | EXTRAPOLATED | staging/WAL/temp model, low-medium | low-disk incident |
| A6 | Sequential extraction fits 100-200 GB worker scratch | ASSUMPTION | largest measured extraction 3.17 GB, medium | worker disk increase |
| A7 | Production can reach Receita reliably | UNKNOWN | local/VPN only | delayed freshness |
| A8 | PostgreSQL-first search meets national p95 | ASSUMPTION | sample plans, medium-low | index/search redesign |
| A9 | Supabase published prices remain valid at purchase | ASSUMPTION | official page checked 2026-09-18 | budget changes |

## 5. Target Architecture

```text
Official WebDAV -> Discoverer -> dataset lease -> Downloader
-> encrypted RAW object storage -> verification/manifest
-> ephemeral extraction -> streaming parser -> rf_raw staging
-> validation/reconciliation -> rf_canonical version partitions
-> indexes/ANALYZE -> diff/anomaly gate -> atomic current pointer
-> read-only RF query service -> tenant-scoped GSBC links
```

Manifest, logs, quality checks, change events and run metrics are durable. Extracted files and worker scratch are ephemeral. Staging is never an application source.

## 6. Storage Architecture

Bucket prefix:

```text
rfb-cnpj/{dataset_version}/raw/
rfb-cnpj/{dataset_version}/manifests/
rfb-cnpj/{dataset_version}/logs/
rfb-cnpj/{dataset_version}/evidence/
```

Do not retain extracted CSVs after verified load. RAW-6 retains six competencies; manifests, hashes and publication evidence are long-lived. Encryption, versioning, deny-public policy and lifecycle are mandatory. The worker writes only its run prefix. Database and object-storage credentials are distinct.

## 7. Database Architecture

Use existing `rf_raw` and `rf_canonical` ownership boundaries. Add future schema changes only in the implementation phase. Canonical CNPJ remains uppercase alphanumeric text; never numeric.

- `COPY` into landing/staging; avoid row inserts.
- UNLOGGED landing may be used only for reproducible transient data; canonical remains logged.
- Build non-essential indexes after bulk load; preserve uniqueness and integrity gates.
- Partition large canonical tables by `dataset_version_id` where production tests prove operational benefit.
- `ANALYZE` before pre-publish queries; VACUUM only from measured need.
- Keep RF global read models separate from tenant RLS links in `public.rf_company_links`.

## 8. Worker Architecture

Container batch job, never an HTTP request. Recommended: 8 vCPU, 16-32 GB RAM, 100-200 GB encrypted scratch, 36 h timeout. Process one large ZIP at a time; upload/download markers and checkpoints after each verified phase.

State model:

```text
created -> downloading -> downloaded -> verified -> extracting -> extracted
-> loading -> loaded -> validating -> validated -> indexing
-> ready_to_publish -> publishing -> published -> cleanup -> completed
```

Retries use exponential backoff with jitter for network/storage/temporary DB errors. Schema, hash, reconciliation and constraint failures are deterministic: no blind retry.

## 9. National Capacity Model

| Component | Expected | Recommended | Safety floor | Class |
| --- | ---: | ---: | ---: | --- |
| Canonical, one version (known groups) | 238 GB | 300 GB | 250 GB | DERIVED + margin |
| Three versions + QSA/references/provenance | 0.9 TB | 1.2 TB | 0.8 TB | EXTRAPOLATED |
| DB staging/WAL/index headroom | 0.4 TB | 0.8 TB | 0.3 TB | EXTRAPOLATED |
| Provisioned DB disk | 1.5 TB | 2.0 TB | 1.25 TB | DECISION |
| Worker scratch | 100 GB | 200 GB | 75 GB | ASSUMPTION |
| RAW-6 object storage | 47 GB baseline | 75 GB | 60 GB | MEASURED + growth |

The Recommended 2 TB tier requires strict sequential staging cleanup and a 70% alert. If forecast or actual use exceeds 70%, increase capacity before the next cycle.

## 10. Disk Lifecycle / Peak Model

| Phase | Raw | Extracted | Staging | Current/previous | Index/WAL/temp | Peak responsibility |
| --- | --- | --- | --- | --- | --- | --- |
| Discover/download | object storage | none | none | 3 versions | small | object store |
| Extract/load file | object storage | one file on worker | grows | 3 versions | WAL grows | worker + DB |
| Validate/index | object storage | removed per file | candidate complete | 3 versions | index/WAL high | DB peak |
| Publish | object storage | none | candidate | N/N-1/N-2 | low metadata | DB |
| Cleanup | RAW-6 | none | removed | 3 versions | reclaim/checkpoint | DB/object store |

Never start when projected peak exceeds 80% provisioned disk. Warn at 65%, block at 75%, emergency at 85%.

## 11. Memory & Compute Model

Streaming parsers measured below 390 MB RSS, but national index creation, COPY and PostgreSQL cache need materially more. Recommended worker 8 vCPU/16-32 GB allows two lightweight stages but only one heavy file pipeline. Recommended DB 16 vCPU/64 GB aligns with the provider's 2 TB recommended DB class. Do not assume linear speedup.

## 12. Index Strategy

- Unique B-tree `(dataset_version_id, cnpj_canonical)` and `(dataset_version_id, cnpj_root)`.
- B-tree for company relation, CNAE, `(state, municipality_code)`, status, Simples and MEI filters.
- Prefix normalized legal/trade-name index with `text_pattern_ops` after production cardinality test.
- `pg_trgm` GIN only if substring-name search p95 breaches target and write/index cost is accepted.
- Partial indexes only for stable high-value predicates such as current active records.
- No duplicate single-column index when a composite left prefix already serves the query.

## 13. Search Strategy And Internal SLOs

PostgreSQL-first. Internal targets after warm-up: exact CNPJ p95 <=100 ms; Company+Establishment <=200 ms; Company+Simples <=200 ms; filtered search <=1 s; paginated prospecting <=2 s. These are engineering targets, not contractual SLA.

Evaluate external search only after two consecutive cycles show target failure despite query/index tuning, or name search exceeds 10 requests/s sustained and materially harms ingestion/OLTP.

## 14. Monthly Ingestion Lifecycle

1. Discover stable official manifest and reference month.
2. Acquire unique lease `(source, dataset_version)` before heavy network work.
3. Reuse verified RAW when ETag, size and local SHA-256 match.
4. Download missing files with host/redirect/length/ZIP guards.
5. Stream-extract, parse and COPY one partition at a time.
6. Reconcile every file and group; checkpoint success.
7. Normalize into candidate version; build indexes and ANALYZE.
8. Run hard validation, joins, anomaly and diff gates.
9. Owner-controlled first publish; later publish remains policy-controlled.
10. Switch current pointer transactionally and run post-publish probes.
11. Retain N/N-1/N-2, apply RAW-6 and idempotent cleanup.

Scheduler runs monthly from a managed batch scheduler. It creates a run, not a browser session. A unique DB lease has owner, heartbeat, expiry and controlled staff override. Stale leases are recovered only after heartbeat expiry and audit entry.

## 15. Validation Gates

Hard gates: expected files, allowed source, size/hash or ETag integrity, ZIP safety, schema fingerprint/column count, CNPJ canonical rules, source=parsed+rejected, accepted=loaded, uniqueness, required joins, same dataset version, required indexes, anomaly thresholds and post-publish smoke test.

Warnings: non-critical nullable field drift, throughput regression under threshold, moderate source volume change. Informational: timing, compression and distribution metrics. Every group records source, parsed, accepted, rejected, loaded and published rows; no silent loss.

## 16. Publication Strategy

Use a transactional metadata pointer: lock source publication, verify candidate `READY`, retire current version, mark candidate `PUBLISHED/is_current=true`, write immutable publication event and commit. Queries resolve current version once per transaction. Do not rename huge tables or move rows during publish.

## 17. Rollback Strategy

Dataset rollback is not backup/DR. Under an audited staff action, lock publication, verify N-1 is complete, flip the pointer to N-1 and record reason/actor/from/to. No reingestion or row movement. Target RTO: <=15 minutes. Keep at least N-1 fully indexed and queryable; policy retains N/N-1/N-2.

## 18. Failure Recovery Matrix

| Phase | Possible residue | Restart/cleanup | Published affected? |
| --- | --- | --- | --- |
| Download | partial object | resume or delete incomplete marker | No |
| Verify/extract | bad/partial scratch | fail closed; remove scratch | No |
| Load | staged partition | resume checkpoint or drop candidate only | No |
| Validate/index | candidate tables/indexes | repair/rebuild candidate | No |
| Publish | transaction | atomic rollback or committed pointer | No partial state |
| Post-publish | new current visible | rollback pointer to N-1 | Briefly possible |
| Cleanup | old temporary artifacts | idempotent retry; never active/N-1 | No |

## 19. Observability

Metrics: run/version/phase, elapsed time, bytes, files, rows/s, parsed/rejected/loaded/published, DB/index/WAL/temp size, disk, RAM peak, publish/rollback time, retry/failure count and lock age. Structured logs include `run_id`, version, phase, file, timestamp, result and error code, never secrets.

Alert on download/hash/reconciliation/validation/publish/cleanup failure, low disk, capacity trend, stuck lease, stale dataset, query p95 regression and cost-budget breach.

## 20. Security & Least Privilege

Separate identities for discovery/read source, object write, staging load, publish, application read and rollback administration. Service credentials remain server-side in a secret manager. Application users receive read-only global RF views; tenant data remains governed by existing tenant RLS. Global RF data, tenant operations and enrichment are separate datasets and provenance domains.

## 21. Backup/DR Interaction

PITR/backup protects database failure and operator error; version rollback handles a bad RF publication. RAW object storage permits deterministic rebuild but is not a database backup. The previously approved recovery baseline remains unchanged. Exact backup cost and restore RTO at the selected 2 TB tier are **UNKNOWN pending provider quote and restore rehearsal**.

## 22. Cost Model

Official Supabase pricing checked 2026-09-18: 4XL (16 vCPU/64 GB) USD 960/month; 8XL USD 1,870; gp3 disk after 8 GB USD 0.125/GB-month; 3,000 IOPS and 125 MB/s included. Pro is USD 25 with USD 10 compute credit. Cloudflare R2 Standard is USD 0.015/GB-month with 10 GB-month free and no direct egress fee.

Sources: https://supabase.com/pricing, https://supabase.com/docs/guides/platform/compute-and-disk, https://developers.cloudflare.com/r2/pricing/.

| Component, Scenario B | Monthly estimate | Nature |
| --- | ---: | --- |
| Supabase Pro + net 4XL compute | ~USD 975 | fixed |
| 2 TB gp3 database disk | ~USD 255 | fixed/growth-sensitive |
| Worker + scratch | USD 75-200 | variable |
| R2 RAW-6/manifests | USD 1-5 | growth-sensitive |
| Backup/PITR/monitoring | USD 100-300 | TBD/provider-sensitive |
| Total | **USD 1,400-1,800** | planning range |

No purchase is authorized. PITR, IOPS, throughput, taxes, region and support require a checkout quote.

## 23. Infrastructure Scenarios

| Item | A — Minimum controlled | B — Recommended | C — Growth-ready |
| --- | --- | --- | --- |
| DB | 8 vCPU/32 GB | 16 vCPU/64 GB | 32 vCPU/128 GB |
| DB capacity | 1.25 TB | 2 TB | 3 TB |
| Worker | 4 vCPU/16 GB/100 GB | 8 vCPU/16-32 GB/200 GB | 16 vCPU/32 GB/300 GB |
| Headroom | low; tight retention | ~30% operational | >40% |
| Rollback | N-1, cleanup pressure | N-1/N-2 online | N-1/N-2 plus faster rebuild |
| Expected cost | USD 750-1,050 | USD 1,400-1,800 | USD 2,600-3,300 |
| Main risk | disk/window overrun | QSA/IO uncertainty | paying before demand |

A accepts a material disk and monthly-window risk to save money and is not recommended for first national publication. C buys faster indexing and growth room but is premature. B is the smallest class aligned with the provider's recommended 2 TB compute tier and measured retention model.

## 24. Recommended Scenario

Select B. Start at 2 TB, 16 vCPU/64 GB, sequential pipeline and 200 GB worker scratch. Upgrade when any occurs: DB >70% forecast before next cycle; ingestion >30 h twice; index build >8 h; exact-CNPJ p95 >100 ms or filtered p95 >1 s after tuning; WAL/temp breaches modeled reserve; annual dataset growth >20%; QSA benchmark raises steady projection above 1.4 TB.

## 25. Risks

| Risk | Probability | Impact | Detection | Mitigation | Residual |
| --- | --- | --- | --- | --- | --- |
| Dataset growth | M | H | manifest trend | 30% headroom/upgrade trigger | M |
| Disk exhaustion | M | Critical | 65/75/85% alerts | preflight hard gate | L-M |
| Source unavailable | M | M | discovery/download alert | retries; keep current | L |
| Format change | M | H | schema fingerprint | hard stop | L |
| Load/index failure | M | H | job/DB metrics | candidate isolation/checkpoint | M |
| Publish failure | L | Critical | transaction/post-check | atomic pointer | L |
| Duplicate run | M | H | unique lease | heartbeat/expiry/audit | L |
| Partial cleanup | M | M | residue checks | idempotent cleanup | L |
| Stale data | M | M | freshness SLO | alert/manual escalation | M |
| Query degradation | M | H | p95/index telemetry | tune/scale trigger | M |
| Rollback failure | L | Critical | monthly rehearsal | keep indexed N-1 | L-M |
| Cost escalation | M | H | budget alerts | quote/caps/review | M |
| QSA privacy/capacity | M | H | separate gate | minimization/benchmark | M |

## 26. Owner Decisions Required

1. Approve or reject Scenario B budget envelope.
2. Select provider/region and recovery add-ons after written quote.
3. Approve a separately bounded QSA readiness step before national QSA handling.
4. Authorize infrastructure provisioning; this document does not do so.
5. After provisioning and validation, separately authorize first national ingestion and first publish.

## 27. Next Stage Plan

Name: **RF-03B.3 — First National Ingestion Infrastructure Validation**. It must verify source integrity, reconciliation, alphanumeric CNPJ fixtures, joins, search/index plans, global-versus-tenant isolation, lease exclusion, failure recovery, publish/rollback rehearsal and zero unexpected residue. Start with infrastructure smoke/capacity tests and require another explicit gate before downloading all 37 ZIPs.

## 28. Final Gates

RF-03B.2B Gate: PASS — INFRASTRUCTURE DECISION PACKAGE COMPLETE

RF-03B.3 Readiness: READY FOR OWNER INFRASTRUCTURE AUTHORIZATION

No infrastructure is authorized by these lines.

## Decision Log

| Decision | Alternatives | Evidence / why | Trade-off / revisit |
| --- | --- | --- | --- |
| Dedicated RF DB | shared GSBC DB | isolates WAL, locks, recovery and tenants | extra cost; revisit after stable utilization |
| PostgreSQL-first | external search | indexed benchmark and simpler operations | revisit on objective p95 trigger |
| Metadata pointer | table rename/row copy | atomic and rollback without movement | all queries must bind version |
| RAW-6 | RAW-12/no RAW | cheap rebuild evidence with bounded retention | revisit legal/recovery need |
| Scenario B | A/C | smallest tier aligned with 2 TB provider guidance | quote and QSA may change tier |
| Lease before download | informal coordination | duplicate benchmark incident | administrative override needs audit |

## Owner Authorization Requested

Approve **only** the procurement/provisioning design for Scenario B, subject to a current provider quote and recovery options. Do not yet authorize national download, ingestion or publication.
