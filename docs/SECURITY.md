# GSBC — Security Baseline

**Documento:** `docs/SECURITY.md`  
**Versão:** 1.0

## 1. Objetivo

Definir baseline de segurança para um SaaS multi-tenant com dados financeiros, jurídicos, empresariais e pessoais.

## 2. Princípios

- fail closed;
- least privilege;
- defense in depth;
- server-side authorization;
- immutable audit;
- encryption in transit/at rest;
- no secrets in client;
- idempotency for external effects;
- untrusted external content;
- privileged actions require stronger controls.

## 3. Autenticação

MFA obrigatório para perfis críticos definidos em PRODUCT.md.

Recomendação de engenharia: tornar MFA obrigatório para todos os usuários internos GSBC antes de produção, salvo decisão formal em contrário.

Step-up MFA para:
- Go-Live;
- delegação crítica;
- crédito;
- retroatividade;
- exceções financeiras;
- legal escalation;
- bulk high-impact;
- alteração de policies de segurança.

## 4. Autorização

RBAC como base + atributos de tenant, entidade, portfolio, grant, authority e object ownership quando necessário.

Nenhuma autorização crítica deve existir apenas no frontend.

## 5. Tenant isolation

Aplicar controles no banco/API e testes automatizados de isolamento. Onde houver PostgreSQL, RLS deve ser considerada/empregada para tabelas tenant-scoped conforme arquitetura existente.

## 6. Dados

Classificação mínima:
- público;
- interno;
- confidencial;
- financeiro;
- jurídico;
- dado pessoal;
- dado pessoal sensível, quando aplicável.

## 7. Audit

Audit ledger append-only. Admin não apaga eventos.

Eventos críticos devem conter ator, tenant, objeto, ação, antes/depois quando aplicável, timestamp, request/correlation id, policy/version e resultado.

## 8. Privacidade

Separar identificadores pessoais do ledger quando necessário. Implementar workflows de correção, bloqueio, anonimização e eliminação juridicamente aplicáveis sem adulterar eventos históricos.

## 9. Integrações

- secrets server-side;
- webhook signatures quando suportadas;
- replay protection;
- idempotency;
- retry/backoff;
- reconciliation;
- timeout/circuit breaker;
- logs sem secrets;
- allowlist de operações.

## 10. Financeiro

Provider event id único. Nenhum retry duplica baixa, split ou crédito.

Subledger GSBC reconciliado com instituição de pagamento.

## 11. IA

Conteúdo de documentos, e-mails, WhatsApp e web é untrusted.

IA não pode:
- elevar privilégios;
- alterar policy;
- selecionar tenant fora do escopo;
- executar tool sem autorização determinística;
- tratar texto externo como instrução de sistema.

Bulk actions exigem simulation snapshot.

## 12. Documentos

Armazenamento privado; URLs temporárias; controle por tenant; hash; versionamento; malware scanning quando tecnicamente disponível; logs de acesso.

## 13. Busca

Autorização antes da recuperação. Índice deve ser particionado/filtrado por tenant e grants. Revogação de acesso deve refletir na busca.

## 14. Acesso privilegiado

Acesso GSBC a tenant arquivado ou excepcional exige:
- perfil autorizado;
- motivo;
- duração;
- audit;
- preferencialmente step-up MFA.

## 15. Logs

Nunca registrar:
- passwords;
- tokens completos;
- secrets;
- conteúdo pessoal desnecessário;
- dados financeiros completos quando não necessários.

## 16. Evals P0

- cross-tenant API;
- cross-tenant search;
- cross-tenant AI/RAG;
- expired delegation;
- webhook replay;
- duplicate payment;
- prompt injection;
- maker-checker self approval;
- archived tenant unauthorized access;
- audit tampering.
