# ADR-RF-001 — Physical Data Placement

## Question

Onde armazenar a fundacao RF-CNPJ sem misturar dado publico global da Receita Federal com dado operacional tenant-scoped do GSBC?

## Evidence

- `docs/RF_00_REPOSITORY_AUDIT.md` identificou ausencia de schemas `rf_raw` e `rf_canonical`.
- `RF_CNPJ_DATA_INTELLIGENCE_MASTER_SPEC.md` exige separacao entre Raw/Canonical Receita Federal e dominio GSBC.
- `supabase/config.toml` expoe apenas `public` e `graphql_public` na API local.

## Alternatives

- Criar tudo em `public` com prefixo `rf_*`.
- Criar schemas separados para raw/canonical.
- Criar banco/projeto separado.

## Decision

Usar schemas separados `rf_raw` e `rf_canonical`, mantendo `public.rf_company_links` apenas para o vinculo tenant-aware com o dominio GSBC.

## Trade-offs

- Melhor isolamento e menor risco de exposicao acidental.
- Requer queries server-side/RPC ou exposicao deliberada futura para consumo direto.

## Status

Accepted in RF-02.
