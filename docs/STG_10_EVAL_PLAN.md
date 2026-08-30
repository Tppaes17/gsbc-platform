# GSBC STG-10 Eval Plan

Data: 2026-08-30

Objetivo: validar que STG-10 aumenta inteligência de oportunidade sem criar efeitos jurídicos, financeiros ou comunicacionais automáticos.

## Automated Test Plan

| Eval ID | Command / Location | Assertion |
|---|---|---|
| STG10-EVAL-001 | `npm run test:e2e -- e2e/oportunidades.spec.ts` | Owner/staff sees opportunity UI; sindicato remains blocked from prospect/opportunity surfaces where applicable. |
| STG10-EVAL-002 | new deterministic scoring test | Same input snapshot yields same score, classification and ordered factors. |
| STG10-EVAL-003 | new non-debt invariant test | Opportunity creation/update creates no `obrigacoes`, `cobrancas`, `payment_charges`, `notificacoes`, `escalonamentos` or delivery rows. |
| STG10-EVAL-004 | new provenance test | Each opportunity factor distinguishes fact, inference and human decision. |
| STG10-EVAL-005 | new tenant isolation test | Authenticated tenant user cannot read/write another tenant's opportunity records. |
| STG10-EVAL-006 | new no-external-effect test | STG-10 actions do not call notification, collection, escalation or PSP endpoints. |
| STG10-EVAL-007 | new human review audit test | Review/dismissal appends event history without mutating/removing original score factors. |

## Required Gate Commands

- `npx tsc --noEmit`
- `npm run lint`
- `npx supabase db diff --local --schema public,storage --use-migra`
- `npm run test:e2e`
- focused STG-10 tests added during STG-10 implementation
- `git diff --check`

## Manual Review Checklist

- UI labels opportunity values as estimates/inferences, not debt.
- No action text implies automatic collection, legal conclusion or payment effect.
- Cross-tenant analytics, if Owner-only, are documented as an explicit product/security decision.
- Any new service-role use has a tenant-bound invariant test and an entry in the service-role matrix.

## Exit Criteria

STG-10 can be marked complete only when all automated evals pass, no P0 exists, no STG-10 P1 invariant remains open, and the release report confirms that opportunity intelligence remained non-executory.

## Execution Result

Data: 2026-08-30

Status: PASSED.

Evidence:

- `npx playwright test e2e/oportunidades.spec.ts e2e/oportunidades-invariants.spec.ts`: passed, 6/6.
- `npm run test:e2e`: passed, 81/81.
- STG10-EVAL-002/004 covered by deterministic pure scoring and explicit factor provenance.
- STG10-EVAL-003/006 covered by side-effect counts across obligations, charges, notifications, escalations and delivery rows.
- STG10-EVAL-005 covered by authenticated sindicato read/update/insert denial.
- STG10-EVAL-007 covered by human-review event context and factor preservation.
