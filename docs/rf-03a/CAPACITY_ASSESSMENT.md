# RF-03A Capacity Assessment

Data: 2026-09-17.

## Measured POC

| Measure | Result |
|---|---:|
| Compressed sample | 22,078 bytes |
| Extracted sample | 88,215 bytes |
| Compression ratio | 4.00x |
| Source/parsed rows | 1,359 / 1,359 |
| Parse throughput | 97,168 rows/s |
| COPY volume | 50,000 staging rows |
| COPY elapsed | 343.031 ms |
| COPY throughput | 145,759 rows/s |
| INSERT SELECT elapsed | 432.305 ms |
| Normalization elapsed | 5,851.957 ms |
| Canonical unique rows | 1,359 |
| RF relation peak during transaction | 82,821,120 bytes |
| RF relation allocation after rollback | 44,097,536 bytes |
| RF relations after local VACUUM FULL | 925,696 bytes |

COPY foi cerca de 21% mais rapido que o `INSERT SELECT` equivalente no teste local. O custo dominante foi normalizacao/indices/constraints, nao a transferencia CSV.

## Limits Of Evidence

- A amostra contem apenas CNAE e veio de espelho nao autoritativo.
- Os 50 mil registros de staging repetem deterministicamente os 1.359 CNAEs para medir o mecanismo; nao representam cardinalidade ou distribuicao nacional.
- Nao houve arquivo real de empresas, estabelecimentos, QSA ou Simples/MEI.
- CPU, memoria, IOPS e WAL do Supabase remoto nao foram mensurados.
- O comando remoto de estatisticas nao concluiu no prazo operacional e foi interrompido sem mutacao.
- Nao existe manifest oficial validado para calcular volume nacional.

Por isso, o benchmark nao e prova de capacidade nacional, em linha com a proibicao do Master Spec de aceitar 10 mil registros simulados como load test representativo.

## Sizing

```text
Compressed national dataset: UNKNOWN - REQUIRES OFFICIAL MANIFEST
Extracted national dataset: UNKNOWN - REQUIRES OFFICIAL MANIFEST
Canonical database: UNKNOWN - REQUIRES MULTI-ENTITY POC
Index overhead: UNKNOWN - REQUIRES REPRESENTATIVE LOAD
Temporary staging: UNKNOWN - REQUIRES LARGEST-FILE MEASUREMENT
Monthly growth: UNKNOWN - REQUIRES TWO OFFICIAL VERSIONS
```

Formula que devera ser aplicada quando o manifest oficial existir:

```text
working_storage = raw_zip + extracted + staging + canonical + indexes + WAL headroom
ingestion_window = download + extract + parse + COPY + normalize + validate + index + analyze
```

Nenhuma extrapolacao linear da amostra CNAE deve ser tratada como compromisso operacional. O tempo nacional projetado permanece **UNKNOWN - REQUIRES MEASUREMENT**.

## Current PostgreSQL

Local observado:

- PostgreSQL 17.6;
- database size inicial aproximado: 17 MB;
- `max_connections=100`;
- autovacuum ativo;
- WAL level `logical`;
- schemas RF vazios antes e depois do POC.

Remoto observado:

- migrations `0001-0046` alinhadas;
- API saudavel;
- PITR desabilitado;
- nenhuma copia fisica listada;
- tier, storage disponivel, CPU, memoria e IOPS nao comprovados.

Conclusao: **NOT RECOMMENDED** para carga nacional no PostgreSQL atual. Ele suporta o POC isolado, mas nao ha evidencia de capacidade nem recuperacao suficiente para compartilhar o blast radius com cobranca, pagamentos, webhooks, autenticacao e dados tenant-scoped.

## Recovery

- Raw/canonical RF sao reconstruiveis desde que o manifest e os objetos originais estejam preservados.
- Links, classificacoes, decisoes, auditoria e diffs GSBC nao sao reconstruiveis somente a partir da Receita.
- `pitr_enabled=false` e `backups=[]` foram confirmados no projeto vinculado.
- O backup logico existente cobre tabelas `public`; nao comprova restore dos schemas RF.

Backup/PITR: **FAIL para producao RF**.
