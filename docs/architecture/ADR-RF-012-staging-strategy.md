# ADR-RF-012 - Staging Strategy

## Question
Como isolar dados antes da normalizacao?

## Evidence
RF-02 criou `rf_raw.rf_import_staging_rows`; RF-03A provou carga, deduplicacao, constraint failure e rollback sem linhas residuais.

## Alternatives
Carregar direto no canonical; staging permanente compartilhado; staging descartavel por dataset/job.

## Decision
Usar staging descartavel e identificado por dataset/job, seguido de validation e normalizacao transacional.

## Trade-offs
Consome storage temporario e WAL; permite rejeicoes, reconciliacao e reexecucao segura.

## Status
Accepted for design; physical partitioning pending representative sizing.
