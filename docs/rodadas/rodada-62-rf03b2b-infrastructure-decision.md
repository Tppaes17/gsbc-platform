# Rodada 62 — RF-03B.2B Infrastructure Decision

## Diagnóstico e decisão

A RF-03B.2A comprovou ingestão bounded determinística, mas a retenção de três competências e o piso derivado de aproximadamente 238 GB por versão inviabilizam tratar a infraestrutura nacional como extensão do banco transacional GSBC. Foi selecionada a arquitetura com PostgreSQL RF dedicado, object storage privado e worker batch efêmero.

## Entregue

- Inventário oficial das 37 fontes e relações.
- Modelos de capacidade, ciclo de disco, compute, custos e três cenários.
- Pipeline mensal com lease, checkpoints, validation gates, publicação atômica e rollback por metadata.
- Estratégias de índices, busca, observabilidade, least privilege, backup/DR e runbooks operacionais incorporados ao plano.
- Assumptions, risks e decision log.

## Alterações e limites

Somente documentação foi criada. Nenhuma migration, API, UI, RLS, infraestrutura, credencial, ingestão, publicação ou deploy foi alterado. Preços foram verificados em fontes oficiais em 2026-09-18. O relatório solicita autorização somente para provisionar o cenário recomendado; a primeira ingestão nacional continua separadamente bloqueada.

## Pendências e próximo estágio

QSA permanece sem benchmark de densidade; reachability e desempenho de produção são desconhecidos; backup/PITR e IOPS exigem cotação. Próximo estágio proposto: RF-03B.3 — First National Ingestion Infrastructure Validation, apenas após autorização expressa do owner.
