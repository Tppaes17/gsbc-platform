# ADR-RF-013 - Production Database Placement

## Question
O canonical RF deve compartilhar o PostgreSQL transacional do GSBC?

## Evidence
O projeto remoto esta saudavel em `eu-west-1`, mas nao tem PITR nem backup enumerado; plano, CPU, memoria, IOPS, storage disponivel e uso atual nao foram comprovados. O GSBC hospeda fluxos financeiros e multi-tenant no mesmo banco. Carga nacional compartilharia locks, IO, WAL, autovacuum, conexoes e risco de exaustao de disco.

## Alternatives
Banco atual; banco RF dedicado; object storage com canonical no banco atual; object storage e banco RF dedicado.

## Decision
Recomendar object storage dedicado mais PostgreSQL RF dedicado antes da carga nacional. O PostgreSQL GSBC atual nao e recomendado para ingestao nacional.

## Trade-offs
Maior custo e operacao; menor blast radius, backup independente e capacidade dimensionavel.

## Status
PROPOSED — OWNER APPROVAL REQUIRED
