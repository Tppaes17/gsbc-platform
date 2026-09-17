# ADR-RF-013 - Production Database Placement

## Question
O canonical RF deve compartilhar o PostgreSQL transacional do GSBC?

## Evidence
O projeto remoto nao tem PITR nem backup fisico listado, e CPU, memoria, IOPS e storage disponivel nao foram comprovados. O GSBC hospeda fluxos financeiros e multi-tenant no mesmo banco.

## Alternatives
Banco atual; banco RF dedicado; object storage com canonical no banco atual; object storage e banco RF dedicado.

## Decision
Recomendar object storage mais PostgreSQL RF dedicado antes da carga nacional.

## Trade-offs
Maior custo e operacao; menor blast radius, backup independente e capacidade dimensionavel.

## Status
Proposed - requires human architecture and budget approval.
