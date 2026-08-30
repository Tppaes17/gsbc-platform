# GSBC STG-00-09 Findings Register

Data: 2026-08-30

Fonte-base: `docs/STG_00_09_CONSOLIDATION_REPORT.md`

## Current Severity Summary

| Severity | Total | Resolved | Deferred / Open | Blocking status |
|---|---:|---:|---:|---|
| P0 | 0 | 0 | 0 | none |
| P1 | 6 | 1 | 5 | none block STG-10 start; several block STG-10 completion, STG-11/12 or production |
| P2 | 8 | 0 | 8 | backlog / hardening |
| P3 | 3 | 0 | 3 | operational polish |

## P1 Register

| ID | Finding | Current status | Owner | Deadline / Gate | Evidence / Resolution |
|---|---|---|---|---|---|
| P1-001 | DeliveryEvidencePolicy versionada ainda não existia | RESOLVED | Legal Ops + Product + Platform | PRE-STG10 | Added `supabase/migrations/0039_delivery_evidence_policy.sql`, UI evidence display, type sync, docs in `docs/PRODUCT.md` and `docs/DOMAIN_RULES.md`, tests in `e2e/escalonamento.spec.ts`. |
| P1-002 | MFA/step-up e autoridade formal ainda não protegem ações críticas | DEFERRED | Security + Identity + Governance | PRE-STG11 and before production critical actions | Still evidenced by `docs/SECURITY.md`, `src/lib/auth/session.ts`, `src/lib/auth/permissions.ts`; no MFA or delegation substrate implemented in this remediation. |
| P1-003 | Service role possui inventário parcial, mas não governança completa por invariant | DEFERRED | Security + Platform | STG-10 completion / PRE-STG11 | Existing tests cover critical paths, but no formal service-role matrix exists yet. New STG-10 work must not add service-role paths without invariant tests. |
| P1-004 | Settlement real do PSP não está provado | DEFERRED | Payments | PRE-PRODUCTION money movement | Provider remains mock; real PSP settlement and official split/fee payloads remain out of scope for PRE-STG10. |
| P1-005 | State machines canônicas são mais ricas que os estados implementados | DEFERRED | Domain + Architecture | PRE-STG12 autonomous/legal lifecycle | Current remediation separates delivery validity from operational status, but broader canonical state machines remain pending. |
| P1-006 | Testes de STG-10/STG-11/STG-12 ainda são majoritariamente smoke | PARTIALLY REMEDIATED / DEFERRED | QA + Product Engineering | STG-10 completion for STG-10 invariants; later stages for STG-11/12 | Created `docs/STG_10_INVARIANTS.md` and `docs/STG_10_EVAL_PLAN.md`. Implementation tests remain for STG-10 itself. |

## P2 Register

| ID | Finding | Current status | Deadline / Gate |
|---|---|---|---|
| P2-001 | Multicanal de cobrança ainda não implementa WhatsApp nem `CollectionAttempt` + `ChannelDelivery` formal | DEFERRED | STG-11/STG-12 collection expansion |
| P2-002 | Contestação parcial por competência não tem modelo granular completo | DEFERRED | Before production dispute operations requiring partial competence |
| P2-003 | Documentos não evidenciam hash/version chain completo | DEFERRED | Before production-grade evidence chain |
| P2-004 | Busca global/semantic search não existe | DEFERRED | Search/RAG staging |
| P2-005 | Observabilidade ainda é baseline local/structured logs, sem alert routing externo/SLO | DEFERRED | Production readiness |
| P2-006 | Backup é smoke lógico local, não PITR/drill gerenciado | DEFERRED | Production readiness |
| P2-007 | React Compiler warning em DataTable permanece | DEFERRED | Front-end hardening |
| P2-008 | Regras temporais de instrumentos/obrigações ainda são simplificadas frente a retroatividade | DEFERRED | Domain hardening before advanced automation |

## P3 Register

| ID | Finding | Current status |
|---|---|---|
| P3-001 | Warnings `NO_COLOR`/`FORCE_COLOR` em Playwright/webserver | ACCEPTED / MONITOR |
| P3-002 | Ocorrência transitória `The destination stream closed early` em auditoria anterior | ACCEPTED / MONITOR |
| P3-003 | Falta índice consolidado por STG/migration/teste | DEFERRED |
