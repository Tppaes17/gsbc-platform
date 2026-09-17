# ADR-RF-013 - Production Database Placement

## Question
O canonical RF deve compartilhar o PostgreSQL transacional do GSBC?

## Evidence
O projeto remoto esta em `eu-west-1`, sem PITR ou backup fisico enumerado. O input oficial medido possui 7.758.926.262 bytes comprimidos, antes de extracao, staging, canonical, indices, WAL e duas versoes simultaneas. Plano, CPU, memoria, IOPS, storage disponivel e uso atual nao foram comprovados. O GSBC hospeda fluxos financeiros e multi-tenant no mesmo banco. Carga nacional compartilharia locks, IO, WAL, autovacuum, conexoes, restore e risco de exaustao de disco.

## Alternatives
Banco atual; banco RF dedicado; object storage com canonical no banco atual; object storage e banco RF dedicado.

## Decision
Recomendar object storage dedicado mais PostgreSQL RF dedicado antes da carga nacional. O PostgreSQL GSBC atual nao e recomendado para ingestao nacional.

## Trade-offs
Maior custo e operacao; menor blast radius, backup independente e capacidade dimensionavel.

## Status
PROPOSED — OWNER APPROVAL REQUIRED

RF-03A.2B confirmou Option D como recomendacao tecnica e rejeitou A para ingestao nacional. Provider, regiao, budget e provisionamento continuam decisoes do owner; nenhuma infraestrutura foi criada.
