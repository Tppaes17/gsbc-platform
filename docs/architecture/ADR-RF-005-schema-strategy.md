# ADR-RF-005 — Schema Strategy

## Question

Usar schemas separados ou apenas tabelas prefixadas em `public`?

## Evidence

- Raw deve ser privado/operacional.
- Canonical deve ser global, versionado e read-only para usuarios.
- `public` ja contem o dominio GSBC tenant-scoped.

## Alternatives

- `public.rf_*`.
- `rf_raw` + `rf_canonical`.
- Banco separado.

## Decision

Usar `rf_raw` para staging/raw operacional e `rf_canonical` para canonical/global. Usar `public` somente para `rf_company_links`, pois esse vinculo pertence ao dominio GSBC e precisa de RLS tenant-scoped.

## Trade-offs

- Mais clareza e least privilege.
- Exige configuracao deliberada se algum schema RF for exposto no PostgREST no futuro.

## Status

Accepted in RF-02.
