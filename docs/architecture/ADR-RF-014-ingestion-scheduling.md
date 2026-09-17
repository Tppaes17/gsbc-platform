# ADR-RF-014 - Ingestion Scheduling

## Question
Como detectar e iniciar novas competencias?

## Evidence
A Receita nao garante dia fixo e pode publicar conjuntos parciais. Idempotencia depende do manifest, nao do horario.

## Alternatives
Cron mensal fixo; verificacao diaria; ativacao manual.

## Decision
Executar discovery leve diario, criar job apenas para manifest inedito e completo, e exigir gates antes de qualquer publicacao.

## Trade-offs
Mais verificacoes pequenas; reduz atraso e evita processar publicacao parcial.

## Status
Proposed. Nenhum cron foi criado em RF-03A.
