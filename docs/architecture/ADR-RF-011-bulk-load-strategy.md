# ADR-RF-011 - Bulk Load Strategy

## Question
Como carregar volume RF no PostgreSQL?

## Evidence
No POC local, COPY carregou 50.000 linhas em 343.031 ms (145.759 linhas/s), mais rapido que INSERT SELECT equivalente. Normalizacao e indices dominaram o tempo.

## Alternatives
ORM linha a linha; INSERT batches; COPY nativo.

## Decision
Usar COPY para staging e SQL set-wise para canonical. Proibir ORM linha a linha.

## Trade-offs
Exige worker com protocolo PostgreSQL e tratamento cuidadoso de arquivos; maximiza throughput e reduz round-trips.

## Status
Accepted for further POC; national performance remains unproven.
