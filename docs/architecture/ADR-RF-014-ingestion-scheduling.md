# ADR-RF-014 - Ingestion Scheduling

## Question
Como detectar e iniciar novas competencias?

## Evidence
A Receita nao garante dia fixo e pode publicar conjuntos parciais. Idempotencia depende do manifest, nao do horario.

## Alternatives
Cron mensal fixo; verificacao diaria; ativacao manual.

## Decision
Executar discovery leve diario, comparar manifestos T1/T2 apos intervalo configuravel, criar job apenas para manifest inedito, estavel e completo, e exigir gates antes de qualquer publicacao. O intervalo depende de observacao da fonte e aprovacao do proprietario.

## Trade-offs
Mais verificacoes pequenas; reduz atraso e evita processar publicacao parcial.

## Status
PROPOSED — OWNER APPROVAL REQUIRED. Nenhum cron foi criado em RF-03A.1.
