# ADR-RF-015 - Dataset Retention

## Question
Por quanto tempo manter raw, extracted, canonical e historico?

## Evidence
Raw/canonical podem ser reconstruidos; links, decisoes, auditoria e diffs GSBC nao podem. Custos nacionais ainda nao foram medidos.

## Alternatives
Reter tudo; apagar imediatamente; politica por classe de dado.

## Decision
Propor retencao por classe: canonical ativo + anterior; manifests/checksums/auditoria de longo prazo; extracted/staging efemeros; raw conforme janela aprovada de reprocessamento e custo; dados GSBC nao reconstruiveis sob politica de backup propria. Historico para futuro Diff Engine nao pode ser removido antes de uma politica explicita.

## Trade-offs
Reprocessamento fica disponivel sem reter todo artefato indefinidamente; a politica final depende de sizing e compliance.

## Status
PROPOSED — OWNER APPROVAL REQUIRED
