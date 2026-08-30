# GSBC PRE-STG10 Remediation Report

Data: 2026-08-30

## Objective

Execute `CODEX_PRE_STG10_REMEDIATION.md` as controlled remediation before STG-10, without starting STG-10 and without commit, push, merge or deploy.

## Preflight

- Required baseline input present: `docs/STG_00_09_CONSOLIDATION_REPORT.md`.
- Repository started clean before remediation.
- Canonical documents were used as sources; they were not rebuilt or reinterpreted.

## Workstreams Executed

1. DeliveryEvidencePolicy remediation for STG-09 physical/digital evidence.
2. Findings register consolidation.
3. STG-10 invariant and eval gate definition.
4. Baseline freeze for STG-00-09 after successful gates.

## Files Created

- `supabase/migrations/0039_delivery_evidence_policy.sql`
- `docs/STG_00_09_FINDINGS_REGISTER.md`
- `docs/STG_10_INVARIANTS.md`
- `docs/STG_10_EVAL_PLAN.md`
- `docs/STG_00_09_BASELINE.md`
- `docs/PRE_STG10_REMEDIATION_REPORT.md`

## Files Modified

- `docs/PRODUCT.md`
- `docs/DOMAIN_RULES.md`
- `src/types/database.types.ts`
- `src/app/backoffice/cobrancas/[id]/page.tsx`
- `src/app/backoffice/cobrancas/[id]/escalonamento-section.tsx`
- `e2e/escalonamento.spec.ts`

## Migrations Created / Modified

- Created `supabase/migrations/0039_delivery_evidence_policy.sql`.
- No existing migration was modified.

## DeliveryEvidencePolicy Status

Status: IMPLEMENTED AS OPERATIONAL POLICY BASELINE.

Implemented:

- Versioned `delivery_evidence_policies` table.
- Global v1 policies for `extrajudicial_notice` and `collection_attempt` across supported channels.
- `registrar_envio` now resolves an active tenant/global policy, records policy id/version/timestamp and computes `delivery_valid`.
- Physical delivery channels require attached proof or auditable external reference.
- Failed delivery or insufficient evidence does not advance escalonamento/cobrança state.
- UI exposes policy version and operational validity in the evidence chain.

Boundary:

- This does not create juridical deadline automation.
- Physical delivery remains complementary and operational unless a future Legal Ops decision defines legal effect.

## Tests and Commands Executed

| Command | Result |
|---|---|
| `npx supabase db push --local` | passed; applied `0039_delivery_evidence_policy.sql` locally |
| `npx playwright test e2e/escalonamento.spec.ts` | passed, 8/8 |
| `npx tsc --noEmit` | passed |
| `npm run lint` | passed with one known warning at `src/components/design-system/data-table.tsx:62` |
| `npx supabase migration list --local` | passed; migration history includes `0039` |
| `npx supabase db diff --local --schema public,storage --use-migra` | passed; no schema drift |
| `npm run test:e2e` | passed, 77/77 |

## Required Security / Reliability Results

- Tenant isolation tests: passed in `e2e/phase0-security.spec.ts`.
- Service role restriction tests: passed in `e2e/phase0-security.spec.ts`.
- Audit spoofing tests: passed in `e2e/phase0-security.spec.ts`.
- Webhook invalid signature/replay/concurrency tests: passed in `e2e/payment-provider.spec.ts` and `e2e/phase0-security.spec.ts`.
- Backup/restore smoke: passed in `e2e/phase0-backup-restore.spec.ts`.
- Observability: baseline structured logging remains present; external alerting/SLO remains deferred.

## Findings Status After Remediation

| Severity | Status |
|---|---|
| P0 | 0 open |
| P1 | 6 total: 1 resolved, 5 deferred/open with gates |
| P2 | 8 deferred |
| P3 | 3 accepted/deferred |

Resolved:

- P1-001 DeliveryEvidencePolicy versionada.

Deferred:

- P1-002 MFA/step-up and formal authority.
- P1-003 Service-role invariant governance.
- P1-004 Real PSP settlement.
- P1-005 Richer canonical state machines.
- P1-006 STG-10/STG-11/STG-12 tests beyond smoke, partially remediated by STG-10 invariant/eval artifacts.

## Remaining Blockers

- No P0 blocker.
- No blocker to start STG-10.
- STG-10 completion remains blocked until `docs/STG_10_INVARIANTS.md` and `docs/STG_10_EVAL_PLAN.md` are implemented and passing.
- STG-11/12 and production money/legal execution remain blocked by authority/MFA, service-role governance, PSP settlement and richer state-machine work.

## Baseline Freeze

Status: FROZEN FOR STG-10 START.

Baseline file created: `docs/STG_00_09_BASELINE.md`.

## Final Decision

STG-10 RELEASED TO START WITH CONDITIONS.

Revenue Core / STG-10 must remain non-executory opportunity intelligence. Do not start STG-10 automatically from this remediation.
