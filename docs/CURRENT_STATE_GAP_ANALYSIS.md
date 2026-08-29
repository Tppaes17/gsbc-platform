# GSBC Current State Gap Analysis

## 1. Executive Verdict

Overall architectural health: viable and above prototype quality. The repository has a coherent Next.js/Supabase architecture, explicit ADRs, RLS-first design, audit tables, typed server actions, product-specific state machines, collection automation, portal access, payment abstraction, policy logging, and AI guardrails.

Production readiness: not ready for real financial production. The main blockers are financial truth beyond the mock payment provider, missing settlement/split/reconciliation, insufficient cross-tenant proof, migration/bookkeeping drift, failed TypeScript check, no proven PITR/backup restore path, and limited security/IDOR/eval coverage.

Product maturity: partial SaaS foundation. STG-00 through STG-12 concepts are represented, but many are first implementation slices, not complete premium SaaS capabilities.

Largest risks: tenant isolation not proven under adversarial ID manipulation, service-role code paths bypass RLS by design, payment state can be simulated but not reconciled as settlement truth, audit integrity depends on a broad RPC, and current workspace contains uncommitted backup work that breaks typecheck.

Recommendation: evolve the current architecture. Do not rewrite. Preserve the Supabase/RLS model, domain-specific migrations, server-action style, state-machine functions, collection eligibility design, portal principal separation, and AI human-in-the-loop stance. Fix P0/P1 safety and readiness gates before adding more feature surface.

## 2. Repository & Stack Map

| Area | Current state | Evidence |
|---|---|---|
| Framework | Next.js 16 App Router, React 19, TypeScript | `package.json`; `README.md:17-24` |
| Data/Auth/Storage | Supabase Postgres, Auth, Storage, RLS | `README.md:21`; `supabase/migrations/*.sql` |
| UI | Tailwind v4, shadcn/Base UI, Lucide, shared design-system components | `src/components/design-system/*`; `src/components/ui/*` |
| Domain modules | Tenants, sindicatos, empresas, instrumentos, obrigações, cobranças, negociações, pagamentos, documentos, notificações, dossiês, régua, work items, contestação, portal, provider, escalonamento, oportunidades, políticas, AI | `src/app/backoffice/*`; `src/lib/*`; `supabase/migrations/0001-0031*.sql` |
| Background jobs | Vercel Cron routes for collection engine, prospect CNPJ sweep, and uncommitted backup cron | `vercel.json`; `src/app/api/cron/*` |
| Tests | Playwright E2E suite, no unit/integration/eval suite observed | `e2e/*.spec.ts`; `e2e/README.md` |
| Documentation | Rich ADR/rodada history, but canonical docs requested by audit prompt are absent | `docs/architecture/*`; `docs/rodadas/*`; missing `docs/PRODUCT.md`, `docs/SECURITY.md`, `docs/MULTITENANCY.md` |

## 3. Current Architecture

Application boundaries:
- Public institutional site in `src/app/(site)`.
- Authenticated backoffice in `src/app/backoffice`.
- Company contact portal in `src/app/portal`.
- Server actions colocated by module, usually guarded by `requireCurrentUser()` or `requireCurrentPortalContato()`.
- API routes limited to auth callback, health, cron, and payment webhooks.

Data boundaries:
- Shared database/shared schema multi-tenancy with `tenant_id` on sensitive business tables.
- `tenants.type` distinguishes `platform` and `sindicato` tenants.
- Some global tables intentionally have nullable tenant scope, such as audit or prospect/import/AI policy contexts.

Security boundaries:
- Postgres RLS is the intended authority.
- Platform staff gains cross-tenant access through `is_platform_staff()`.
- Company contacts are a separate principal via `empresa_contatos.user_id` and `is_empresa_contato()`.
- Service role exists for admin/auth operations, cron, payment webhooks, CNPJ sweep, and uncommitted backup code. It bypasses RLS entirely by design.

Operational boundaries:
- Collection automation is cron-driven and stateful through `collection_enrollments` and `collection_executions`.
- Work items are mixed: event-driven plus state-derived sync.
- Payment webhook state is persisted before processing.
- AI copilots are server-side, human-in-the-loop, and logged in `ai_interacoes`.

## 4. Product Coverage Matrix

| Domain | Status | Change | Severity | Evidence | Recommendation |
|---|---|---|---|---|---|
| 1. Tenant lifecycle | Partial | ADAPT | P1 | `tenants`, onboarding, no archival/reactivation | Add full lifecycle states and ops controls |
| 2. Users/RBAC | Partial | ADAPT | P1 | `memberships`, roles, `can_manage_tenant_members()` | Add adversarial authz tests and delegation model |
| 3. Delegation | Absent | BUILD | P1 | No delegation tables; roadmap requires delegation expiry eval | Build after RBAC hardening |
| 4. Collective instruments | Partial | ADAPT | P2 | `instrumentos`, `clausulas`, `obrigacoes` | Add rule versioning/publication workflow |
| 5. AI rule interpretation | Absent/early | BUILD | P1 | AI only negotiation/collections copilots | Add only after evidence model and evals |
| 6. Rule validation/publication | Partial | ADAPT | P1 | Instruments/obligations exist, no maker-checker publication | Add approval workflow and history |
| 7. CNPJ registry | Partial | ADAPT | P2 | `dossies_cadastrais`, BrasilAPI, LeadCNPJ optional | Add retries, rate policy, provenance UI |
| 8. Corporate hierarchy | Absent | BUILD | P2 | No group/branch hierarchy model found | Build after company registry stabilizes |
| 9. Coverage/classification | Partial | ADAPT | P2 | Opportunity scoring and dossie scores exist | Add explicit coverage taxonomy |
| 10. Obligations | Partial | ADAPT | P1 | `obrigacoes` and charge generation | Add temporal rule versioning |
| 11. Non-financial compliance | Minimal | BUILD | P2 | Product centered on financial obligations | Model separately from AR collections |
| 12. Retroactivity | Absent | BUILD | P1 | No retroactive recalculation/versioned obligation engine | Required before large-scale legal use |
| 13. Sandbox/homologation | Partial | ADAPT | P2 | Mock payments, staging documented | Add separate non-demo staging data strategy |
| 14. Preventive communication | Partial | ADAPT | P2 | Email notifications only | Add opt-in/out, templates, deliverability tracking |
| 15. Collection sequence | Partial good | ADAPT | P1 | `collection_*`, eligibility checks | Add state-machine tests and circuit breaker |
| 16. Email | Partial | ADAPT | P1 | `nodemailer`; SMTP optional | Add production SMTP, bounce tracking |
| 17. WhatsApp | Absent | BUILD | P1 | No WhatsApp provider | Add after consent/policy controls |
| 18. Multichannel attempts | Absent | BUILD | P1 | Only email/tarefa/wait/escalonamento | Add channel attempt ledger |
| 19. Company contacts | Partial | ADAPT | P2 | `empresa_contatos`, portal access | Add verification/consent/contact roles |
| 20. Human response handling | Partial | ADAPT | P1 | Portal contestation/negotiation replies | Add assignment/SLA taxonomy |
| 21. SLA | Partial | ADAPT | P2 | `work_items.due_at`, no business-day SLA engine | Add SLA policy and escalation |
| 22. Extrajudicial notice | Partial | ADAPT | P1 | Escalonamento migrations/actions | Add external delivery provider and proof lifecycle |
| 23. Disputes | Partial good | ADAPT | P1 | `contestacoes`, evidence, pause logic | Add resolution authority and test matrix |
| 24. Payment provider | Stub | BUILD | P0 | Only `mock` provider active | Integrate real provider after financial ledger design |
| 25. Reconciliation | Minimal | BUILD | P0 | Payment state exists, no settlement truth | Build STG-07 before real production money |
| 26. Operational subledger | Partial | BUILD | P1 | `pagamentos`, charges, no double-entry/split ledger | Add ledger/repasses/receivables tables |
| 27. Negotiation | Partial good | ADAPT | P1 | `negociacoes`, approval for discounts | Add maker-checker tests and agreement document lifecycle |
| 28. Credits | Absent | BUILD | P1 | No credit/overpayment model found | Build with financial ledger |
| 29. Legal preparation | Partial | ADAPT | P1 | Escalonamento and document template exist | Add legal dossier approval/export controls |
| 30. Legal dossier | Partial | ADAPT | P1 | Documents/evidence/timeline exist | Add immutable packaged dossier |
| 31. Compliance score | Partial | ADAPT | P2 | Dossie score and opportunity factors | Formalize scoring definitions |
| 32. Forecasts | Minimal | BUILD | P2 | Revenue trend is historical only | Add forecasting after reliable ledger |
| 33. Revenue targets | Absent | BUILD | P2 | No target model found | Add per-tenant targets |
| 34. Workflow/tasks | Partial good | ADAPT | P1 | `work_items`, sync job | Add SLA, ownership, bulk resolution |
| 35. Control Tower | Partial | ADAPT | P2 | Backoffice dashboard and operations | Add filters, queues, operational load views |
| 36. Collaborative timeline | Partial | ADAPT | P2 | Event tables exist per module | Add unified timeline projection |
| 37. Docs/evidence | Partial good | ADAPT | P1 | Storage bucket, metadata, evidence links | Fix delete consistency and immutable evidence policy |
| 38. Notification Center | Minimal | BUILD | P2 | `notificacoes` table, no full center | Build after channel ledger |
| 39. Global search | Absent | BUILD | P2 | DataTable client filtering only | Add server-side search with RLS |
| 40. Semantic AI search | Absent | BUILD | P2 | No embeddings/RAG search found | Build after RLS-safe search |
| 41. Operational AI | Partial | ADAPT | P1 | Two copilots, no eval harness | Add AI evals, injection tests, telemetry |
| 42. Bulk operations | Partial | ADAPT | P1 | Prospect import exists; retries partially handled | Add idempotency keys and bulk simulation |
| 43. Circuit breaker | Partial | ADAPT | P1 | Cron secrets and eligibility checks | Add global automation stop controls |
| 44. Audit | Partial | REFACTOR | P1 | `audit_logs`, `policy_decisoes`, broad RPC | Constrain audit writes and cover all sensitive paths |
| 45. Federation hierarchy | Absent | BUILD | P2 | No parent/child tenant model | Build only if product owner confirms |
| 46. Tenant archival/reactivation | Absent | BUILD | P1 | No archive/reactivate lifecycle found | Add before real tenant churn |

## 5. P0 Findings

### P0-001 - Tenant isolation is not proven adversarially

- Severity: P0
- Change: ADAPT
- Requirement/reference: multi-tenant SaaS must prove tenant isolation at database, API, storage, search, bulk, and AI boundaries.
- Current implementation: RLS is broadly enabled and all 46 public tables in the local DB report row security enabled, but tests only cover one sindicato seed and UI visibility.
- Evidence: `e2e/README.md:39-43` explicitly says real cross-tenant isolation is missing because only one sindicato is seeded. Service role bypass is documented in `src/lib/supabase/admin.ts:6-25`.
- Affected files/modules: `supabase/migrations/*`, `src/lib/supabase/admin.ts`, `e2e/rls-visibility.spec.ts`, `e2e/README.md`.
- Risk: an IDOR/RPC/storage-path bug could expose or mutate another tenant's data without being caught by the current suite.
- Recommendation: create two-sindicato seed/e2e fixtures, add direct API/RPC/storage adversarial tests, and treat tenant isolation as a release gate.
- Dependencies: migration/seed strategy, test data reset policy.
- Suggested phase: Phase 0.

### P0-002 - Financial architecture is not production-ready beyond simulated payments

- Severity: P0
- Change: BUILD
- Requirement/reference: payment state must not be confused with settlement truth; financial operations require idempotency, reconciliation, split, ledger, refunds, chargebacks, and recoverability.
- Current implementation: provider abstraction and webhook processing exist, but active provider is only `mock`.
- Evidence: `src/lib/payments/registry.ts:11-21` resolves only `mock`; `supabase/migrations/0024_payment_provider.sql` constrains provider to `mock`; `src/lib/payments/webhook-processor.ts:56-140` processes webhook events into internal state.
- Affected files/modules: `src/lib/payments/*`, `src/app/api/webhooks/payments/[provider]/route.ts`, `supabase/migrations/0024_payment_provider.sql`, `supabase/migrations/0012_pagamentos.sql`.
- Risk: production money flow would have no provider settlement truth, no split/repasses, no chargeback/refund ledger, and no reconciliation state.
- Recommendation: before real money, design and migrate STG-07 ledger/reconciliation/split model, then integrate one real provider behind the current interface.
- Dependencies: provider choice, bank/PSP contract, accounting rules.
- Suggested phase: Phase 0/2.

### P0-003 - Schema/bookkeeping/workspace state is not a reliable production baseline

- Severity: P0
- Change: REFACTOR
- Requirement/reference: deployable baseline must have reproducible migrations, passing typecheck, and a clean release candidate.
- Current implementation: local DB migration history reports only `0001` through `0018`, while current filesystem has migrations through `0031` and runtime objects through later stages. Workspace has uncommitted backup code and `npx tsc --noEmit` fails on `backup_list_tables`.
- Evidence: local query returned 46 public tables with RLS enabled, including later tables; `supabase_migrations.schema_migrations` returned only `0001-0018`; `src/lib/backup/engine.ts:53` calls `backup_list_tables`; `supabase/migrations/0031_backup_infra.sql:23-38` defines it; TypeScript failed with `Argument of type '"backup_list_tables"' is not assignable...`.
- Affected files/modules: `supabase/migrations/*`, `src/types/database.types.ts`, `src/lib/backup/engine.ts`, `src/app/api/cron/backup/route.ts`, `vercel.json`.
- Risk: deploys and resets may not reproduce the audited schema; CI cannot trust type generation; backup route cannot be validated.
- Recommendation: reconcile local migration bookkeeping, regenerate DB types from the actual target schema, decide whether Rodada 32 backup code enters baseline, and require clean typecheck before any deployment.
- Dependencies: product owner decision on backup stopgap, environment selection.
- Suggested phase: Phase 0.

## 6. P1 Findings

### P1-001 - Service role usage lacks enforceable inventory and tests

- Severity: P1
- Change: ADAPT
- Evidence: `src/lib/supabase/admin.ts:6-25`; usages in cron, portal login, payments, CNPJ sweep, operations sync, backup.
- Risk: service-role code can bypass tenant boundaries without RLS. Comments are good but not an enforceable policy.
- Recommendation: centralize service-role use cases, add tests for each, and require explicit tenant scoping/assertions in every privileged function.

### P1-002 - Audit RPC allows caller-supplied tenant/entity/history payloads

- Severity: P1
- Change: REFACTOR
- Evidence: `supabase/migrations/0002_rls_policies.sql:54-83`; `src/lib/audit/log.ts:20-33`.
- Risk: authenticated users cannot directly update/delete audit rows, but a broad `log_audit_event` RPC can create misleading audit facts if exposed through a bug or direct RPC call.
- Recommendation: replace generic audit RPC with constrained functions per event family, or verify actor authorization against the referenced tenant/entity before inserting.

### P1-003 - Missing canonical product/security/domain documents

- Severity: P1
- Change: BUILD
- Evidence: required files `docs/PRODUCT.md`, `docs/DOMAIN_RULES.md`, `docs/MULTITENANCY.md`, `docs/SECURITY.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `docs/DECISIONS.md` are absent; README points to ADRs/rodadas/roadmap instead.
- Risk: source of truth is scattered across migrations and rodada notes, making later audits and onboarding error-prone.
- Recommendation: consolidate canonical docs without deleting the richer history.

### P1-004 - TypeScript baseline currently fails

- Severity: P1
- Change: REFACTOR
- Evidence: `npx tsc --noEmit` failed on `src/lib/backup/engine.ts:53`.
- Risk: CI/release would block, and generated Supabase RPC types are not trustworthy.
- Recommendation: do not deploy until typecheck passes against committed migrations/types.

### P1-005 - Webhook idempotency exists but concurrent financial effect is not fully proven

- Severity: P1
- Change: ADAPT
- Evidence: `src/lib/payments/webhook-processor.ts:56-78` inserts raw events with uniqueness; `src/lib/payments/webhook-processor.ts:117-136` registers payment then updates charge.
- Risk: duplicate event IDs are controlled, but concurrent distinct events for the same charge and partial failures need stronger transactional proof.
- Recommendation: add DB transaction/RPC boundary for webhook processing or lock charge rows; add replay/concurrency tests.

### P1-006 - Bulk prospect import has partial idempotency but no full bulk operation contract

- Severity: P1
- Change: ADAPT
- Evidence: `src/app/backoffice/prospectos/actions.ts` deduplicates CNPJ in-file and existing unpromoted dossies; CNPJ consultations are synchronous and may partially succeed.
- Risk: retries after partial failure can produce duplicated evidence rows or inconsistent import summaries.
- Recommendation: introduce import batch IDs, per-row idempotency keys, retry state, and bulk simulation.

### P1-007 - Backup/PITR posture is incomplete

- Severity: P1
- Change: ADAPT
- Evidence: `docs/rodadas/rodada-31-reconciliacao-producao.md:145-151` says Free plan lacks PITR; uncommitted `src/lib/backup/engine.ts:4-15` states logical backup is not transactionally consistent.
- Risk: data loss recovery for legal/financial state is not proven.
- Recommendation: decide Pro/PITR vs logical backup stopgap; test restore, not only backup creation.

### P1-008 - Production observability and alerting are not sufficient

- Severity: P1
- Change: BUILD
- Evidence: no Sentry/Datadog/OpenTelemetry integration observed; `docs/rodadas/rodada-17-cloud-staging.md` records logs-only production risk.
- Risk: failed cron, webhook processing, email delivery, or AI failures may be invisible until business users report them.
- Recommendation: add structured error tracking, cron/webhook alerts, and business metrics.

## 7. P2 Findings

### P2-001 - Search is client-side and not a product search architecture

- Severity: P2
- Change: BUILD
- Evidence: `src/components/design-system/data-table.tsx:52-70` implements local global filtering over already loaded data.
- Risk: scaling, cross-module discovery, and RLS-safe search are not solved.
- Recommendation: add server-side search with tenant-aware policies before semantic search.

### P2-002 - Document deletion can leave broken metadata if metadata delete fails after storage delete

- Severity: P2
- Change: REFACTOR
- Evidence: `src/app/backoffice/empresas/[id]/documentos-actions.ts:128-133`.
- Risk: metadata can point to an object already removed.
- Recommendation: reverse operation order where possible, soft-delete metadata, or add compensating cleanup/retry.

### P2-003 - CSP still permits unsafe inline/eval scripts

- Severity: P2
- Change: ADAPT
- Evidence: `next.config.ts:17-29`.
- Risk: mitigations against XSS are weaker than a hardened production CSP.
- Recommendation: keep headers, but move toward nonce/hash-based scripts and environment-specific CSP.

### P2-004 - E2E suite is broad but lacks unit/integration/state-machine coverage

- Severity: P2
- Change: BUILD
- Evidence: `e2e/*.spec.ts`; no unit test framework or eval harness in `package.json`.
- Risk: regressions in pure functions, SQL policies, and concurrency logic are expensive to catch only through browser E2E/manual testing.
- Recommendation: add unit tests for pure domain functions and integration tests for RPC/RLS.

### P2-005 - SMTP/email delivery lacks production-grade feedback loop

- Severity: P2
- Change: ADAPT
- Evidence: `src/lib/email/send.ts`; `notificacoes` tracks sent/failure but no bounce/open/provider webhook.
- Risk: collections may believe contact occurred when delivery failed downstream.
- Recommendation: integrate provider events and channel attempt ledger.

### P2-006 - Frontend design system is useful but not a complete premium SaaS system

- Severity: P2
- Change: ADAPT
- Evidence: reusable components exist, but tables are client-paginated and warning appears from React Compiler/TanStack Table at `src/components/design-system/data-table.tsx:62`.
- Risk: operational high-volume workflows may degrade.
- Recommendation: add server pagination/filter contracts, dense table variants, and resolve/suppress compiler warning intentionally.

## 8. P3 Findings

### P3-001 - Demo credentials are documented in repo

- Severity: P3
- Change: ADAPT
- Evidence: README and seed/e2e helpers document demo password.
- Risk: acceptable for local/demo, but risky if reused in staging with public URL.
- Recommendation: rotate demo staging users and avoid shared public demo credentials for production-like environments.

### P3-002 - Manual database type maintenance is fragile

- Severity: P3
- Change: ADAPT
- Evidence: `README.md:64-71` says types are maintained manually.
- Risk: drift, as seen in current backup RPC type failure.
- Recommendation: automate type generation in CI from the applied schema.

### P3-003 - Roadmap and rodada documentation are strong but hard to query

- Severity: P3
- Change: ADAPT
- Evidence: 30+ rodada files and ADRs with critical decisions spread across them.
- Risk: good decisions become tribal knowledge.
- Recommendation: maintain decision index and architecture overview.

### P3-004 - Several future placeholders are honest but need lifecycle tracking

- Severity: P3
- Change: ADAPT
- Evidence: placeholders/future notes in docs and `future-module-placeholder.tsx`.
- Risk: users may eventually see roadmap hints as commitments without tracking.
- Recommendation: link placeholders to backlog IDs or remove from production UI when not needed.

## 9. Multitenancy & RLS Audit

Local DB inspection:
- Public tables inspected: 46.
- Public tables with RLS disabled: 0.
- Security-definer functions exist for authorization helpers, portal access, approval, escalation, audit, and some business mutations.

Special P0 questions:

| Area | Answer |
|---|---|
| Tenant | NOT PROVEN SAFE. RLS exists broadly, but real two-tenant adversarial tests are missing and the E2E README acknowledges this gap. |
| Service role | NOT PROVEN SAFE. Service role bypasses RLS by design and is used in multiple privileged paths. There are comments, but not enforceable controls/tests. |
| Payments | NOT PROVEN SAFE. Event-id idempotency exists, but concurrent same-charge events and settlement/reconciliation are not proven. |
| Audit | NOT PROVEN SAFE. Audit rows are immutable by RLS, but generic caller-supplied audit RPC can pollute history. |
| AI | NOT PROVEN SAFE. Guardrails exist, but there are no prompt-injection/cross-tenant retrieval evals. |
| Documents | NOT PROVEN SAFE. Storage path policies look tenant-aware, but cross-tenant storage path manipulation tests are not present. |
| Bulk operations | NOT PROVEN SAFE. Prospect import partially deduplicates, but retry semantics are not fully idempotent. |

## 10. Security Audit

Good:
- `server-only` is used in privileged modules.
- Environment variables are centralized and fail closed when required Supabase secrets are missing.
- Cron routes require `CRON_SECRET`.
- Security headers are configured in `next.config.ts`.
- Storage bucket for company documents is private and path-scoped by company access.

Risks:
- Service role usage needs enforceable least-privilege boundaries.
- CSP uses `unsafe-inline` and `unsafe-eval`.
- No rate limiting found on public site lead form, portal login, webhook route, or cron endpoints beyond shared secret/signature.
- `.env.local` exists and is ignored; not inspected to avoid exposing secrets.
- Versioned demo password appears in docs/seed/e2e helper.

Secret scan result:
- No real API key value was reproduced or confirmed in versioned files.
- Found demo password references and environment variable names only.

## 11. Domain Model & State Machines

Strong patterns:
- Tenant/membership/role model is explicit.
- Charges, negotiations, disputes, escalations, collection executions, policy decisions, and AI interactions each have domain tables.
- Important state changes are often through SQL functions or server actions.

Gaps:
- No complete formal state-machine spec per domain.
- Some state transitions are still manual/general-purpose, e.g. `change_cobranca_status`.
- Temporal reproducibility for obligations/rules is incomplete.
- Delegation, credits, settlement, refunds, chargebacks, and tenant archival are absent.

## 12. Financial & Payment Architecture

Keep:
- Provider abstraction.
- Separate internal/external charge IDs.
- Raw webhook persistence before processing.
- Duplicate event handling.
- Payment registration recalculates total paid and status.

Blockers:
- Mock provider only.
- No real PSP adapter.
- No settlement ledger.
- No split/repasses.
- No credit/overpayment/refund/chargeback model.
- No row locking/transactional end-to-end webhook processing proof.

## 13. Collections & Communications

Keep:
- Eligibility is rechecked before each collection step.
- Payment, agreement, cancellation, closure, legal escalation, suspension, contestation, and active negotiation interrupt or pause collection.
- Collection executions are idempotent per enrollment/step.
- Email failures pause after retries and create work items.

Adapt:
- Add channel attempt ledger.
- Add WhatsApp/phone only after consent and policy controls.
- Add bounce/delivery events.
- Add global circuit breaker and simulation mode.

## 14. Documents & Evidence

Keep:
- Private bucket.
- Metadata table.
- Trigger enforcing document tenant matches company.
- Portal can add contestation evidence under RLS.
- Upload cleanup removes storage object if metadata insert fails.

Adapt/refactor:
- Delete flow can orphan metadata if storage deletion succeeds and metadata deletion fails.
- Evidence immutability policy is incomplete.
- Legal dossier packaging/export is not yet complete.

## 15. AI Architecture & AI Safety

Keep:
- AI is not authority.
- Copilots are scoped to read/suggest/draft.
- Prompts forbid invented facts, autonomous decisions, discounts, cancellations, and legal conclusions.
- AI interactions are logged with context references.

Adapt:
- Add eval harness for prompt injection, JSON parse failure, cross-tenant context, and unsafe action suggestions.
- Add model/provider configuration governance.
- Add human decision metrics.

## 16. Workflow, Jobs & Reliability

Current jobs:
- `/api/cron/collection-engine`
- `/api/cron/prospectos-consulta`
- Uncommitted `/api/cron/backup`

Risks:
- Cron jobs use service role.
- No external observability/alerting.
- Backup work is not reconciled with types/migrations.
- Prospect sweep uses real BrasilAPI and intentionally throttles, but lacks robust backoff/retry policy.

## 17. Frontend / UX Architecture

Good:
- Backoffice layout separates staff and sindicato views.
- Portal has separate principal/session model.
- Design-system components exist for headers, tables, statuses, empty states, confirmation, risk panels, timelines.
- Mobile sidebar exists.

Gaps:
- High-volume tables are client-side.
- Search is local, not platform-wide.
- Some production-hardening UX states depend on module-specific implementations.
- React Compiler warns on TanStack Table use.

## 18. Testing & Evals

Executed in this audit:
- `npm run lint`: passed with 1 warning in `src/components/design-system/data-table.tsx:62`.
- `npx tsc --noEmit`: failed on `src/lib/backup/engine.ts:53`.
- `git diff --check`: passed.
- Local DB read-only checks: 46 public tables, 0 with RLS disabled; migration history only `0001-0018`.
- Secret-pattern scan: no real secret value reported; `.env.local` intentionally not opened.

Not executed:
- Playwright full suite, because several specs write data and the audit was read-only.
- `supabase db reset`, migrations, seed, build, deploy, commit, push, merge.

## 19. Technical Debt

- Migration bookkeeping drift.
- Manual DB type generation.
- Uncommitted backup feature breaks typecheck.
- Missing canonical docs.
- Broad audit RPC.
- Service-role usage is comment-governed.
- Client-side table/search scalability.
- No unit/eval/security test layers.
- Production observability absent.
- Financial model incomplete for real money.

## 20. KEEP — What Must Not Be Rewritten

- Shared-schema Supabase/RLS architecture.
- ADR decisions for tenant, Supabase, and RBAC.
- Server action plus RLS pattern.
- Separate portal principal model.
- Collection eligibility engine.
- Payment provider abstraction and raw webhook table.
- Policy engine decision log concept.
- AI human-in-the-loop guardrails.
- Document storage path convention.
- Rodada documentation habit.

## 21. ADAPT

- Tenant lifecycle.
- RBAC with delegation.
- Collection strategy engine.
- Disputes.
- Portal.
- Documents/evidence.
- AI copilots.
- Revenue command center.
- Work items.
- CSP/security headers.
- E2E suite.

## 22. REFACTOR

- Migration/bookkeeping/type generation process.
- Generic audit RPC.
- Backup stopgap before it becomes baseline.
- Document delete consistency.
- Webhook processing transaction/locking.
- Client-side table/search contracts for large datasets.

## 23. REPLACE

No broad replacement recommended. The current architecture should be evolved. Replacement may apply only to the mock payment adapter when a real provider is introduced, but the interface should remain.

## 24. BUILD

- Real payment provider.
- Settlement/reconciliation/split/repasses ledger.
- Credits/overpayments/refunds/chargebacks.
- Delegation/expiry/maker-checker.
- Global RLS-safe search.
- AI eval harness.
- Backup restore proof or PITR.
- Observability and alerting.
- Bulk idempotency contract.
- WhatsApp/multichannel attempt ledger.
- Tenant archival/reactivation.

## 25. Dependency Graph

- Clean baseline depends on reconciling migrations, DB types, and uncommitted backup work.
- Cross-tenant proof depends on two-tenant seed/test fixtures.
- Real provider depends on ledger/reconciliation design, provider contract, webhook concurrency controls, and observability.
- AI expansion depends on RLS-safe retrieval/search and eval harness.
- WhatsApp/multichannel depends on contact consent, channel attempt ledger, and policy/circuit breaker.
- Legal dossier depends on immutable evidence, escalation workflow, and document packaging.
- Forecasts/revenue targets depend on reliable financial ledger.

## 26. Recommended Implementation Sequence

### Phase 0 — Safety / P0

- Reconcile workspace, migrations, local DB bookkeeping, and generated types.
- Get `npx tsc --noEmit` green.
- Add two-tenant adversarial RLS/IDOR/storage tests.
- Decide and stabilize backup/PITR path.
- Constrain service-role inventory and audit RPC.

### Phase 1 — Foundation

- Canonicalize docs: product, domain rules, security, multitenancy, architecture, decisions.
- Add CI gates: lint, typecheck, unit, migration check, selected E2E.
- Add observability/alerting.
- Harden CSP and rate limits.

### Phase 2 — Revenue Core

- Build ledger/reconciliation/split/repasses.
- Add real PSP adapter.
- Add payment concurrency/replay tests.
- Add credits/refunds/chargebacks.

### Phase 3 — Compliance & Legal

- Formalize obligation versioning and publication.
- Add maker-checker and delegation expiry.
- Build immutable legal dossier.
- Complete extrajudicial delivery proof lifecycle.

### Phase 4 — Intelligence

- Build RLS-safe global search.
- Add semantic search only after search policy proof.
- Add AI evals and prompt-injection testing.
- Expand copilots only with provenance and human approval.

### Phase 5 — Optimization

- Server-side pagination/filtering.
- Forecasting and targets.
- Operational dashboards for workload and SLA.
- Performance and cost optimization.

## 27. Proposed Evals

| Eval | Purpose |
|---|---|
| Cross-tenant isolation | Tenant A cannot read/write tenant B via UI/API/RPC/storage |
| RLS table sweep | Every sensitive table enforces expected tenant policies |
| IDOR | Manipulated UUIDs in server actions and routes fail safely |
| Webhook replay | Duplicate provider event does not duplicate payment |
| Payment concurrency | Two valid events for same charge cannot double-register money |
| Collection attempt completion | Sweep overlap cannot send duplicate email for same step |
| Response interruption | Payment/contestação/negociação pauses active collection |
| Timer suspension/resume | Paused enrollments do not advance until allowed |
| Credit authorization | Credits/overpayments cannot be created or applied without policy |
| Delegation expiry | Expired delegated authority cannot act |
| Maker-checker | Same actor cannot create and approve restricted decisions |
| AI prompt injection | External text cannot override system guardrails |
| AI cross-tenant retrieval | AI context never includes another tenant's rows |
| Bulk simulation | Bulk action preview matches final execution set |
| Circuit breaker | Global automation stop prevents sends/jobs/actions |

## 28. Decisions Required From Product Owner

- Keep GBSC in `eu-west-1` or migrate to `sa-east-1` before real customers?
- Upgrade Supabase for PITR or accept/test logical backup stopgap temporarily?
- Which real PSP/provider should be integrated first?
- What split/repass/accounting rules govern GSBC vs sindicato revenue?
- Should demo credentials remain in public staging?
- What tenant archival/reactivation policy is legally required?
- What communication channels are approved first: email only, WhatsApp, phone, postal?
- What level of AI autonomy is acceptable beyond draft/suggestion, if any?

## 29. Final Recommendation

1. Is the current system a viable foundation for GSBC? Yes, as a foundation. No, not yet as a real-money production system.
2. What should be preserved? RLS-first Supabase architecture, domain migrations, server actions, collection eligibility, portal principal separation, payment abstraction, audit/policy logs, and AI human-in-the-loop guardrails.
3. What must be fixed before new features? Migration/typecheck baseline, cross-tenant proof, service-role/audit hardening, backup/PITR decision, observability, and financial ledger/reconciliation model.
4. What is the highest architectural risk? Treating simulated/internal payment state as settlement truth before STG-07 ledger/reconciliation/split exists.
5. What should Codex implement first after approval? Phase 0: reconcile the current workspace/schema/types and add two-tenant adversarial RLS/IDOR/storage tests.
