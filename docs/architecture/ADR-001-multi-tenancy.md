# ADR-001 — Estratégia de Multi-Tenancy

## Status
Aceito — Rodada 1.

## Contexto
A GSBC opera como plataforma SaaS para múltiplos sindicatos. Cada sindicato é um
cliente isolado: dados de um sindicato jamais podem vazar para outro (regra 14
do prompt-mestre). Ao mesmo tempo, a própria equipe GSBC precisa de visibilidade
cross-tenant, pois opera a carteira inteira de sindicatos (regra 97).

O documento de referência lista `tenants`, `organizations` e `sindicatos` como
entidades separadas (seção 18), sem definir precisamente a relação entre elas.

## Decisão
1. **`tenants` é a fronteira técnica de isolamento**, banco compartilhado
   (shared database, shared schema) com Row Level Security (RLS) do PostgreSQL
   aplicando o isolamento — não schemas separados por tenant, não bancos
   separados. Justificativa: simplicidade operacional, custo, velocidade de
   entrega (regra 10 — não antecipar complexidade), e o RLS do Postgres via
   Supabase é suficiente para a escala inicial.
2. **`tenants.type` distingue dois papéis**: `platform` (a própria GSBC,
   singleton — reforçado por índice único parcial) e `sindicato` (um por
   cliente). A equipe GSBC é modelada como *membership* no tenant `platform`,
   reutilizando o mesmo modelo de autorização (User → Membership → Tenant →
   Role) em vez de um sistema de permissão paralelo para staff interno.
3. **`organizations` (do documento de referência) é tratada como sinônimo de
   `tenants`** neste estágio — não foi criada uma tabela `organizations`
   separada. Não havia definição clara do que a distinguiria de `tenants`
   dentro do escopo P0, e criar uma tabela sem propósito definido violaria a
   regra 18 ("não criar tabelas sem definir claramente propósito, owner,
   relacionamento, lifecycle"). **PENDING BUSINESS RULE**: se surgir a
   necessidade de `organizations` representar algo distinto (ex.: divisões
   internas da própria GSBC, federações de sindicatos), reavaliar nesta ADR.
4. **`sindicatos` é o perfil de negócio 1:1 com um tenant do tipo `sindicato`**
   (CNPJ, razão social, categoria, base territorial) — dados cadastrais
   separados da fronteira técnica de isolamento, conforme o diagrama da seção
   13 (`tenant → sindicato → dados`).

## Consequências
- Toda tabela sensível carrega `tenant_id` (direto ou via relacionamento) e
  tem RLS habilitado — nunca dependemos de filtro de frontend (regra 14).
- Adicionar um novo sindicato = inserir 1 linha em `tenants` + 1 em
  `sindicatos`, sem migração de schema (regra 98).
- Uma eventual migração para isolamento físico mais forte (schema-per-tenant
  ou banco-per-tenant) permanece possível no futuro sem quebrar a modelagem de
  domínio, caso a escala exija — mas não é antecipada agora (regra 10).

## Alternativas consideradas
- **Schema por tenant**: descartado por complexidade operacional
  desproporcional ao estágio atual (migrations replicadas por schema,
  connection pooling mais complexo).
- **Banco por tenant**: descartado pelo mesmo motivo, além de custo de
  infraestrutura.
