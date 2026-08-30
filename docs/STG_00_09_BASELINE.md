# GSBC STG-00-09 Baseline

Data: 2026-08-30

Status: BASELINE ACCEPTED FOR STG-10

## Baseline Scope

This baseline freezes the repository state after PRE-STG10 remediation and before any STG-10 implementation work.

Accepted baseline:

- STG-00 through STG-09 remain the functional foundation.
- `DeliveryEvidencePolicy` now exists as a versioned policy layer for operational delivery evidence.
- Physical delivery is supported only as policy-validated operational evidence.
- Failed or insufficient delivery evidence does not advance legal escalation.
- STG-10 is released to start as non-executory opportunity intelligence.

## Current Risk Position

| Severity | Current position |
|---|---|
| P0 | 0 open |
| P1 | 1 resolved, 5 deferred/open with explicit gates |
| P2 | 8 deferred |
| P3 | 3 accepted/deferred |

## Gate Evidence

- `npx tsc --noEmit`: passed.
- `npm run lint`: passed with known warning at `src/components/design-system/data-table.tsx:62`.
- `npx supabase migration list --local`: passed; local and remote history include `0039`.
- `npx supabase db diff --local --schema public,storage --use-migra`: passed; no schema drift.
- `npx playwright test e2e/escalonamento.spec.ts`: passed, 8/8.
- `npm run test:e2e`: passed, 77/77.

## STG-10 Boundary

STG-10 may start. It must not:

- create debt;
- create obligations;
- create charges;
- send communications;
- trigger legal escalation;
- move money;
- produce autonomous legal conclusions.

STG-10 completion remains conditional on the invariant and eval plan in `docs/STG_10_INVARIANTS.md` and `docs/STG_10_EVAL_PLAN.md`.
