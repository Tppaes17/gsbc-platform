# GSBC STG-00–09 Consolidation Report

Data: 2026-08-30

Escopo: auditoria transversal read-only de STG-00 a STG-09, com reconstrução do estado atual do repositório e readiness para STG-10, STG-11 e STG-12.

## 1. Executive Verdict

Veredito: baseline tecnicamente viável para avançar para STG-10, com condições explícitas.

Não há P0 aberto identificado nesta auditoria. A base atual tem RLS consistente, testes adversariais de Phase 0, idempotência de webhook provider, reconciliação/split/repasses versionados, Revenue Command Center funcional e STG-09 hardenizado para impedir avanço por entrega falha.

Há P1 relevantes que não bloqueiam STG-10 se STG-10 permanecer estritamente como oportunidade/inferência e não criar obrigação, cobrança ou comunicação externa automática. Esses P1 bloqueiam produção financeira/jurídica ampla e qualquer avanço agentic/autônomo posterior sem remediação.

Final Gate: GO STG-10 WITH CONDITIONS.

## 2. Implementation Map STG-00–09

| STG | Objetivo | Implementação atual | Evidência |
|---|---|---|---|
| STG-00 | Cloud/Foundation/observabilidade | Next.js 16, Supabase, RLS, cron, backup lógico local, Phase 0 security gates | `package.json`, `playwright.config.ts`, `vercel.json`, `src/app/api/cron/backup/route.ts`, `supabase/migrations/0031_*`, `0032_*`, `0033_*`, `e2e/phase0-*.spec.ts` |
| STG-01 | Promoção Prospect -> Empresa | Prospectos, dossiê cadastral, importação, promoção sem recadastro | `supabase/migrations/0018_*`, `0019_*`, `src/app/backoffice/prospectos/*`, `e2e/promocao-prospecto.spec.ts` |
| STG-02 | Collection Strategy Engine | Régua, templates, steps, enrollments, executions, cron com service role e eligibility | `supabase/migrations/0020_collection_strategy_engine.sql`, `src/lib/collection/engine.ts`, `src/lib/collection/eligibility.ts`, `e2e/regua-cobranca.spec.ts` |
| STG-03 | Operations Center | Work items, central operacional, sync de tarefas | `supabase/migrations/0021_operations_center.sql`, `src/app/backoffice/operacoes/*`, `src/lib/operations/*`, `e2e/operacoes.spec.ts` |
| STG-04 | Dispute Management | Contestações, evidências, eventos, portal/staff, status `contestada` pausa régua | `supabase/migrations/0022_contestacoes.sql`, `0023_portal_empresarial.sql`, `src/app/backoffice/cobrancas/[id]/contestacao-actions.ts`, `e2e/contestacao.spec.ts` |
| STG-05 | Portal empresarial | Principal de contato empresarial, login portal, acesso à própria empresa/cobranças | `supabase/migrations/0023_portal_empresarial.sql`, `src/app/portal/*`, `src/app/portal/login/actions.ts`, `e2e/portal-empresarial.spec.ts` |
| STG-06 | Payment Provider Integration | Provider mock, webhook assinado, raw event log, idempotência por provider event id | `supabase/migrations/0024_payment_provider.sql`, `src/lib/payments/*`, `src/app/api/webhooks/payments/[provider]/route.ts`, `e2e/payment-provider.spec.ts` |
| STG-07 | Split, conciliação e repasses | Contratos financeiros, split versionado, conciliação, divergências, reprocessamento, repasses e compensações | `supabase/migrations/0034_*` a `0037_*`, `src/app/backoffice/contratos-financeiros/*`, `src/app/backoffice/conciliacao/*`, `e2e/revenue-core.spec.ts`, `financial-contracts.spec.ts`, `reconciliation-center.spec.ts` |
| STG-08 | Revenue Command Center | KPIs, funil, tendência, segmentação por empresa/obrigação/período/status, drill-down | `src/app/backoffice/receita/page.tsx`, `src/lib/revenue/*`, `e2e/receita.spec.ts` |
| STG-09 | Escalonamento e notificação extrajudicial | Aprovação jurídica, PDF versionado, envio e evidências, falha não avança legal escalation | `supabase/migrations/0025_escalonamento_extrajudicial.sql`, `0038_escalonamento_delivery_evidence_hardening.sql`, `src/app/backoffice/cobrancas/[id]/escalonamento-*`, `e2e/escalonamento.spec.ts` |

## 3. Canonical Product Compliance

| Requisito canônico | Status | Evidência | Observação |
|---|---|---|---|
| Tenant scope por padrão | IMPLEMENTED / COMPLIANT | RLS em migrations de entidades tenant-scoped; `e2e/phase0-security.spec.ts` | STG-07–09 não evidenciam regressão nos testes atuais. |
| RLS como autoridade final | PARTIALLY COMPLIANT | RLS ampla + RPCs `SECURITY DEFINER` com checks internos | Service role ainda exige inventário/governança formal. |
| Histórico não sobrescrito | PARTIALLY COMPLIANT | `*_eventos`, `audit_logs`, `policy_decisoes`, `payment_compensation_events` | Alguns updates atuais ainda alteram projeção sem old/new audit completo. |
| Financeiro idempotente | PARTIALLY COMPLIANT | `register_provider_pagamento`, locks `FOR UPDATE`, E2E replay/concorrência | PSP real e settlement provider permanecem ausentes. |
| IA não é autoridade | IMPLEMENTED / COMPLIANT no escopo atual | `src/lib/ai/collections-copilot.ts`, `supabase/migrations/0028_ai_copilots.sql` | Copilots são read/draft; IA real não configurada nos testes. |
| Notificação extrajudicial com aprovação | IMPLEMENTED / COMPLIANT | `decidir_aprovacao`, `is_escalation_approver`, `registrar_documento_emitido` | Falta política homologada de entrega válida/início de prazo. |
| Cross-tenant grants explícitos | MISSING para federação/confederação | `docs/MULTITENANCY.md`; ausência de `CrossTenantGrant` no schema atual | Não bloqueia STG-10 se não houver hierarquia ativa. |
| MFA/step-up para ações críticas | MISSING | `docs/SECURITY.md`, `docs/PRODUCT.md`; não há implementação observada | P1 para produção e STG-11/12. |
| DeliveryEvidencePolicy versionada | MISSING | `docs/DOMAIN_RULES.md` DR-NOT-004; `supabase/migrations/0038_*` não cria policy | P1 específico de STG-09. |

## 4. End-to-End Flow Audit

### 4.1 Company → Revenue

Fluxo implementado: prospecto/dossiê -> promoção para empresa -> instrumento -> obrigação -> cobrança -> régua/pagamento -> conciliação/split/repasses -> Revenue Command Center.

Evidência:

- `supabase/migrations/0018_prospectos.sql`, `0019_promocao_prospecto.sql`
- `supabase/migrations/0006_empresas.sql`, `0007_instrumentos_obrigacoes.sql`, `0008_cobrancas.sql`
- `supabase/migrations/0034_revenue_core_reconciliation.sql`
- `src/lib/revenue/kpis.ts`, `funnel.ts`, `trend.ts`, `segments.ts`
- `e2e/receita.spec.ts`

Conclusão: coerente para reporting operacional. Ainda não é contabilidade formal completa porque settlement real do PSP e double-entry ledger canônico não existem.

### 4.2 Delinquency → Escalation

Fluxo implementado: cobrança aprovada -> régua -> eligibility -> work item de escalonamento -> escalonamento STG-09 -> aprovação Jurídico/Super Admin -> documento -> envio/evidência -> `legal_escalation`.

Evidência:

- `src/lib/collection/eligibility.ts`
- `src/lib/collection/engine.ts`
- `supabase/migrations/0025_escalonamento_extrajudicial.sql`
- `supabase/migrations/0038_escalonamento_delivery_evidence_hardening.sql`
- `e2e/escalonamento.spec.ts`

Conclusão: falha física não avança estado indevidamente. A transição para `legal_escalation` ainda ocorre com delivery `desconhecido`/`pendente`, o que é aceitável apenas como sinal operacional de envio, não como início de prazo jurídico.

### 4.3 Payment → Reconciliation → Repass

Fluxo implementado: provider webhook -> raw event -> `register_provider_pagamento` -> pagamento -> `reconcile_provider_payment` -> reconciliation/split/repasses -> divergência/retry/compensação.

Evidência:

- `src/lib/payments/webhook-processor.ts`
- `supabase/migrations/0034_revenue_core_reconciliation.sql`
- `supabase/migrations/0036_reconciliation_operations_center.sql`
- `supabase/migrations/0037_repasses_and_compensation_events.sql`
- `e2e/phase0-security.spec.ts`, `e2e/revenue-core.spec.ts`, `e2e/reconciliation-center.spec.ts`

Conclusão: boa baseline local para mock provider. NOT PROVEN SAFE para produção real de settlement enquanto não houver PSP real e payloads oficiais de liquidação/split.

### 4.4 Contestation

Fluxo implementado: portal/staff abre contestação -> cobrança vira `contestada` -> régua pausa -> evidências/eventos -> acompanhamento em backoffice/portal.

Evidência:

- `supabase/migrations/0022_contestacoes.sql`
- `supabase/migrations/0023_portal_empresarial.sql`
- `src/app/backoffice/cobrancas/[id]/contestacao-actions.ts`
- `e2e/contestacao.spec.ts`

Conclusão: bom esqueleto, mas contestação parcial por competência e decisão institucional formal ainda não estão modeladas em granularidade suficiente.

### 4.5 Evidence Chain

Fluxo implementado: documentos em storage privado + metadata, eventos por módulo, audit RPC hardenizado, PDF STG-09 versionado, envio com evidência.

Evidência:

- `supabase/migrations/0013_documentos.sql`
- `supabase/migrations/0032_phase0_security_hardening.sql`
- `supabase/migrations/0025_escalonamento_extrajudicial.sql`
- `supabase/migrations/0038_escalonamento_delivery_evidence_hardening.sql`

Conclusão: reconstrução operacional é possível na maioria dos caminhos. Reconstrução probatória completa ainda pede hash/version chain documental, política de delivery versionada e audit com correlation/source/policy version em todas as ações sensíveis.

## 5. P0 Findings

Nenhum P0 aberto identificado.

## 6. P1 Findings

### P1-001 — DeliveryEvidencePolicy versionada ainda não existe

- Severity: P1
- Classification: BUILD / DOCUMENT_DECISION
- Canonical requirement: `docs/DOMAIN_RULES.md` DR-NOT-004 exige marco inicial por evidência de entrega definida em policy versionada.
- Actual implementation: `registrar_envio` registra `delivery_status`, referência externa e arquivo, mas não aplica uma política versionada de validade/início de prazo.
- Repository evidence: `supabase/migrations/0038_escalonamento_delivery_evidence_hardening.sql`; `src/app/backoffice/cobrancas/[id]/escalonamento-actions.ts`; `e2e/escalonamento.spec.ts`.
- Failure scenario: operador registra AR/protocolo ou e-mail entregue, mas o sistema não consegue provar qual regra jurídica de entrega/início de prazo estava vigente naquele momento.
- Recommendation: criar `DeliveryEvidencePolicy` versionada antes de usar STG-09 como gatilho jurídico automático.
- Dependencies: decisão PO/Jurídico sobre entrega válida por canal.
- Blocks STG-10: não, se STG-10 não acionar notificação/prazo automaticamente.

### P1-002 — MFA/step-up e autoridade formal ainda não protegem ações críticas

- Severity: P1
- Classification: BUILD
- Canonical requirement: `docs/PRODUCT.md` seções 5.2, 5.5, 6.5, 6.6, 18; `docs/SECURITY.md` seção 3.
- Actual implementation: RBAC existe via roles/memberships; aprovações usam staff/Owner/Jurídico/Super Admin, mas não há MFA/step-up nem delegação formal vigente.
- Repository evidence: `src/lib/auth/session.ts`, `src/lib/auth/permissions.ts`, `supabase/migrations/0004_onboarding_and_invites.sql`, `0025_escalonamento_extrajudicial.sql`, `0027_policy_engine.sql`.
- Failure scenario: sessão já autenticada de perfil crítico executa aprovação jurídica/desconto/policy sem step-up ou prova de autoridade formal.
- Recommendation: implementar authority/delegation/MFA gates antes de STG-11 real e antes de produção jurídica/financeira.
- Dependencies: modelo de `AuthorityDelegation`, provedor MFA e UX de step-up.
- Blocks STG-10: não, desde que STG-10 permaneça inferencial.

### P1-003 — Service role possui inventário parcial, mas não governança completa por invariant

- Severity: P1
- Classification: ADAPT
- Canonical requirement: `docs/MULTITENANCY.md` jobs carregam `tenant_id`; `docs/SECURITY.md` least privilege/server-side auth.
- Actual implementation: `createAdminClient()` documenta uso exclusivo e Phase 0 testa caminhos críticos, mas service role ainda aparece em cron de cobrança, sweep CNPJ, sync operacional, portal login, webhook e backup.
- Repository evidence: `src/lib/supabase/admin.ts`; `src/lib/collection/engine.ts`; `src/lib/cnpj/consulta-sweep.ts`; `src/lib/operations/sync.ts`; `src/lib/payments/webhook-processor.ts`; `src/lib/backup/engine.ts`; `e2e/phase0-security.spec.ts`.
- Failure scenario: novo path service-role processa tenant errado ou aceita ID externo não confiável sem RLS.
- Recommendation: criar matriz service-role por função, com assertions obrigatórias e testes negativos por path.
- Dependencies: harness de testes integration/RPC.
- Blocks STG-10: condição, porque STG-10 não deve criar job de oportunidade cross-tenant sem esse padrão.

### P1-004 — Settlement real do PSP não está provado

- Severity: P1
- Classification: BUILD
- Canonical requirement: `docs/DOMAIN_RULES.md` DR-PAY-001 a DR-PAY-006; `docs/PRODUCT.md` seção 20.
- Actual implementation: provider `mock`; split/repasses são subledger operacional calculado pela GSBC a partir de regra interna.
- Repository evidence: `src/lib/payments/registry.ts`; `src/lib/payments/mock-provider.ts`; `supabase/migrations/0024_payment_provider.sql`; `0034_revenue_core_reconciliation.sql`.
- Failure scenario: dashboard/repasses divergem do settlement real do PSP porque payloads oficiais de liquidação/split/taxas ainda não foram integrados.
- Recommendation: manter como readiness de produto interno; não operar dinheiro real até integrar PSP real e reconciliar settlement.
- Dependencies: escolha de PSP e contrato financeiro.
- Blocks STG-10: não para oportunidade; sim para monetização financeira real.

### P1-005 — State machines canônicas são mais ricas que os estados implementados

- Severity: P1
- Classification: ADAPT
- Canonical requirement: `docs/DOMAIN_RULES.md` seções 7, 9, 12, 13, 15, 17.
- Actual implementation: estados existem, mas vários são simplificados: cobrança usa `approved/notified/.../legal_escalation`; régua é email/tarefa/wait/escalonamento; notificação STG-09 usa `em_revisao/aprovada/documento_emitido/enviada`.
- Repository evidence: `supabase/migrations/0008_cobrancas.sql`, `0020_collection_strategy_engine.sql`, `0025_escalonamento_extrajudicial.sql`, `0038_*`.
- Failure scenario: um mesmo status operacional vira proxy para fatos jurídicos diferentes, dificultando automação segura posterior.
- Recommendation: antes de STG-12, separar delivery/tentativa/notificação/prazo/preparação jurídica em state machines explícitas.
- Dependencies: decisão de DeliveryEvidencePolicy e Legal Ops.
- Blocks STG-10: não, se oportunidades não moverem estados de cobrança.

### P1-006 — Testes de STG-10/STG-11/STG-12 ainda são majoritariamente smoke

- Severity: P1
- Classification: BUILD
- Canonical requirement: mandato atual exige testes contra invariants; `docs/SECURITY.md` seção 16.
- Actual implementation: STG-10, STG-11 e STG-12 possuem testes de presença/acesso e avisos, mas não exercitam invariants centrais.
- Repository evidence: `e2e/oportunidades.spec.ts`, `e2e/politicas.spec.ts`, `e2e/copilotos.spec.ts`.
- Failure scenario: score/opportunity, policy toggles ou copilot podem regredir sem falhar suíte.
- Recommendation: adicionar testes de score determinístico, opportunity-is-not-debt, policy decision enforcement, prompt-injection/provenance antes de ampliar essas camadas.
- Dependencies: fixtures próprias e harness de IA/evals.
- Blocks STG-10: sim como condição de completion de STG-10, não como blocker para iniciar revisão/hardening.

## 7. P2 Findings

- P2-001 — Multicanal de cobrança ainda não implementa WhatsApp nem `CollectionAttempt` + `ChannelDelivery` formal. Classification: BUILD. Evidence: `supabase/migrations/0020_collection_strategy_engine.sql` restringe templates a e-mail; `docs/DOMAIN_RULES.md` DR-COL-003.
- P2-002 — Contestação parcial por competência não tem modelo granular completo. Classification: BUILD. Evidence: `contestacoes` referencia `cobranca_id`, não competência/linha segregada; `docs/DOMAIN_RULES.md` DR-DSP-003.
- P2-003 — Documentos não evidenciam hash/version chain completo. Classification: ADAPT. Evidence: `supabase/migrations/0013_documentos.sql`; `docs/SECURITY.md` seção 12.
- P2-004 — Busca global/semantic search não existe. Classification: BUILD. Evidence: ausência de módulo de search; `docs/ARCHITECTURE.md` seção 12.
- P2-005 — Observabilidade ainda é baseline local/structured logs, sem alert routing externo/SLO. Classification: ADAPT. Evidence: `src/lib/observability/events.ts`, `docs/PHASE_0_EXECUTION_REPORT.md`.
- P2-006 — Backup é smoke lógico local, não PITR/drill gerenciado. Classification: ADAPT. Evidence: `e2e/phase0-backup-restore.spec.ts`, `docs/PHASE_0_EXECUTION_REPORT.md`.
- P2-007 — React Compiler warning em DataTable permanece. Classification: ADAPT. Evidence: `npm run lint`, `src/components/design-system/data-table.tsx:62`.
- P2-008 — Regras temporais de instrumentos/obrigações ainda são simplificadas frente a retroatividade. Classification: BUILD. Evidence: `supabase/migrations/0007_instrumentos_obrigacoes.sql`; `docs/PRODUCT.md` seção 11.

## 8. P3 Findings

- P3-001 — Logs do Playwright/webserver mostram warnings `NO_COLOR`/`FORCE_COLOR`; sem impacto funcional, mas polui auditorias.
- P3-002 — Uma ocorrência transitória `The destination stream closed early` apareceu no webserver durante `npm run test:e2e`, sem falhar teste; vale monitorar.
- P3-003 — Relatórios de rodadas são ricos, mas poderiam ter índice consolidado por STG/migration/teste.

## 9. Multitenancy Regression Review

Resposta explícita: STG-07–09 enfraqueceram algum security invariant da Phase 0? Não há evidência disso nos testes atuais. Resultado: NOT PROVEN UNSAFE; parcialmente PROVEN SAFE para os invariants cobertos.

Evidência:

- `e2e/phase0-security.spec.ts` cobre cross-tenant select/update/insert, portal contact, storage e RPC service-role.
- `e2e/reconciliation-center.spec.ts` cobre negação de acesso de sindicato à central de conciliação.
- `e2e/financial-contracts.spec.ts` cobre negação de acesso de sindicato a contratos financeiros.
- `e2e/escalonamento.spec.ts` cobre visibilidade transparente e ações staff.

Limite: não há teste adversarial específico para cada RPC STG-07–09 com IDs de outro tenant; a defesa depende dos checks internos `is_platform_staff` e das relações tenant resolvidas no banco.

## 10. Authorization / Service Role / RPC Review

RPCs service-role only:

- `backup_list_tables()`
- `register_provider_pagamento(...)`
- `reconcile_provider_payment(...)`

RPCs sensíveis autenticados com checks internos:

- `create_financial_split_rule_version(...)`
- `retry_manual_payment_reconciliation(...)`
- `transition_financial_repasse(...)`
- `register_payment_compensation_event(...)`
- `iniciar_escalonamento(...)`
- `submeter_para_aprovacao(...)`
- `decidir_aprovacao(...)`
- `registrar_documento_emitido(...)`
- `registrar_envio(...)`
- `registrar_resultado(...)`

Conclusão: os caminhos críticos recentes usam server-side checks e/ou service role restrita. Risco remanescente: ausência de matriz formal de autoridade/delegação/MFA por ação.

## 11. Financial Integrity Review

Pontos preserváveis:

- raw webhook é persistido antes do processamento;
- uniqueness por `(provider, external_event_id)`;
- `register_provider_pagamento` usa `FOR UPDATE`;
- split version fica vinculado em `payment_reconciliations` e `payment_split_items`;
- reprocessamento bloqueia conciliação com repasse não-pendente;
- repasse pago não pode ser alterado; compensação é append-only.

Pontos não provados para produção real:

- PSP real como source of truth de settlement;
- IDs reais de settlement/split/taxas;
- chargeback/refund vindo do provider real;
- double-entry ledger contábil.

Perguntas obrigatórias:

- Um provider event consegue produzir efeito financeiro duplicado? Para o mock e invariants testados, não: `e2e/phase0-security.spec.ts` cobre replay e concorrência. Para PSP real: NOT PROVEN SAFE.
- Reconciliation ou repass conseguem divergir silenciosamente? Parcialmente mitigado por divergências/review/compensações. Ainda NOT PROVEN SAFE para PSP real.
- Revenue Command Center deriva de estado financeiro confiável? Deriva do estado interno atual (`pagamentos`, `cobrancas`, `payment_reconciliations`). Confiável para baseline operacional mock; não para settlement real sem PSP.

## 12. State Machine Review

Máquinas explícitas/parciais:

- cobrança: `cobrancas.status` + `cobranca_eventos`;
- régua: `collection_enrollments.status` + `collection_executions.status`;
- contestação: `contestacoes.status` + `contestacao_eventos`;
- pagamento/provider: `payment_charges.status`, `payment_webhook_events.processing_status`;
- conciliação: `payment_reconciliations.status`;
- repasse: `financial_repasses.status`;
- escalonamento: `escalonamentos.status` + eventos/envios/documentos.

Gaps:

- tentativa multicanal formal;
- delivery por canal com policy versionada;
- obrigação canônica `DRAFT -> CONSTITUTED -> OPEN -> DUE -> OVERDUE`;
- crédito;
- post-notification legal decision window;
- bulk/circuit breaker.

## 13. Temporal & Versioning Review

Implementado:

- `collection_templates.versao`;
- `financial_contracts.vigencia_inicio/fim`;
- `financial_split_rules.version/effective_from/effective_to`;
- `payment_reconciliations.split_rule_version`;
- `escalonamento_documentos.template_versao`;
- `policy_decisoes.policy_versao`.

Gaps:

- validade temporal de authority/delegation;
- versões normativas completas de instrumentos/regras;
- DeliveryEvidencePolicy versionada;
- memória de cálculo completa por competência;
- validade temporal de dados de CNPJ/cobertura usados no cálculo.

## 14. Audit & Evidence Review

Positivo:

- `audit_logs` é append-only via RPC hardenizado;
- vários módulos possuem tabelas `*_eventos`;
- `policy_decisoes` preserva inputs/resultados;
- `payment_compensation_events` preserva reversals/chargebacks/credits sem apagar original;
- STG-09 preserva documento, template version, envio e evidência.

Gaps:

- nem toda ação sensível registra old/new state;
- correlation/request id não é universal;
- authority/policy/version não aparecem em todos os eventos;
- hash de documentos não está provado;
- delivery evidence policy não está versionada.

Pergunta obrigatória: audit history pode ser forjado ou destrutivamente alterado? Delete/update direto não foi evidenciado para `audit_logs`; Phase 0 testa spoofing. Ainda há risco parcial por eventos de domínio que aceitam payload textual e por service role, mas não há P0 atual.

## 15. STG-09 Physical Delivery Decision Gap

Classificação: DOCUMENT_DECISION / ADAPT.

1. Respaldo canônico explícito: parcial. O roadmap exige evidência de canal/destinatário/timestamp/delivery/erro; `DOMAIN_RULES.md` exige policy versionada para entrega válida.
2. Extensão não homologada: sim, referência externa auditável AR/protocolo é implementação razoável, mas precisa decisão formal.
3. Altera definição de entrega válida: potencialmente sim se usada como `DELIVERED`; hoje só registra evidência.
4. Altera início de prazo: não deve alterar até existir DeliveryEvidencePolicy.
5. Altera collection attempt: não deve; STG-09 é pós-régua.
6. Altera extrajudicial notice: sim no sentido operacional de envio/evidência; não deve alterar prazo jurídico automaticamente.
7. Digital e físico possuem evidência consistente: parcialmente; ambos registram canal/destinatário/status/erro, físico agora aceita arquivo ou referência.
8. Falha física pode avançar estado indevidamente: não nos testes atuais; `e2e/escalonamento.spec.ts` cobre esse invariant.
9. Digital válida e física válida possuem efeitos diferentes: o sistema ainda não modela efeitos jurídicos distintos por canal.

Decisão: manter a implementação como registro operacional de evidência, mas documentar decisão jurídica antes de usar referência externa como entrega válida ou início de prazo.

## 16. Test Coverage vs Business Invariants

| Invariant | Cobertura atual |
|---|---|
| tenant isolation/API/storage | `e2e/phase0-security.spec.ts` |
| service-role restriction | `e2e/phase0-security.spec.ts` |
| audit spoofing | `e2e/phase0-security.spec.ts` |
| webhook replay/concurrency | `e2e/phase0-security.spec.ts`, `e2e/payment-provider.spec.ts` |
| split/reconciliation/repass | `e2e/revenue-core.spec.ts`, `financial-contracts.spec.ts`, `reconciliation-center.spec.ts` |
| delivery failure does not advance escalation | `e2e/escalonamento.spec.ts` |
| Revenue Command Center drill-down | `e2e/receita.spec.ts` |
| opportunity is not debt | NOT PROVEN SAFE by automated test |
| policy engine full enforcement | NOT PROVEN SAFE by automated test |
| prompt injection/RAG isolation | NOT PROVEN SAFE |
| MFA/maker-checker/delegation | NOT PROVEN SAFE |
| WhatsApp/multichannel attempt | MISSING implementation/test |
| PSP settlement truth | NOT PROVEN SAFE |

Checks executados nesta auditoria:

- `npx tsc --noEmit`: passed.
- `npm run lint`: passed with one warning at `src/components/design-system/data-table.tsx:62`.
- `npx supabase db diff --local --schema public,storage --use-migra`: passed, no schema drift.
- `npm run test:e2e`: passed, 75/75.

## 17. Architecture & Technical Debt

Accepted Debt:

- provider mock while product remains pre-production;
- logical backup smoke instead of managed PITR drill;
- STG-12 copilots visible with “IA não configurada” when key absent.

Accidental Debt:

- STG-10/STG-11 smoke tests still cite manual verification;
- warning React Compiler/TanStack Table remains;
- inconsistent depth of audit payloads across modules.

Structural Debt:

- absence of authority/delegation/MFA/maker-checker substrate;
- absence of DeliveryEvidencePolicy;
- absence of PSP settlement integration;
- absence of formal multichannel attempt/delivery ledger.

Structural debt does not block starting STG-10 as review/hardening of opportunity intelligence, but blocks autonomous/legal/financial execution.

## 18. KEEP — Baseline to Preserve

- Supabase/RLS-first shared-schema model.
- Server actions colocated with domain UI.
- RPCs for sensitive state transitions.
- Raw webhook before processing.
- `register_provider_pagamento` with row lock.
- Split rule version captured on reconciliation/split items.
- Repass transitions and compensation as explicit functions/events.
- STG-09 maker/checker-like legal approval before document generation.
- Phase 0 adversarial tests and full E2E gate.

## 19. ADAPT

- Add DeliveryEvidencePolicy without discarding current evidence table.
- Expand audit payloads with old/new/source/correlation/policy version.
- Add service-role invariant matrix.
- Expand STG-10/STG-11/STG-12 tests from smoke to business invariants.
- Harden DataTable warning intentionally.

## 20. REFACTOR

- Split collection attempt/delivery concepts instead of encoding as strategy step/execution only.
- Separate legal escalation operational status from legal deadline lifecycle.
- Move repeated env/service-role test helpers into shared E2E support after audit.

## 21. BUILD

- AuthorityDelegation and step-up MFA.
- CrossTenantGrant if federation/confederation access enters scope.
- PSP real adapter and settlement reconciliation.
- Credits lifecycle.
- Search/RAG tenant-scoped retrieval.
- Policy Engine decision runtime beyond registry/log.
- AI eval harness and circuit breaker.

## 22. Product Decisions Required

- What counts as valid physical delivery per channel: AR posted, AR delivered, cartório protocol, signed receipt, or another rule?
- Can external reference without file start any legal deadline, or only record operational evidence?
- Which profiles/actions require step-up MFA in MVP production?
- Whether STG-10 may evaluate opportunities across all tenants as Owner-only intelligence, and what aggregation/anonymization constraints apply.
- PSP/provider selection and settlement payload contract.

## 23. STG-10 Readiness

STG-10 can proceed as hardening/completion if the invariant is enforced: Revenue opportunity is not debt.

Current opportunity implementation is explicitly inferential: `supabase/migrations/0026_revenue_opportunity_engine.sql` comments say opportunity is never confirmed legal obligation; `src/lib/oportunidades/scoring.ts` labels score/fit/estimativa.

Required before completion:

- automated tests proving opportunity cannot create `obrigacoes`, `cobrancas`, `payment_charges` or external communication;
- deterministic score tests;
- tenant-scope/Owner-only tests beyond route visibility;
- evidence/provenance review for factors.

## 24. STG-11 Readiness

Current STG-11 is a registry/log plus selected enforced policies. It is not yet the full decision engine described as Actor + Tenant + Authority + Delegation + Object + Action + Policy + Risk -> Decision.

Prerequisites:

- authority/delegation model;
- policy decision API with `ALLOW`, `DENY`, `REQUIRE_CONFIRMATION`, `REQUIRE_MFA`, `REQUIRE_MAKER_CHECKER`, `REQUIRE_ENTITY_AUTHORITY`, `GSBC_VETO`;
- test harness for denial/bypass;
- audit correlation across decisions and execution.

## 25. STG-12 Readiness

Current STG-12 is safe as low-autonomy UI copilots with no configured AI key in local/staging tests.

Not ready for agentic collections. Missing:

- tenant-scoped retrieval/RAG;
- prompt injection tests;
- tool authorization through Policy Engine;
- simulation snapshots;
- approval invalidation after material data change;
- bulk circuit breaker;
- idempotent resume;
- eval harness.

## 26. Required Remediation Before STG-10

Mandatory before completing STG-10, not necessarily before starting its audit/hardening:

1. Add tests that prove opportunity cannot become debt.
2. Add deterministic scoring/provenance tests.
3. Confirm Owner-only cross-tenant opportunity analysis is an intentional product/security decision.
4. Keep STG-10 outputs as inference/status only until authority and policy infrastructure mature.

## 27. Deferred Backlog

- DeliveryEvidencePolicy versioned table and UI.
- MFA/step-up/maker-checker.
- AuthorityDelegation.
- CrossTenantGrant.
- PSP real adapter.
- Settlement payload reconciliation.
- Credit lifecycle.
- Multichannel WhatsApp attempt/delivery.
- Search/RAG isolation.
- AI prompt-injection/eval harness.
- PITR production restore drill.
- External observability/alerting.

## 28. Final Gate Decision

### GO STG-10 WITH CONDITIONS

Justification:

- No P0 blocker identified.
- STG-07–09 did not show regression of Phase 0 security invariants under current tests.
- Full E2E suite passes: 75/75.
- Schema diff is clean.
- STG-09 invalid delivery no longer advances legal escalation.

Conditions:

- STG-10 must remain non-executory intelligence: no obligation, no charge, no notification, no payment effect.
- STG-10 completion must add business invariant tests, not only UI smoke.
- No STG-11/12 autonomous execution should be built before authority/delegation/MFA, DeliveryEvidencePolicy, Policy Engine runtime and AI eval/circuit-breaker foundations.

Obrigatory questions answered:

1. STG-07–09 enfraqueceram algum security invariant da Phase 0? No evidence found; partially proven by E2E, not exhaustive per RPC.
2. Um tenant consegue manipular dados de Revenue Core de outro tenant? Not shown by tests; current UI/RLS deny sindicato access to financial contracts/conciliation. NOT PROVEN SAFE for every RPC/IDOR permutation.
3. Um provider event consegue produzir efeito financeiro duplicado? For mock/replayed/concurrent tested cases, no. For real PSP, NOT PROVEN SAFE.
4. Reconciliation ou repass conseguem divergir silenciosamente? Mitigated by manual review/divergence/compensation; real PSP settlement NOT PROVEN SAFE.
5. Uma entrega inválida consegue avançar escalation? Delivery `falha` does not, covered by `e2e/escalonamento.spec.ts`.
6. Um usuário consegue contornar authority por outro módulo/API/RPC? No current evidence for covered paths; MFA/delegation gaps remain P1.
7. Audit history pode ser forjado ou destrutivamente alterado? Phase 0 blocks tested spoofing; service role and uneven domain event payloads remain risk.
8. Revenue Command Center deriva de estado financeiro confiável? Yes for internal operational state; not settlement-grade without PSP real.
9. Alguma implementação atual trata revenue opportunity como dívida? No direct evidence; STG-10 tests must prove this invariant.
10. Quais pré-requisitos de STG-10–12 ainda estão estruturalmente ausentes? Authority/delegation/MFA, DeliveryEvidencePolicy, Policy runtime, search/RAG isolation, AI evals, circuit breaker, PSP settlement.
11. Physical delivery é feature canônica ou extensão não documentada? Canonical as evidence concept; external reference without file is a reasonable extension requiring documented product/legal decision.
12. Quais testes concretos sustentam cada resposta crítica? `e2e/phase0-security.spec.ts`, `e2e/escalonamento.spec.ts`, `e2e/revenue-core.spec.ts`, `e2e/financial-contracts.spec.ts`, `e2e/reconciliation-center.spec.ts`, `e2e/receita.spec.ts`, `e2e/payment-provider.spec.ts`.
