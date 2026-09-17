# ADR-RF-009 - Ingestion Worker

## Question
Onde executar discovery, download, extract, parse e load RF?

## Evidence
O fluxo pode durar horas, requer scratch disk, retry e isolamento. Vercel ja existe, mas request/cron nao e ambiente adequado para processamento pesado.

## Alternatives
Vercel Function; CI runner; dedicated batch worker/job.

## Decision
Usar Vercel somente para orquestracao. Executar processamento em worker batch dedicado e recuperavel.

## Trade-offs
Mais infraestrutura e custo; melhor isolamento, checkpoint, observabilidade e controle de recursos.

## Status
Proposed - pending human approval and representative benchmark.
