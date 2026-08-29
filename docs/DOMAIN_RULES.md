# GSBC — Regras de Domínio

**Documento:** `docs/DOMAIN_RULES.md`  
**Versão:** 1.0  
**Fonte:** `docs/PRODUCT.md` v1.1  
**Status:** Especificação normativa de domínio

---

## 1. Objetivo

Transformar a Constituição do Produto em regras determinísticas para implementação. Quando houver conflito, `PRODUCT.md` prevalece até registro formal em `DECISIONS.md`.

## 2. Convenções

- Estados históricos não são sobrescritos.
- Transições relevantes geram evento auditável.
- Relógios internos são pausáveis; prazos legais externos não são presumidos pausáveis.
- Ações críticas respeitam RBAC, autoridade formal, MFA e maker-checker.
- Toda regra aplicada referencia sua versão.
- Toda operação externa deve ser idempotente.

## 3. Tenant e autoridade

### DR-TEN-001
Cada entidade contratante é um tenant independente.

### DR-TEN-002
Vínculo sindicato–federação–confederação não concede acesso automaticamente.

### DR-TEN-003
Acesso entre tenants exige grant explícito com:
`grantor_tenant`, `grantee_tenant`, escopo, permissões, validade, aprovador e trilha de auditoria.

### DR-AUTH-001
Presidente, Vice-Presidente e delegado formal podem exercer atos críticos apenas dentro da alçada vigente.

### DR-AUTH-002
Delegação expirada/revogada falha fechada.

### DR-AUTH-003
GSBC Compliance Veto pode bloquear execução sem apagar a decisão institucional do tenant.

## 4. Instrumento e regra

Estados mínimos de regra:

`DRAFT → AI_INTERPRETED → GSBC_REVIEW → ENTITY_VALIDATION → PUBLISHED`

Estados adicionais:

`REJECTED`, `SUSPENDED`, `SUPERSEDED`.

### DR-INS-001
`PUBLISHED` exige fonte normativa rastreável e validação humana.

### DR-INS-002
IA não transiciona diretamente para `PUBLISHED`.

### DR-INS-003
Nova versão não altera fatos históricos calculados sob versão anterior.

### DR-INS-004
Conflito bloqueia somente o universo afetado quando segregável.

## 5. CNPJ e enquadramento

Estados mínimos:

`LEAD → GSBC_REVIEW → ENTITY_VALIDATION → ACTIVE`

Alternativas:

`REJECTED`, `UNDER_REVIEW`, `INACTIVE`, `CLOSED`.

### DR-COV-001
`LEAD` não gera obrigação nem forecast financeiro.

### DR-COV-002
Mudança de CNAE não suspende automaticamente obrigações existentes.

### DR-COV-003
Evento societário nunca transfere dívida automaticamente.

## 6. Evidência documental fornecida pela empresa

Estados:

`RECEIVED → REGISTERED → UNDER_REVIEW → VALIDATED`

Alternativas:

`INCONSISTENT`, `REJECTED`, `SUPERSEDED`.

### DR-DOC-001
Arquivo original é preservado com hash e metadados.

### DR-DOC-002
Documento fornecido pela empresa é evidência, não verdade automática.

### DR-DOC-003
Competência e CNPJ devem ser vinculados quando aplicáveis.

## 7. Obrigação

Estados sugeridos:

`DRAFT → CONSTITUTED → OPEN → DUE → OVERDUE`

Saídas possíveis:

`PAID`, `PARTIALLY_PAID`, `SUSPENDED`, `CONTESTED`, `CANCELLED`, `CREDITED`, `LEGAL_PREPARATION`, `CLOSED`.

### DR-OBL-001
Obrigação constituída referencia regra, versão, competência, CNPJ e memória de cálculo.

### DR-OBL-002
Cancelamento não apaga constituição anterior.

### DR-OBL-003
Contestação parcial deve ser segregada quando tecnicamente possível.

## 8. Cobrança preventiva

### DR-COL-001
Pré-vencimento não incrementa contador de tentativa.

### DR-COL-002
Timing segue hierarquia entidade → instrumento → obrigação.

## 9. Tentativa multicanal

Estado da tentativa:

`PLANNED → IN_PROGRESS → COMPLETED`

Alternativas:

`SUSPENDED`, `CANCELLED`, `FAILED_REVIEW_REQUIRED`.

Estado por canal:

`PENDING → SENT → DELIVERED`

Alternativas:

`TEMPORARY_FAILURE`, `PERMANENT_FAILURE`, `CANCELLED`.

### DR-COL-003
Inicialmente e-mail e WhatsApp são canais obrigatórios.

### DR-COL-004
E-mail válido = confirmação técnica de aceitação/entrega sem falha definitiva.

### DR-COL-005
WhatsApp válido = status técnico `delivered` ou equivalente homologado.

### DR-COL-006
`read` não é condição para `DELIVERED`.

### DR-COL-007
`attempt_completed_at = max(delivered_at dos canais obrigatórios)`.

### DR-COL-008
Falha em um canal não invalida entrega já obtida no outro.

### DR-COL-009
Falha definitiva suspende avanço e cria tarefa de correção.

### DR-COL-010
Próxima tentativa somente pode iniciar após 3 dias úteis desde `attempt_completed_at`.

## 10. Resposta da empresa

Classificação mínima:

`AUTOMATED_RESPONSE`, `HUMAN_RESPONSE`, `UNCERTAIN`.

### DR-RESP-001
Resposta humana válida suspende automação imediatamente.

### DR-RESP-002
Resposta incerta falha fechada: suspende e cria revisão humana.

### DR-RESP-003
Autoresposta técnica/ausência não deve, após classificação segura, ser tratada como negociação humana.

### DR-RESP-004
Ao suspender, armazenar tempo restante do relógio interno.

### DR-RESP-005
Retomada continua do checkpoint; não reinicia a régua.

## 11. SLA humano

### DR-SLA-001
Teto geral: 15 dias úteis.

### DR-SLA-002
Precedência: prazo legal aplicável → exceção tenant → política GSBC.

### DR-SLA-003
Violação de SLA não reinicia cobrança automaticamente.

### DR-SLA-004
Somente relógios controlados pelo GSBC podem ser congelados pelo workflow.

## 12. Notificação extrajudicial

Estados:

`PREPARING → READY → SENT → DELIVERED → WAITING`

Saídas:

`RESPONDED`, `EXPIRED`, `SUSPENDED`, `FAILED_REVIEW_REQUIRED`.

### DR-NOT-001
É preparada após terceira tentativa válida não resolvida.

### DR-NOT-002
Envio ocorre no primeiro dia útil seguinte, sujeito a guards.

### DR-NOT-003
Prazo padrão é 10 dias corridos.

### DR-NOT-004
O marco inicial deverá ser a evidência de entrega definida na policy versionada da notificação; até homologação jurídica específica, não usar mera criação do documento como início do prazo.

## 13. Decisão pós-notificação

Estados:

`PENDING_ENTITY_DECISION → APPROVED_LEGAL_PREPARATION | DECLINED | SUSPENDED | NEGOTIATION_REQUESTED`

### DR-LEG-001
Janela padrão: 10 dias corridos.

### DR-LEG-002
Silêncio só pode iniciar preparação jurídica automática se houver autorização tenant/contratual versionada para essa consequência.

### DR-LEG-003
Preparação jurídica não equivale a ajuizamento.

### DR-LEG-004
Compliance Veto prevalece sobre execução GSBC.

## 14. Contestação

Estados:

`RECEIVED → UNDER_ANALYSIS → ENTITY_DECISION`

Saídas:

`ACCEPTED`, `REJECTED`, `PARTIALLY_ACCEPTED`, `SUSPENDED`, `EXTERNAL_ACTION_REQUIRED`.

### DR-DSP-001
GSBC registra recomendação técnica; entidade registra decisão institucional.

### DR-DSP-002
Divergência é preservada.

### DR-DSP-003
Parte não contestada continua quando segregável.

## 15. Pagamento e conciliação

A instituição de pagamento é source of truth da liquidação.

Estados GSBC:

`EXPECTED → PROVIDER_REPORTED → RECONCILING → RECONCILED`

Alternativas:

`UNIDENTIFIED`, `PARTIAL`, `REVERSED`, `CHARGEBACK`, `FAILED_REVIEW_REQUIRED`.

### DR-PAY-001
Eventos do provedor exigem idempotency key/provider event id.

### DR-PAY-002
GSBC não duplica split liquidado pelo provedor.

### DR-PAY-003
Subledger registra componentes e beneficiários retornados pelo provedor.

### DR-PAY-004
Pagamento não identificado não é vinculado automaticamente.

### DR-PAY-005
Estorno gera evento compensatório e não apaga pagamento original.

### DR-PAY-006
Regra comercial aplicada deve ser preservada por versão na transação.

## 16. Crédito

Estados:

`RECOGNIZED → AVAILABLE → AUTHORIZATION_PENDING → APPLIED`

Alternativas:

`BLOCKED`, `EXPIRED_IF_LEGALLY_DEFINED`, `CANCELLED_BY_RECTIFICATION`.

### DR-CRD-001
Reconhecimento pode ser automático.

### DR-CRD-002
Uso exige autorização da entidade por ocorrência.

## 17. Negociação

Estados:

`OPEN → PROPOSAL → AGREEMENT_PENDING → AGREED`

Alternativas:

`REJECTED`, `EXPIRED`, `CANCELLED`, `DEFAULTED`.

### DR-NEG-001
Operador GSBC atua apenas dentro da policy versionada.

### DR-NEG-002
Exceção exige autoridade formal, justificativa e auditoria.

## 18. Jurídico

### DR-LEGAL-001
GSBC tecnológico e prestador jurídico são papéis distintos.

### DR-LEGAL-002
Template jurídico possui versão, tipo, vigência e aprovador habilitado.

### DR-LEGAL-003
IA preenche template homologado; não cria tese jurídica livre.

### DR-LEGAL-004
Prescrição é sinalizada, nunca decidida autonomamente.

## 19. Dados pessoais e histórico

### DR-PRIV-001
Audit/Event Ledger é append-only.

### DR-PRIV-002
Operational Projection pode ser corrigida por novos eventos.

### DR-PRIV-003
Personal Data Layer possui lifecycle jurídico próprio.

### DR-PRIV-004
Correção/anonimização não deve adulterar o fato histórico; referências podem ser pseudonimizadas quando necessário.

## 20. IA operacional

### DR-AI-001
IA herda permissões do usuário.

### DR-AI-002
Dados externos são untrusted input.

### DR-AI-003
Autorização ocorre server-side e nunca é derivada do texto do prompt/documento.

### DR-AI-004
Operação em massa exige simulação.

### DR-AI-005
Mudança material de snapshot invalida aprovação.

## 21. Circuit breaker

Estados do lote:

`SIMULATED → APPROVED → RUNNING → COMPLETED`

Alternativas:

`TRIPPED`, `PAUSED_REVIEW`, `PARTIALLY_COMPLETED`, `FAILED`.

### DR-BULK-001
Thresholds são configuráveis por tipo de operação.

### DR-BULK-002
Circuit breaker impede início de novos itens.

### DR-BULK-003
Retomada é idempotente.

### DR-BULK-004
Itens concluídos não são repetidos.

## 22. Invariantes

1. Nenhuma transição cross-tenant sem grant válido.
2. Nenhum fato financeiro histórico é apagado.
3. Nenhuma regra de IA entra em produção sem validação.
4. Nenhuma entrega falha conta como tentativa válida.
5. Nenhuma resposta humana válida permite continuidade automática.
6. Nenhum pagamento é duplicado por retry.
7. Nenhum crédito é usado sem autorização.
8. Nenhuma dívida é transferida automaticamente por sucessão.
9. Nenhum veto GSBC é silencioso.
10. Nenhuma operação em massa crítica ocorre fora do snapshot aprovado.

## 23. Pendências para homologação jurídica/técnica

Não impedem o desenho do domínio, mas devem ser fechadas antes da respectiva feature entrar em produção:

- marco jurídico exato de início do prazo da notificação;
- política de exceção quando canal obrigatório não existir;
- classificação final de respostas automáticas;
- política de retenção por classe de dado;
- detalhes contratuais e payloads da instituição de pagamento;
- fornecedor/API de WhatsApp;
- prestador jurídico e jurisdições/templates;
- calendários externos específicos.
