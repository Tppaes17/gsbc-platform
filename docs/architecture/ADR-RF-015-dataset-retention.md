# ADR-RF-015 - Dataset Retention

## Question
Por quanto tempo manter raw, extracted, canonical e historico?

## Evidence
Raw/canonical podem ser reconstruidos; links, decisoes, auditoria e diffs GSBC nao podem. Custos nacionais ainda nao foram medidos.

## Alternatives
Reter tudo; apagar imediatamente; politica por classe de dado.

## Decision
Propor retencao por classe: canonical ativo + anterior; manifests/auditoria de longo prazo; extracted/staging efemeros; raw conforme janela de reprocessamento e custo; dados GSBC nao reconstruiveis sob politica propria.

## Trade-offs
Reprocessamento fica disponivel sem reter todo artefato indefinidamente; a politica final depende de sizing e compliance.

## Status
Proposed - retention periods pending cost and compliance approval.
