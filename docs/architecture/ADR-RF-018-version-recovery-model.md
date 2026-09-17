# ADR-RF-018 - RF Version Recovery Model

## Question

Como impedir que uma ingestao ou publicacao RF defeituosa substitua o ultimo estado valido?

## Evidence

O modelo RF possui datasets, arquivos, jobs, qualidade e canonical, mas nenhuma carga nacional ou recuperacao de versao foi testada. O dataset oficial e reconstruivel; manifests, proveniencia, links GSBC e decisoes de publicacao exigem preservacao.

## Decision

Manter N ativo enquanto N+1 e baixado, validado e indexado em isolamento. Publicar por troca atomica de ponteiro auditada. Preservar N ate N+1 cumprir janela de estabilidade e rollback. Raw versionado, manifest, metadados de integridade, versao do loader e relatorio de qualidade sustentam rebuild. Staging/extracted sao descartaveis. Search/indexes sao recomputaveis.

Falha antes do publish descarta N+1 sem tocar N. Falha depois do publish reponta atomicamente para N e reconstrói derivados. Cleanup nunca remove uma versao ainda referenciada ou dentro da janela aprovada.

## Trade-offs

Duas versoes e index build simultaneo aumentam storage, WAL, tempo e custo, mas tornam publish interrompivel e rollback deterministico.

## Status

PROPOSED — OWNER APPROVAL REQUIRED

Aceitacao exige implementacao e teste em infraestrutura RF isolada; RF-03B permanece bloqueado.

