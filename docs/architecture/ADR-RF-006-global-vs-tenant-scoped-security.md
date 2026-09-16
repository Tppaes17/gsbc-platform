# ADR-RF-006 — Global vs Tenant-Scoped Security

## Question

Como separar dados RF globais de interpretacoes privadas/operacionais por tenant?

## Evidence

- RF-CNPJ e fonte publica global.
- Enquadramento, carteira, cobranca, contato privado e decisoes GSBC sao tenant-scoped.
- `docs/MULTITENANCY.md` define tenant como fronteira primaria para dado operacional.

## Alternatives

- Adicionar `tenant_id` em todas as tabelas RF.
- Tornar tudo global.
- Separar RF global de links e derivados tenant-scoped.

## Decision

Dados RF canonical nao recebem `tenant_id`. O vinculo com empresas GSBC vive em `public.rf_company_links`, com `tenant_id`, FK composta para `empresas(tenant_id, id)` e RLS tenant-scoped.

## Trade-offs

- Evita duplicacao artificial de dado publico.
- Exige disciplina para nao colocar classificacoes privadas em tabelas RF globais.

## Status

Accepted in RF-02.
