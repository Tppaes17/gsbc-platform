# Rodada 59 - RF-03B.1 Bounded Real Ingestion

## Diagnostico E Decisao

O owner autorizou um unico ZIP oficial em ambiente local. `Empresas1.zip` foi escolhido por representar parsing/carga empresarial sem QSA, com 77,9 MB: mais significativo que referencias e menos arriscado que Empresas0/Estabelecimentos.

## Construido E Executado

- Allowlist/redirect/Content-Length no downloader e inspecao ZIP contra symlink, expansao e corrupcao.
- Runner manual bounded, sem CI/deploy/cron.
- Parse integral de 4.494.860 linhas; carga deterministica de 100.000.
- Normalizacao/idempotencia/publish-rollback/failure injection em transacao local.
- Benchmark de CNPJ root e prefixo de razao social.
- Nove artefatos obrigatorios RF-03B.1.

## Resultado

Download 201,866 s; extract 2,020 s; parse 17,746 s; PostgreSQL 40,665 s. Zero rejeicoes. DB cresceu 194,3 MB durante a transacao, indices 35,1 MB e WAL 323,8 MB. Lookup por CNPJ root usou indice; prefixo filtrou 100.000 linhas. Cleanup e residuo zero passaram.

Uma primeira tentativa falhou corretamente por violar `published_at` na simulacao de versao anterior; o fixture foi corrigido e o run repetido. Nenhuma migration, producao, billing, scheduler, commit ou push foi executado.

Gate RF-03B.1: CONDITIONAL. RF-03B.2: CONDITIONAL e aguarda owner; ingestao nacional permanece bloqueada.
