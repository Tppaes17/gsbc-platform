# GSBC — Arquitetura Alvo

**Documento:** `docs/ARCHITECTURE.md`  
**Versão:** 0.1 — Target Architecture  
**Status:** Direção arquitetural; deve ser confrontada com o repositório existente antes de migrations/refactors.

## 1. Objetivo

Traduzir PRODUCT.md e DOMAIN_RULES.md em fronteiras técnicas sem impor reescrita prematura do sistema existente.

## 2. Princípio

Adotar arquitetura modular orientada a domínios. Evitar microservices por padrão. Preferir modular monolith bem delimitado enquanto escala/independência operacional não justificar separação.

## 3. Bounded Contexts

1. Identity & Access
2. Tenancy & Institutional Hierarchy
3. Collective Instruments
4. Coverage & Corporate Registry
5. Compliance & Obligations
6. Collections & Communications
7. Payments & Reconciliation
8. Negotiation & Credits
9. Legal Operations
10. Workflow & Tasks
11. Documents & Evidence
12. Audit
13. Search
14. Analytics/Scoring/Forecast
15. AI Orchestration
16. Integrations

## 4. Camadas

- UI/Application
- Domain
- Persistence
- Integration adapters
- Async jobs/workers
- Audit/event layer
- Search/read models
- AI orchestration

## 5. Dados temporais

Entidades críticas devem preservar:
- effective_from/to;
- version;
- created_at;
- superseded relation;
- source;
- approval.

Não usar apenas `updated_at` para representar história.

## 6. Eventos

Eventos de domínio relevantes alimentam:
- audit;
- projections;
- notifications;
- tasks;
- integrations;
- analytics.

Não é obrigatório adotar event sourcing integral. O requisito é histórico reproduzível e eventos imutáveis para fatos críticos.

## 7. State machines

Implementar máquinas explícitas para:
- instrument rule;
- coverage;
- obligation;
- charge;
- attempt;
- delivery;
- dispute;
- negotiation;
- payment;
- credit;
- legal case;
- task;
- tenant lifecycle;
- bulk operation.

## 8. Financeiro

Instituição de pagamento = source of truth de liquidação.

GSBC = subledger operacional reconciliado.

Adapter do provedor deve normalizar eventos externos para modelo interno estável.

## 9. Comunicações

`CollectionAttempt` agrega múltiplos `ChannelDelivery`.

Adapters:
- EmailProvider
- WhatsAppProvider

Provider-specific status é normalizado para estados internos.

## 10. Workflow

Tasks são objetos de trabalho; Notifications são awareness.

Timers devem ser persistidos e recuperáveis. Suspensão armazena deadline/remaining duration conforme policy.

## 11. IA

AI Orchestrator não acessa banco irrestritamente.

Fluxo:
User → Auth Context → AI Intent → Policy Check → Read/Simulation → Confirmation/Approval → Tool Execution → Audit.

Retrieval deve receber escopo autorizado antes da consulta.

## 12. Search

Search read model separado do source of truth, com filtros obrigatórios de tenant/grants.

## 13. Documentos

Metadata no banco; objeto binário em storage privado. Hash e version chain.

## 14. Jobs

Jobs idempotentes, com correlation id, tenant id, retry policy e dead-letter/review path.

## 15. Observabilidade

Mínimo:
- structured logs;
- traces/correlation ids;
- metrics;
- queue depth;
- failed jobs;
- integration health;
- webhook failures;
- circuit breaker status;
- SLA breach metrics.

## 16. Ordem de implementação

### Foundation
Tenancy → Auth/RBAC → Audit → Documents → Workflow.

### Revenue Core
Instruments → Rules → Coverage → Obligations → Collections → Payments/Reconciliation → Negotiation/Credits.

### Compliance/Legal
Non-financial compliance → Notices → Legal dossiers → Case tracking.

### Intelligence
Score → Forecast → Semantic Search → Operational AI → Bulk AI.

## 17. Gate antes de alteração estrutural

Antes de qualquer refactor/migration relevante, Codex deve produzir `CURRENT_STATE_GAP_ANALYSIS.md` comparando:
- schema atual;
- RLS;
- auth;
- modules;
- APIs;
- frontend;
- jobs;
- integrations;
- tests;
- observability;
- target architecture.

Nenhuma reescrita ampla deve ser presumida sem essa análise.
