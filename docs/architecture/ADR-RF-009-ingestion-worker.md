# ADR-RF-009 - Ingestion Worker

## Question
Onde executar discovery, download, extract, parse e load RF?

## Evidence
O fluxo pode durar horas, requer scratch disk, retry e isolamento. O volume oficial e a janela nacional permanecem desconhecidos. Vercel Functions e Supabase Edge Functions possuem limites request-bound; GitHub-hosted runners sao efemeros e possuem disco/tempo limitados. Um job containerizado permite recursos, timeout, retry, heartbeat, cancelamento e checkpoint explicitos.

## Alternatives
Vercel Function; CI runner; dedicated batch worker/job.

## Decision
Usar Vercel somente para discovery trigger, orquestracao e status. Executar processamento em managed container batch job dedicado, recuperavel e escalavel a zero. O fornecedor depende de orcamento, regiao e credenciais do proprietario.

## Trade-offs
Mais infraestrutura e custo; melhor isolamento, checkpoint, observabilidade e controle de recursos.

## Status
PROPOSED — OWNER APPROVAL REQUIRED
