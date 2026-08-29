# GSBC — Multitenancy

**Documento:** `docs/MULTITENANCY.md`  
**Versão:** 1.0

## 1. Regra central

Cada entidade contratante é um tenant independente. Sindicato, federação e confederação não compartilham tenant por mera vinculação institucional.

## 2. Objetos

- `Tenant`: fronteira primária de isolamento.
- `LegalEntity`: entidade jurídica representada no tenant.
- `OrganizationalRelationship`: relação institucional entre entidades/tenants.
- `CrossTenantGrant`: autorização explícita para acesso transversal.
- `UserMembership`: vínculo usuário↔tenant.
- `Permission`: ação permitida.
- `AuthorityDelegation`: poder formal para decisões críticas.

## 3. Isolamento

Toda tabela operacional tenant-scoped deve possuir `tenant_id` ou estar inequivocamente subordinada a objeto tenant-scoped.

Autorização deve ocorrer no servidor/banco, nunca apenas na UI.

## 4. Grants hierárquicos

Federação/confederação somente acessa tenant vinculado quando existir `CrossTenantGrant` válido.

Grant contém:
- tenant concedente;
- tenant beneficiário;
- escopo de entidades/módulos;
- view/execute;
- ações;
- início/fim;
- aprovador;
- motivo;
- revogação;
- audit id.

Grant não pode criar acesso a outro tenant por transitividade implícita.

## 5. Busca e IA

Busca, autocomplete, contagens, exportações, RAG e semantic search devem filtrar universo autorizado antes de retornar/recuperar dados.

## 6. Jobs e integrações

Jobs carregam `tenant_id` explicitamente. Workers não inferem tenant por dado não confiável.

Webhooks financeiros devem resolver tenant por identificadores internos previamente registrados, não por payload textual arbitrário.

## 7. Arquivamento

Tenant arquivado bloqueia memberships externos. Acesso excepcional GSBC exige permissão privilegiada, motivo e auditoria.

## 8. Evals mínimos

- tentativa de IDOR entre tenants;
- busca/autocomplete sem leakage;
- RAG cross-tenant;
- grants expirados;
- grants revogados;
- grants sem transitividade;
- worker com tenant incorreto;
- export cross-tenant;
- acesso a tenant arquivado.
