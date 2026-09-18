# RF-03B.2B — Zero-Incremental-Cost Pre-Revenue Plan

Date: 2026-09-18  
Decision status: governing architecture for DEVELOPMENT / PRE-REVENUE.

## 1. Executive Decision Summary

GSBC can continue RF development without new infrastructure. Heavy processing stays local and controlled; only deterministic, relevant, bounded canonical records may later be loaded into existing infrastructure after a measured capacity gate. National recurring ingestion remains deferred.

## 2. Budget Constraint

Incremental infrastructure target: **USD 0**. No new Supabase/Vercel tier, worker, database, storage, add-on or observability service is authorized. Existing machine time, disk, internet and developer effort are indirect existing costs, not free resources.

## 3. Evidence From RF-03B.2A

The official bounded benchmark proved streaming parsing, alphanumeric-safe identifiers, deterministic hashes, zero rejection for 4,753,435 Establishments and 50,396,768 Simples rows, indexed joins, idempotency and zero DB residue. It also proved that full processing is too large to treat as ordinary web runtime work.

## 4. Current Infrastructure Inventory

- Existing local Mac and Docker PostgreSQL 17.6.
- Existing GSBC Supabase project and Vercel deployment; no paid change authorized.
- Existing `rf_raw`/`rf_canonical` schemas and tenant-scoped `rf_company_links` boundary.
- Existing official-source probe, safe downloader/parser, local benchmark and lifecycle tooling.
- New offline controlled-dataset tooling in `scripts/rf-controlled/`.

No production secrets are required by the new tooling.

## 5. Available Capacity

Local measurement on 2026-09-18: database 246,025,363 bytes; user indexes 231,424,000 bytes; RF schemas 229,187,584 bytes; local filesystem about 68% used with ~137 GiB available. This is development evidence only.

Remote read-only `table-stats` on 2026-09-18 showed zero rows in every `rf_raw`/`rf_canonical` table and approximately 632 KiB allocated to those RF relations (~696 KiB including tenant-scoped `public.rf_company_links`). The largest existing application relations were still below 1 MiB each. These values are **MEASURED current use**, not provisioned capacity.

The remote provisioned disk limit did not return from the available inspection command and is **UNKNOWN**. Consequently safe cloud headroom and a numeric cloud controlled-dataset limit are also **UNKNOWN**. Cloud expansion remains `STOP EXPANSION` until capacity, current total DB bytes, RF bytes and estimated delta are all supplied to the gate. No remote load was performed.

## 6. MODE A — Zero-Cost Architecture

```text
Official source -> local controlled processing -> deterministic curated package
-> human/capacity gate -> transactional controlled import -> existing GSBC reads
```

The laptop is a temporary execution environment, not production infrastructure. Web requests never perform heavy processing.

## 7. Controlled Dataset Strategy

Use a hybrid model:

1. A tiny sanitized fixed fixture for tests and CI.
2. A real curated package selected by demonstrated operational relevance.
3. Load-on-relevance growth for searched/imported prospects and approved pilot universes.

Do not use changing random samples. Real records are never represented as fixtures, and fixtures are never shown as Receita facts.

## 8. Selection Rules

At least one explicit selector is mandatory: canonical CNPJ, root, UF, municipality or CNAE. Selection is OR-based, normalized, deterministically sorted and capped at 50,000 records per package. Policy must record dataset version, source date, source manifest hash, parser version and maximum rows.

The first pilot should use 1-2 owner-selected sindicatos and an approved list of CNPJs or CNAE+territory universe. No fixed company count is promised before the capacity gate.

## 9. Local Processing Architecture

Reuse official host, redirect, byte-count, ZIP and parser guards. Acquire dataset-version lock before download. Stream download/extraction/parsing; create curated JSON package with stable record hash and package hash; validate; remove RAW/extracted files after evidence is preserved. Never repeat completed national downloads without owner authorization.

## 10. Cloud Persistence Strategy

Persist only relevant canonical records, dataset metadata, manifest/hash reference, freshness and necessary audit evidence. Do not persist all ZIPs or extracted files. `rf_raw` may remain local/transient; application reads canonical data only. No data is duplicated per tenant.

## 11. Provenance & Freshness

Every package includes dataset version, source reference date, source manifest SHA-256, parser version, deterministic selection policy, row count, records hash, package hash and generated timestamp. UI/API consumers must expose source reference and publication time; stale data must not be presented as real-time lookup.

## 12. Capacity Guardrails

The implemented gate requires explicit capacity evidence and reserves at least 30%. It limits controlled RF footprint to the smaller of 10% of provisioned capacity or 500 MiB. Expansion passes only when both projected DB usage stays within 70% and controlled RF stays below its cap.

```text
missing capacity evidence -> STOP EXPANSION
guardrail failure -> CONTROLLED DATASET EXPANSION: PAUSED
```

No automatic upgrade follows a stop.

## 13. Search & Query Validation

PostgreSQL remains the only search engine. Validate exact CNPJ, name, CNAE, UF, municipality, Simples/MEI and joins against the curated package. Preserve the RF-03B.2 internal targets as diagnostics, not SLA. Query regression pauses expansion.

Local transactional fixture validation passed exact CNPJ (including `00ABC000E08G12`), company-name prefix, CNAE, UF+municipality, Simples/MEI, Company-Establishment and Company-Simples queries. This proves behavior against the real schema with two sanitized rows; it does not establish national latency.

## 14. Prospect Integration

Intended flow: Prospect -> relevance event -> curated RF evidence -> qualification -> optional Company promotion. RF factual data, enrichment, inferred territorial/activity signal, opportunity score and human decision remain separate. No score creates legal or union classification.

The local validation created a temporary prospect evidence record, retained `source=RF`, required `HUMAN_REVIEW`, linked it to the matching company and rolled the entire transaction back. No production prospect or company was changed.

## 15. Opportunity Engine Readiness

The controlled dataset is sufficient to develop ranking, filters and evidence presentation. IA may suggest or summarize but cannot decide enquadramento, obligation, cobrança or legal conclusion. Absence of a record is not evidence of closure.

## 16. Controlled Update Lifecycle

```text
detect release -> acquire lock -> identify relevant universe
-> process locally -> verify manifest/schema -> generate curated delta
-> capacity and human review -> transactional import -> post-check
-> release lock -> cleanup
```

Baseline and delta are compared locally when safe. The source does not provide a trusted delta, so no difference is invented. Each phase is idempotent.

## 17. Publication & Rollback

For small controlled loads, use one DB transaction and a versioned package identity. A failed transaction publishes nothing. Preserve the immediately previous curated package/metadata for rebuild or pointer rollback. This is proportional MODE A recovery and is **not** national production rollback or DR.

Verified support: transaction rollback, idempotent retry by unique dataset keys, deterministic rebuild from a validated package and preservation of an earlier curated package outside the transaction. Change-set reversal and national pointer rollback were not implemented in MODE A.

## 18. Duplicate-Run Protection

`scripts/rf-controlled/controlled-lib.mjs` creates an atomic `0600` local lock per dataset version. It records lock ID, executor, acquisition and heartbeat; rejects an active second executor; permits stale recovery after an explicit TTL; and verifies ownership on heartbeat/release. A future cloud importer must add a PostgreSQL lease before any cloud write.

## 19. Security

No service role is needed to build packages. Any future import is server-side only, least-privileged and tenant-boundary tested. Global RF data remains separate from GSBC tenant operations and third-party enrichment. CNPJ remains uppercase alphanumeric text.

## 20. Observability

Use structured local logs and existing platform telemetry: dataset/run/phase, bytes, rows, rejection, duration, DB/index growth and errors. Preserve manifest and aggregate metrics; remove heavy temporary data. Paid observability is deferred.

Direct post-test queries independently returned `0,0,0,0` for dataset, company, establishment and Simples fixture residue. A filesystem search found no controlled scratch directory or lock. Cleanup tooling now rejects targets outside its controlled root and verifies absence after removal.

## 21. Pilot Operating Model

Owner defines 1-2 pilot sindicatos and relevance policy. Operator records preflight capacity, builds and reviews a curated package, runs security/query tests, imports transactionally, verifies counts/freshness, and records cleanup. Expansion pauses on capacity, performance, workload-health or storage failure.

## 22. Risks

| Risk | Probability | Impact | Detection | Mitigation | Residual |
| --- | --- | --- | --- | --- | --- |
| Cloud headroom unknown | H | H | capacity gate | fail closed | L before load |
| Dataset overgrowth | M | H | 10%/500 MiB cap | pause expansion | L |
| Source unavailable/change | M | M/H | fetch/schema guards | retain current; hard stop | M |
| Stale RF data | M | M | freshness metadata | visible reference/refresh runbook | M |
| Duplicate processing | M | H | lock/lease | atomic lock + hashes | L |
| Local disk exhaustion | M | H | disk preflight | streaming/cleanup/reserve | L-M |
| Incomplete cleanup | M | M | residue check | idempotent cleanup | L |
| Query degradation | M | M | p95/query plans | pause and tune | M |
| Pilot scope creep | M | H | policy/max rows | owner review | L-M |
| Accidental national load | L | Critical | max rows/capacity gate | no national command | L |
| MODE A called production-ready | M | H | gate wording | explicit labels | L |

## 23. MODE B — Deferred National Architecture

The national target remains documented in `RF_03B2B_INFRASTRUCTURE_DECISION_AND_NATIONAL_INGESTION_PLAN.md`: dedicated PostgreSQL, worker, object storage, monthly automation, production observability and national rollback. It is not current architecture and no purchase is authorized.

## 24. Budget Gate Triggers

Reopen `NATIONAL PRODUCTION BUDGET GATE` when a client needs national coverage, revenue supports capacity, controlled RF reaches its guardrail, monthly national freshness becomes required, availability/rollback requirements change, or controlled processing becomes operationally inadequate.

## 25. Owner Decisions Required

- Identify pilot sindicatos and approve the first deterministic relevance policy.
- Supply/authorize read-only measurement of real cloud DB capacity before any cloud import.
- Approve a separately reviewed controlled import after capacity, tenant and rollback tests pass.

## 26. Next Stage

RF-03B.3 — Controlled Pre-Revenue Implementation Validation: use sanitized fixtures first, prove package generation, capacity fail-closed behavior, duplicate lock, tenant isolation, transactional import/rollback and zero residue. A real curated load requires a distinct owner gate.

## 27. Final Gates

RF-03B.2B Gate: PASS — ZERO-INCREMENTAL-COST ARCHITECTURE APPROVED

RF-03B.3 Readiness: READY FOR CONTROLLED PRE-REVENUE IMPLEMENTATION

National Production Ingestion: DEFERRED — BUDGET GATE REQUIRED

This readiness does not mean production-ready, national-ingestion-ready, national-rollback-ready or monthly-automation-ready.

## Implementation Audit

| Capability | Classification | Evidence |
| --- | --- | --- |
| deterministic selector / package manifest / provenance | READY | stable package and record hashes; tamper rejection |
| capacity guardrail | READY | explicit evidence required; 30% reserve; 10%/500 MiB cap |
| local duplicate-run lock | READY | active exclusion, heartbeat, stale recovery, ownership checks |
| local curated import and idempotency | READY | real RF schema, conflict-safe retry inside transaction |
| local search, joins and prospect flow | READY | sanitized transactional fixture validation |
| MODE A rollback and zero residue | READY | rollback plus direct DB/filesystem checks |
| cleanup verification | READY | bounded-root deletion and negative path test |
| cloud capacity/headroom | GAP | provisioned limit UNKNOWN; real load blocked |
| cloud lease/import/RLS regression | PARTIAL | design exists; implementation deferred to separately authorized RF-03B.3 |
| national pipeline/procurement | UNNECESSARY | MODE B deferred behind Budget Gate |

## Tests Executed

- `test:rf-controlled`: 5/5 PASS.
- `test:rf-controlled-db`: PASS, 14 assertions including idempotency, searches, joins, prospect flow, failed load and residue.
- RF PoC: 12/12 PASS.
- RF lifecycle: 9/9 PASS.
- RF source probe: 14/14 PASS.
- TypeScript: PASS.
- ESLint: zero errors; one pre-existing TanStack Table compiler warning.
- `git diff --check`: PASS.

No national benchmark, heavy download, remote write, migration, deployment or paid action was executed.

## Assumptions Register

| ID | Premise | Type | Evidence | Confidence | Impact |
| --- | --- | --- | --- | --- | --- |
| Z1 | Local processing remains available | ASSUMPTION | current Mac/Docker | medium | manual pipeline blocked |
| Z2 | 30% reserve is conservative | ASSUMPTION | operational practice | medium | growth pressure |
| Z3 | 50k/500 MiB package caps are useful | ASSUMPTION | bounded tests | medium | pilot may need smaller scope |
| Z4 | Cloud headroom | UNKNOWN | not measured | none | cloud import prohibited |
| Z5 | Official RAW remains retrievable | ASSUMPTION | current WebDAV | medium | rebuild may be impossible later |

## Decision Log

| Decision | Alternatives | Evidence/why | Trade-off/revisit |
| --- | --- | --- | --- |
| Hybrid fixture + relevance dataset | random/national | useful, bounded, reproducible | coverage limited; revisit at Budget Gate |
| Local heavy processing | paid worker/web runtime | zero cost and benchmarked | manual/transient |
| Fail-closed capacity gate | optimistic cloud load | cloud capacity unknown | needs measurement |
| Transactional curated publish | national version stack | proportional rollback | not national SLA |
| Local lock now, DB lease later | informal coordination | duplicate execution incident | local-only coordination |

## Runbook

1. Record operator, dataset version, policy and source manifest.
2. Measure disk and intended target DB capacity; stop if unknown.
3. Acquire lock and verify no valid package already exists.
4. Build package with `npm run rf:controlled-package -- --records ... --policy ... --capacity ... --output ...`.
5. Review manifest, hash, rows and capacity result.
6. For an authorized import, stage and publish in one transaction; verify tenant boundary and counts.
7. On failure, rollback transaction; never expose partial data.
8. Release lock, remove temporary RAW/extracted files and record residue check.

## Authorization Requested

Approve the first fixture-only RF-03B.3 validation and designate the pilot relevance policy. Do not yet authorize any real cloud load or national ingestion.

## Git And Review Gate

The mandatory delivery sequence is:

```text
implementation -> tests -> diff/local commit -> review -> owner approval -> push
```

Default status is `NO PUSH — AWAITING REVIEW`. This applies to RF code and documentation. No previous authorization is reusable for a later push; authorization must be explicit and scope-specific.
