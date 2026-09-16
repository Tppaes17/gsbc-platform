# ADR-RF-007 — Partitioning

## Question

Implementar particionamento fisico ja na RF-02?

## Evidence

- O dataset CNPJ e grande, mas RF-02 ainda nao mediu volume real local, throughput, cardinalidade por entidade ou planos de query.
- O artefato RF-02 pede avaliar particionamento, mas nao antecipar sem sizing.

## Alternatives

- Particionar agora por `dataset_version_id`.
- Particionar por UF/tipo de entidade.
- Adiar com POC de volume.

## Decision

Nao implementar particionamento em RF-02. Criar chaves, FKs e indices estruturais que permitam POC em RF-03/RF-05 sem decisao prematura.

## Trade-offs

- Menos complexidade agora.
- Pode exigir migration futura apos benchmark.

## Status

Deferred. POC obrigatorio antes de ingestao real em escala.
