# GSBC STG-10 Invariants

Data: 2026-08-30

Escopo: invariants mínimos para liberar implementação e aceite da STG-10 sem transformar oportunidade inferida em obrigação, dívida, cobrança, comunicação externa ou efeito financeiro.

## Core Invariant

Revenue opportunity is not debt.

STG-10 pode identificar oportunidade, estimar valor, ranquear prioridade, explicar fatores, abrir revisão humana e registrar decisão operacional. STG-10 não pode constituir obrigação, criar cobrança, iniciar régua, emitir notificação, criar payment charge, acionar PSP, alterar status financeiro nem produzir conclusão jurídica definitiva.

## Mandatory Invariants

| ID | Invariant | Required proof before STG-10 completion |
|---|---|---|
| STG10-INV-001 | Opportunity records are inferential only | Tests prove creation/update of opportunity does not insert into `obrigacoes`, `cobrancas`, `payment_charges`, `notificacoes`, `escalonamentos` or external delivery tables. |
| STG10-INV-002 | Score is deterministic for same input snapshot | Unit/integration tests run same fixture twice and produce same score, classification and factor list. |
| STG10-INV-003 | Provenance is explicit | Every score/factor keeps source metadata sufficient to distinguish observed data, derived inference and human decision. |
| STG10-INV-004 | Tenant boundaries remain enforced | Staff/Owner access and any cross-tenant aggregation are explicitly tested; sindicato users cannot access other tenant opportunities. |
| STG10-INV-005 | No silent state transition | STG-10 cannot transition cobrança/obrigação/payment/escalonamento state except through explicit human-approved downstream workflows outside STG-10. |
| STG10-INV-006 | No external communication | STG-10 cannot send email, WhatsApp, notification, extrajudicial notice or PSP request. |
| STG10-INV-007 | Human review is distinguishable from automated inference | Human acceptance/rejection is append-only and cannot erase the original opportunity factors. |
| STG10-INV-008 | Policy/authority gaps remain non-executory | If MFA, delegation or policy-engine runtime is absent, STG-10 must degrade to recommendation/review only. |
| STG10-INV-009 | Financial estimates are estimates | UI/API labels and persisted fields must not represent estimated opportunity as confirmed receivable or recognized revenue. |
| STG10-INV-010 | Audit trail is reconstructable | Opportunity creation, scoring, review and dismissal create events with tenant, actor/source, object, old/new or before/after context where applicable. |

## Release Gate

STG-10 start is released after PRE-STG10 remediation. STG-10 completion remains blocked until the invariant proofs above are implemented and pass in automated tests.
