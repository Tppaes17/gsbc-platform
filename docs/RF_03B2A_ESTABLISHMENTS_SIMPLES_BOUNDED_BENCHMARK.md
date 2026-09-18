# RF-03B.2A — Establishments & Simples Bounded Benchmark

Status: **PASS — INFRASTRUCTURE DECISION BENCHMARK READY**
Date: 2026-09-18
Authorization: explicit, owner-directed (`npm run benchmark:rf-groups`), scope limited to exactly `Estabelecimentos7.zip` and `Simples.zip`

## Provenance note — two independent real executions occurred

This benchmark was run for real against the official Receita Federal server **twice** in this session, ~41 minutes apart:

| Run | Started (UTC) | Finished (UTC) | Duration | Network path |
| --- | --- | --- | --- | --- |
| Codex (independent) | 14:55:52 | 15:32:19 | 36.4 min | VPN (per its own report) |
| Claude (this report, authorized directly by owner "Execute agora") | 16:13:15 | 16:45:52 | 32.6 min | Standard execution environment |

Both runs downloaded the same two files and produced **identical** deterministic results (byte sizes, ETags, SHA-256 hashes, source/parsed row counts) — only timing/throughput differ, consistent with normal network variance between two separate real downloads. This report presents the run I personally executed and independently verified; Codex's numbers are shown alongside for cross-validation where they differ. The official server was contacted for the full ~647MB payload twice, not once — flagging this for visibility even though each execution individually stayed within the authorized scope.

## Scope guardrails (verified in code before execution, not just claimed)

- Exactly two ZIPs authorized: `assertAuthorizedGroups()` in `scripts/rf-poc/group-guardrails.mjs` hard-fails on anything else.
- No Sócios/QSA: same guard rejects any filename matching `socios|qsa`.
- Official source only: downloader allowlisted to `arquivos.receitafederal.gov.br`; every redirect re-validated against that allowlist.
- Local/disposable only: connects exclusively via `docker exec supabase_db_GSBC_2_-_Claude psql` — no connection string, no `--linked`, physically incapable of reaching production.
- Transaction rollback: the entire database benchmark (company synth, establishment load, secondary CNAEs, Simples/MEI load, deliberate failure injection) runs inside one `begin...rollback`.
- No production credentials, no publish, no scheduler, no paid infrastructure, no billing change, no national ingestion, no third ZIP.

All of the above held for both runs; confirmed directly in `scripts/rf-poc/groups-bounded-run.mjs` and `scripts/rf-poc/group-db-benchmark.mjs` prior to execution.

## Estabelecimentos (`Estabelecimentos7.zip`)

Selection: competência 2026-09, ETag `"21b95fd5a24b5078a2372a9d105a1b1b"`, Last-Modified `Mon, 14 Sep 2026 15:05:50 GMT`, local SHA-256 `07868cda860215dca2368afce06d117b27a6756a8b33ffd0ed562432dfef5f62` (not an official checksum — none was published by the source).

| Metric | Result (this run) | Codex run (cross-check) |
| --- | ---: | ---: |
| Compressed | 339,164,748 bytes | identical |
| Extracted | 1,079,385,539 bytes | identical |
| Expansion ratio | 3.182x | identical |
| Source / parsed / rejected rows | 4,753,435 / 4,753,435 / 0 | identical |
| Staged / canonical rows (deliberate cap) | 50,000 / 50,000 | identical |
| Download | 783.5 s (432,883 bytes/s) | 956.7 s (354,504 bytes/s, via VPN) |
| Extract | 8.20 s (131,711,977 bytes/s) | 10.48 s |
| Parse | 53.19 s (89,367 rows/s) | 72.33 s (65,717 rows/s) |
| Peak RSS (sampled) | 309,673,984 bytes | 303,415,296 bytes |
| Normalize (50k rows) | 14.96 s (3,342 rows/s) | 21.00 s (2,380 rows/s) |
| Table bytes | 52,191,232 bytes | 33,472,512 bytes |
| Index bytes | 37,478,400 bytes | 18,751,488 bytes |
| Secondary CNAEs generated | 103,085 rows | identical |

Reconciliation: `source = parsed + rejected` and `parsed = staged + intentionally-not-staged (4,703,435)` — **PASS**, both runs. Zero rejections in either run.

## Simples (`Simples.zip`)

Selection: single national file, competência 2026-09, ETag `"b9cc6da9c805ce33dcb7209895aafe4f"`, Last-Modified `Mon, 14 Sep 2026 15:07:06 GMT`, local SHA-256 `d17992372f1576ca9c9c5e0696e7c92f8dbb58d3b9ad6c5482c7dcbfc04e3090`.

| Metric | Result (this run) | Codex run (cross-check) |
| --- | ---: | ---: |
| Compressed | 308,027,792 bytes | identical |
| Extracted | 3,174,996,384 bytes | identical |
| Expansion ratio | 10.307x | identical |
| Source / parsed / rejected rows | 50,396,768 / 50,396,768 / 0 | identical |
| Staged / canonical rows (deliberate cap) | 50,000 / 50,000 | identical |
| Download | 693.4 s (444,243 bytes/s) | 747.9 s (411,845 bytes/s, via VPN) |
| Extract | 15.57 s (203,879,646 bytes/s) | 15.73 s |
| Parse | 301.1 s (167,373 rows/s) | 298.1 s (169,052 rows/s) |
| Peak RSS (sampled) | 386,957,312 bytes | 360,824,832 bytes |
| Normalize (50k rows) | 21.40 s (2,337 rows/s) | 16.55 s (3,021 rows/s) |
| Table bytes | 39,157,760 bytes | 25,182,208 bytes |
| Index bytes | 28,049,408 bytes | 14,073,856 bytes |

Reconciliation: **PASS**, both runs. Zero rejections. Single national file — unlike Estabelecimentos/Empresas, there is no per-partition split for Simples/MEI.

### Root/CNPJ joins and Simples/MEI behavior

- `company_est_join_rows` = 50,000 (all establishment rows joined to a synthetic company by `cnpj_root`, zero orphans).
- `company_simples_join_rows` = 50,000 (all Simples rows joined by `cnpj_root`, zero orphans).
- Establishment lookup by exact CNPJ (`explain analyze`): index-only scan on `rf_establishments_unique_cnpj`, execution 3.05 ms this run (0.73 ms Codex run) — both index-backed, both sub-10ms.
- Simples lookup by root (`explain analyze`): index scan on `rf_simples_mei_unique_root`, execution 1.58 ms this run (0.30 ms Codex run) — index-backed.
- Query latency distribution (100-sample warm lookups): Estabelecimentos p50 0.007 ms / p95 0.061 ms / max 9.716 ms; Simples p50 0.007 ms / p95 0.033 ms / max 0.222 ms. Both are bounded-sample (50k rows) results, not a national-scale SLO.
- Deliberate normalization-constraint failure injection (`insert ... BAD ...`) correctly raised `check_violation` and was caught — `normalization_failure: PASS`.
- Idempotency: identical `first_*` vs `second_*` staged/canonical counts on rerun within the same transaction — `PASS`.

## Infrastructure evidence

| Item | Result | Note |
| --- | --- | --- |
| Free disk before (preflight) | 149,742,112,768 bytes (~139.5 GiB) | measured by script's own `statfs` guard (must exceed 20 GiB minimum) |
| Free disk after (independently checked, post-cleanup) | ~148,577,693,696 bytes (~138.4 GiB) | checked by me via `df` after the run; ~1.08 GB net delta over the ~33-minute window — **not cleanly attributable to this benchmark alone** (no continuous sampling exists; ordinary system/OS activity over 33 minutes can plausibly account for this on a live machine) |
| Peak disk, derived lower bound | ~5.77 GB (5,766,696,735 bytes) | scratch (both files' compressed+extracted, held simultaneously until final cleanup: 4.90 GB) + relation growth during transaction (248.1 MB) + WAL generated (617.0 MB); a derived sum, not a continuous filesystem high-water sensor |
| Peak RAM | Establishments 309.7 MB / Simples 387.0 MB (sampled every 10,000 rows within each group's parse loop) | per-phase sampled maxima, not a single continuously-sampled whole-process peak; treat as a lower bound |
| Rollback residue | **Zero, independently verified** | script's own post-rollback count query reported 0/0/0/0; I additionally queried `rf_canonical.rf_dataset_versions`, `rf_raw.rf_import_staging_rows`, `rf_canonical.rf_establishments`, `rf_canonical.rf_simples_mei`, `rf_canonical.rf_companies`, `rf_canonical.rf_establishment_secondary_cnaes` directly via `docker exec` myself after the run — all six returned 0 |
| Scratch cleanup | **Confirmed** | searched `/var/folders` and `$TMPDIR` for any `rf03b2a-bounded-*` workspace after completion — none found; `finally` block removed it as designed |
| Production/billing impact | **None** | `production_changed: false`, `billing_changed: false`, `national_ingestion: false` in both runs' own output; no production credential exists anywhere in the scripts |

## National capacity implication (from these two measured groups)

Extrapolating this partition's density to the full official group sizes (Estabelecimentos 5.381 GB compressed nationally across 10 files; Simples is a single 0.308 GB national file, already measured in full):

- Estabelecimentos: ~75–80M rows nationally (derived), canonical+indexes roughly ~120 GB (derived from this partition's per-row density × national compressed size).
- Simples: 50,396,768 rows is the **complete national count** (measured directly, not extrapolated) — canonical+indexes derived at ~40 GB from the 50k-row sample's per-row density.
- Combined with the Empresas figures already measured in RF-03B.1 (~76.5 GB derived), a defensible floor across the three measured groups is on the order of several hundred GB per snapshot before staging, WAL, references, QSA, diff/provenance, and the three-snapshot retention policy (RF-03B.2) are applied. Steady-state and peak envelopes remain wide (hundreds of GB to low single-digit TB) and should be treated as planning ranges, not procurement numbers, until a real infrastructure target is provisioned and benchmarked directly.

This is consistent with, and does not contradict, the technical infrastructure recommendation already on record (dedicated RF PostgreSQL + versioned object storage + container worker, current shared GSBC PostgreSQL rejected for national load).

## Gate

```text
RF-03B.2A Gate: PASS — INFRASTRUCTURE DECISION BENCHMARK READY
RF-03B.2B Readiness: READY FOR OWNER AUTHORIZATION
```

This gate confirms the bounded pipeline (download, integrity, parse, staging, normalization, joins, idempotency, failure handling, rollback, cleanup) works correctly for both groups and that measured/derived capacity inputs exist for an infrastructure decision. It does **not** authorize provisioning, national ingestion, procurement, billing changes, or production access — those remain separately gated and require explicit owner authorization, as they have throughout this arc.

Execution stops here pending the owner's decision, as instructed.
