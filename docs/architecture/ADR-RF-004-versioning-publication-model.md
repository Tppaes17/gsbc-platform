# ADR-RF-004 — Versioning And Publication Model

## Question

Como representar versoes mensais, publicacao, rollback e historico sem reingestao?

## Evidence

- RF-02 exige no maximo uma versao publicada/ativa.
- O Master Spec proibe `TRUNCATE + IMPORT` como estrategia de producao.
- Rollback deve ser logico, apontando para uma versao anterior.

## Alternatives

- Atualizar tabelas canonical in-place.
- Manter apenas uma tabela ativa e backups externos.
- Versionar todas as entidades por `dataset_version_id`.

## Decision

Todas as entidades canonical relevantes possuem `dataset_version_id`. `rf_dataset_versions` controla status, publicacao, `is_current`, supersedencia e retirada. O banco garante no maximo uma versao corrente e uma publicada por fonte.

## Trade-offs

- Consultas precisam filtrar versao atual.
- Rollback e comparacao ficam representaveis sem reingestao.

## Status

Accepted in RF-02.
