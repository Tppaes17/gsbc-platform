# GSBC Phase 0 Execution Report

## Status

Phase 0 completed on 2026-08-29.

Historical note: the first preflight was blocked because mandatory canonical
documents were not in the required `docs/` paths. The location issue was
resolved without changing canonical document contents. `docs/PRODUCT_REVIEW.md`
was later added from the Product Owner-provided source. The preflight was
reexecuted from the beginning and passed.

`docs/GAP_ANALYSIS_REVIEW.md` remains absent, but `CODEX_PHASE_0_EXECUTION_PLAN.md`
treats it as conditional (`if present`), not as a mandatory blocker.

## Mandatory Input Check

| File | Status |
|---|---|
| `AGENTS.md` | Present and read |
| `docs/PRODUCT.md` | Present |
| `docs/PRODUCT_REVIEW.md` | Present |
| `docs/DOMAIN_RULES.md` | Present |
| `docs/MULTITENANCY.md` | Present |
| `docs/SECURITY.md` | Present |
| `docs/ARCHITECTURE.md` | Present |
| `docs/CURRENT_STATE_GAP_ANALYSIS.md` | Present |
| `docs/GAP_ANALYSIS_REVIEW.md` | Absent; optional only if present |

## Workstreams Executed

| Workstream | Result | Evidence |
|---|---|---|
| 0A - Clean Engineering Baseline | Passed | `npx tsc --noEmit`; `npx supabase migration list --local`; `npx supabase db diff --local --schema public,storage --use-migra` |
| 0B - Two-Tenant Adversarial Isolation | Passed | `e2e/phase0-security.spec.ts` tests TENANT-001/002/003/004 |
| 0C - Service Role Hardening | Passed | `supabase/migrations/0033_phase0_service_role_grants.sql`; PRIV-001 test |
| 0D - Audit Hardening | Passed | `supabase/migrations/0032_phase0_security_hardening.sql`; AUDIT-001 test |
| 0E - Payment Webhook Safety | Passed | `register_provider_pagamento()` lock; PAY-001/002/003 tests |
| 0F - Backup / Restore Readiness | Passed with local logical restore smoke proof | `e2e/phase0-backup-restore.spec.ts` |
| 0G - Minimum Observability | Passed at provider-neutral baseline | `src/lib/observability/events.ts`; backup and webhook failure logs |
| 0H - CI / Release Gates | Passed | `npm run check:phase0`; `npm run test:e2e` |

## P0/P1 Resolved

### P0-ISO-001 - Tenant isolation had no adversarial proof

- Resolution: added independent Tenant B fixtures and adversarial checks for ordinary authenticated users, portal contact, cross-tenant select/update/insert, storage signed URL/upload/delete, and RPC privilege.
- Evidence: `e2e/phase0-security.spec.ts` lines 84-194 define fixtures and cleanup; lines 196-267 validate tenant and storage isolation.

### P0-AUDIT-001 - Audit log accepted forged tenant/entity facts

- Resolution: `log_audit_event` now requires an authenticated actor, validates tenant access, resolves the real tenant for known entity types, and rejects mismatched tenant/entity pairs.
- Evidence: `supabase/migrations/0032_phase0_security_hardening.sql` lines 12-35, 37-109, and 111-174; `e2e/phase0-security.spec.ts` lines 275-310.

### P0-PAY-001 - Webhook replay/concurrency could duplicate provider payments

- Resolution: introduced `register_provider_pagamento()` with `FOR UPDATE` lock on `payment_charges`; webhook paid events now call this RPC instead of registering payment then updating charge in separate app steps.
- Evidence: `supabase/migrations/0032_phase0_security_hardening.sql` lines 176-235; `src/lib/payments/webhook-processor.ts` lines 146-178; `e2e/phase0-security.spec.ts` lines 313-384.

### P1-PRIV-001 - Administrative backup RPC was callable by authenticated users

- Resolution: explicit revoke/grant hardening for `backup_list_tables()` and `register_provider_pagamento()`, leaving both executable only by `service_role`.
- Evidence: `supabase/migrations/0033_phase0_service_role_grants.sql` lines 9-19; `e2e/phase0-security.spec.ts` lines 269-272.

### P1-OBS-001 - Backup/webhook failures had no minimum structured operational signal

- Resolution: added provider-neutral structured logging helper and wired backup unauthorized/failure/success plus webhook insert/unknown-charge/payment-registration failures.
- Evidence: `src/lib/observability/events.ts` lines 1-38; `src/app/api/cron/backup/route.ts` lines 21-55; `src/lib/payments/webhook-processor.ts` lines 91-99, 116-128, and 155-170.

### P1-GATE-001 - Phase 0 gates were not codified

- Resolution: added `test:phase0` and `check:phase0`, and configured Playwright to start/reuse the local Next dev server.
- Evidence: `package.json` lines 10-13; `playwright.config.ts` lines 19-24.

## Tests and Commands Executed

| Command | Result |
|---|---|
| `npx supabase migration repair --local --status applied 0019 ... 0031` | Passed; repaired local migration bookkeeping drift |
| `npx supabase db push --local` | Passed; applied `0032` |
| `npx supabase db push --local` | Passed; applied `0033` |
| `npx tsc --noEmit` | Passed |
| `npx supabase migration list --local` | Passed; local history aligned `0001` through `0033` |
| `npx supabase db diff --local --schema public,storage --use-migra` | Passed; shadow DB reapplied all migrations, no schema drift |
| `npm run test:phase0` | Passed; 8/8 |
| `npm run check:phase0` | Passed; lint warning only |
| `npm run test:e2e` | Passed; 66/66 |

Lint note: `src/components/design-system/data-table.tsx:62` still reports a React Compiler warning for TanStack Table's `useReactTable()`. It is a pre-existing warning, not introduced by Phase 0, and does not fail the gate.

## Isolation Results

- TENANT-001: Tenant A user cannot read Tenant B company rows.
- TENANT-002: Tenant B user cannot read Tenant A company rows.
- TENANT-003: cross-tenant update/insert and Storage signed URL/upload/delete do not expose or mutate Tenant B from Tenant A.
- TENANT-004: portal contact sees only its own company and cannot see another company's charge.

## Service Role, Audit, and Webhook Results

- PRIV-001: authenticated user cannot execute `backup_list_tables()`.
- AUDIT-001: forged tenant and mismatched entity/tenant audit attempts fail; legitimate same-tenant audit succeeds.
- PAY-001: invalid signature returns 401 and does not register payment.
- PAY-002: exact replay returns safely without duplicate payment.
- PAY-003: concurrent distinct paid events against the same charge leave exactly one provider payment.

## Backup / Restore Status

- Backup cron route executed locally with `CRON_SECRET`.
- Backup artifact was written to private `db-backups` Storage.
- Artifact was downloaded using service role.
- Critical tables were parsed from the artifact and materialized into a temporary Postgres restore probe inside a transaction that rolled back.
- Status: logical restore smoke proof passed. This is not PITR and does not replace a production restore drill on managed infrastructure.

## Observability Status

- Provider-neutral structured event logging exists.
- Covered now: webhook event insert failure, unknown payment charge, provider payment registration failure, unauthorized backup cron call, backup success, backup failure.
- Remaining maturity gap: no external observability vendor, alert routing, dashboard, SLO, or dead-letter queue dashboard yet.

## Migrations Created / Modified

- Created `supabase/migrations/0032_phase0_security_hardening.sql`
- Created `supabase/migrations/0033_phase0_service_role_grants.sql`
- Applied both to the local Supabase database only.
- No destructive migration was created.

## Files Modified

- `package.json`
- `playwright.config.ts`
- `src/app/api/cron/backup/route.ts`
- `src/lib/payments/webhook-processor.ts`
- `src/types/database.types.ts`
- `src/lib/observability/events.ts`
- `e2e/phase0-security.spec.ts`
- `e2e/phase0-backup-restore.spec.ts`
- `supabase/migrations/0032_phase0_security_hardening.sql`
- `supabase/migrations/0033_phase0_service_role_grants.sql`
- `docs/PHASE_0_EXECUTION_REPORT.md`

Canonical documents moved/placed earlier and still present:

- `docs/PRODUCT.md`
- `docs/PRODUCT_REVIEW.md`
- `docs/DOMAIN_RULES.md`
- `docs/MULTITENANCY.md`
- `docs/SECURITY.md`
- `docs/ARCHITECTURE.md`

Root duplicates of those canonical files were removed during the location-only correction. `PRODUCT.en.md` and `PRODUCT_v1.1.md` remain at root as separate untracked non-canonical documents.

## Risks Still Open

| Severity | Risk | Status |
|---|---|---|
| P1 | Backup is logical, not PITR; no managed production restore drill exists | Open |
| P1 | Observability has structured logs but no external alerting/SLO dashboard | Open |
| P2 | React Compiler warning for TanStack Table remains in `data-table.tsx` | Open |
| P2 | Phase 0 tests create durable fixture users/tenant in local Supabase | Accepted local-test artifact |

## Approval Gates

No stop gate was triggered:

- No production deploy.
- No push/merge/commit.
- No real PSP/provider selection.
- No secret rotation.
- No destructive migration.
- No tenant model change.
- No weakening of RLS/audit/security checks.

## Revenue Core Readiness

Revenue Core is ready to begin from a Phase 0 security/readiness standpoint.

Do not start Phase 1 / Revenue Core automatically. The next step requires explicit Product Owner authorization for Phase 1.
