# ADR-RF-019 — Zero-Incremental-Cost Pre-Revenue Mode

## Status

ACCEPTED — OWNER DECISION, 2026-09-18

Supersedes the procurement-oriented interpretation of RF-03B.2B for the current pre-revenue phase. It does not erase or amend historical commit `a4f65a4`; it records the later owner decision.

## Decision Sequence

1. RF-03B.2A was approved after the bounded Establishments and Simples benchmark passed.
2. Commit `a4f65a4` recorded authorization for RF-03B.2B as an infrastructure decision/analysis phase, without provisioning or payment.
3. The owner subsequently stated that no budget is available for new RF infrastructure.
4. The governing strategy changed to **Zero-Incremental-Cost / Pre-Revenue**.
5. Procurement and National Production are deferred to a future `NATIONAL PRODUCTION BUDGET GATE`.

## Decision

RF Data Intelligence now has two formally separate modes.

### MODE A — DEVELOPMENT / PRE-REVENUE

- incremental infrastructure cost target: zero;
- use existing infrastructure only;
- perform heavy work locally or in another already-available controlled environment;
- use real, deterministic, bounded and reproducible RF data;
- persist only operationally relevant records;
- require measured capacity/headroom before any material database load;
- stop expansion when capacity, query performance, workload health or storage guardrails fail;
- permit controlled pilots, subject to separate load authorization.

### MODE B — NATIONAL PRODUCTION

- complete national ingestion and monthly updates;
- dedicated capacity when required;
- production-grade rollback, observability and recovery;
- status: `DEFERRED — BUDGET GATE REQUIRED`.

MODE A readiness must never be described as national production readiness. A failed capacity guardrail results in `STOP EXPANSION` and does not authorize an upgrade.

## Current Implementation Boundary

The approved MODE A preparation is offline and reversible: deterministic relevance selection, provenance hashes, package idempotency, local dataset-version locking and a fail-closed capacity gate. No migration, RLS change, service-role exposure, cloud load, national download, provisioning, upgrade or paid resource is part of this decision.

The normative implementation plan is `docs/RF_03B2B_ZERO_INCREMENTAL_COST_PRE_REVENUE_PLAN.md`. The earlier `docs/RF_03B2B_INFRASTRUCTURE_DECISION_AND_NATIONAL_INGESTION_PLAN.md` remains historical target architecture for MODE B and is explicitly deferred.

## Consequences

Development and controlled pilots may advance without pretending that national infrastructure exists. Coverage, freshness and automation remain intentionally limited. Real cloud persistence is blocked until capacity/headroom, tenant isolation, transaction rollback and zero-residue behavior are demonstrated and separately authorized.

## Gates

```text
RF-03B.2B Gate: PASS — ZERO-INCREMENTAL-COST ARCHITECTURE APPROVED
RF-03B.3 Readiness: READY FOR CONTROLLED PRE-REVENUE IMPLEMENTATION
National Production Ingestion: DEFERRED — BUDGET GATE REQUIRED
```
