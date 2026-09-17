# RF-03A Ingestion Architecture & Controlled POC Report

Data: 2026-09-17

## 1. Executive Summary

RF-03A implementou e executou um POC local, isolado e descartavel para manifest deterministico, download resiliente, checksum local, extracao segura, parser streaming, quality gate, staging, COPY, normalizacao, idempotencia, failure injection e cleanup.

O baseline RF-02B foi confirmado em producao: `main` e `origin/main` em `fb2ec87`, migrations local/remoto `0001-0046`, API saudavel, `anon` bloqueado em `rf_company_links` e helpers, e `service_role` funcional. Nenhuma migration, escrita remota, ingestao nacional, publicacao, cron ou deploy foi executado.

O mecanismo do POC passou, mas a origem oficial da Receita nao ficou diretamente consumivel a partir do ambiente de execucao. A amostra medida foi um `Cnaes.zip` de espelho nao autoritativo. Nao houve amostra oficial real de empresas, estabelecimentos, QSA e Simples/MEI. O projeto remoto tambem permanece sem PITR e sem backup fisico listado.

Conclusao: **RF-03A PARTIAL; Gate NO-GO**. O POC substituiu varias suposicoes por medidas, mas nao autoriza RF-03B nem arquitetura produtiva enquanto fonte oficial, POC multi-entidade, capacidade e recuperacao nao forem comprovados.

## 2. Entry Baseline

```text
RF-00 COMPLETE
RF-01 COMPLETE
RF-01A COMPLETE
RF-02 COMPLETE
RF-02A COMPLETE
RF-02B COMPLETE
RF02A-SEC-001 CLOSED IN PRODUCTION
Migration baseline 0046
Production health GREEN
Migration parity CONFIRMED
```

Evidencias:

- branch `main`, working tree limpo no preflight;
- HEAD/local/origin `fb2ec87d0df42bb0a8606d6d16215532aa68d2f2`;
- `npx supabase migration list --linked`: `0001-0046` em ambos;
- REST root remoto: HTTP 200;
- anon select em `public.rf_company_links`: HTTP 401 / permission denied;
- anon execute em `rf02_get_current_dataset_count`: HTTP 401 / permission denied;
- service role no mesmo helper: HTTP 200, resultado `0`;
- Supabase local operacional em PostgreSQL 17.6.

O Master Spec foi lido integralmente do anexo fornecido. Ele ainda nao existe no caminho canonico `docs/RF_CNPJ_DATA_INTELLIGENCE_MASTER_SPEC.md`.

## 3. Guardrails

```text
max files: 1
max compressed bytes: 2,097,152
max extracted bytes: 10,485,760
max rows: 50,000
max runtime: 300,000 ms
max DB rows: 50,000
```

Todos os limites foram aplicados em codigo e nenhum foi excedido.

## 4. Source Validation And Discovery

Receita Source: **NOT VERIFIED**.

O compartilhamento oficial respondeu com reset/timeout para HEAD, OPTIONS, PROPFIND e navegador. Listing, competencia atual, quantidade, tamanho agregado, checksums e completude nao puderam ser observados diretamente. Os portais oficiais e o PDF de layout foram consultaveis e sustentam o contrato semicolon/entidades, mas nao substituem discovery do dataset.

Detalhes: `docs/rf-03a/SOURCE_DISCOVERY.md`.

## 5. Manifest And Integrity

Manifest deterministico implementado em `scripts/rf-poc/manifest.mjs`:

- arquivos ordenados;
- campos ordenados;
- `discovered_at`, `downloaded_at` e `generated_at` excluidos do hash;
- hash estavel comprovado em unit e na execucao dupla;
- sem quantidade ou filename nacional hardcoded no discovery contract.

Manifest hash do POC: `829e671b2ee735b75f0ab070b3a9e74da9c4a02d48480121f2411a360a2e64a8`.

Checksum local SHA-256: **PASS**. Checksum remoto oficial: **UNAVAILABLE**. Isso e `remote integrity unavailable`, nao `verification failed`.

## 6. Storage

Contrato validado:

```text
rfb-cnpj/2026-04-12/raw/Cnaes.zip
rfb-cnpj/2026-04-12/extracted/Cnaes.csv
rfb-cnpj/2026-04-12/manifest/manifest.json
rfb-cnpj/2026-04-12/logs/poc.json
```

Filesystem foi usado somente em `/tmp` e removido no final. Nenhum ZIP foi salvo no PostgreSQL ou em bucket remoto.

Recommended Storage: **private dedicated S3-compatible object storage**. Supabase Storage exige POC adicional de maior arquivo, multipart/resume, lifecycle, custo e restore.

## 7. Worker

Recommended Worker: **dedicated batch worker/job**.

Vercel deve permanecer como scheduler/orchestrator. Funcao request-bound nao deve executar download/extract/COPY/indexacao nacional. CI runner serve apenas para POC manual. O worker dedicado deve ter checkpoint, retry, cancelamento, scratch disk, limites de recurso, logs e identidade service role isolada.

## 8. POC Dataset

Fonte de POC, nao autoritativa: espelho Casa dos Dados, competencia de diretorio `2026-04-12`, arquivo `Cnaes.zip`.

```text
Compressed: 22,078 bytes
Extracted: 88,215 bytes
Entry: F.K03200$Z.D60411.CNAECSV
Rows: 1,359
Encoding parser: windows-1252
Delimiter: ;
```

Nenhum dado do POC permaneceu no banco. Nenhum dado foi publicado.

## 9. Download, Extract And Parser

Downloader:

- streaming;
- timeout;
- retry exponencial limitado;
- suporte a `.part` e Range quando aceito;
- limite de bytes antes e durante stream;
- marker atomico de conclusao;
- revalidacao do marker por tamanho/hash;
- checksum mismatch falha fechado.

Extracao:

- lista ZIP validada antes de extrair;
- paths absolutos e `..` rejeitados;
- limite de bytes extraidos;
- arquivo parcial removido em falha.

Parser:

- streaming/chunked;
- semicolon e quoting;
- Windows-1252 configuravel;
- rejeicoes categorizadas;
- CNPJ preservado como string uppercase;
- nenhum `replace(/\D/g, "")`;
- fixtures provaram CNPJ numerico `00000000...` e alfanumerico `00ABC000E08G12`;
- QSA mascarado preservado sem reconstrucao de CPF.

## 10. Staging, Load And Normalization

Fluxo executado:

`sample -> temp landing -> rf_raw staging -> constraints -> rf_canonical.rf_cnaes -> validation -> rollback`.

Resultados:

```text
COPY rows: 50,000
COPY: 343.031 ms / 145,759 rows/s
INSERT SELECT comparison: 432.305 ms
Normalize: 5,851.957 ms
Canonical unique CNAEs: 1,359
```

COPY foi cerca de 21% mais rapido no teste. Normalizacao/indices/constraints dominaram o custo. Nenhum ORM row-by-row foi usado.

## 11. Quality Reconciliation

```text
Source rows: 1,359
Parsed rows: 1,359
Loaded canonical unique rows: 1,359
Rejected rows: 0
Duplicate source keys: 0
Missing references: not applicable to CNAE-only sample
Invalid CNPJ: exercised by fixtures, not present in CNAE sample
Orphan relationships: not applicable to CNAE-only sample
Checksum: PASS_LOCAL_ONLY
Row reconciliation: PASS
```

O quality gate tambem falha para duplicate key, linha invalida e dataset incompleto em testes controlados.

## 12. Idempotency And Failure Injection

Idempotencia:

- segundo download reutilizou marker validado;
- `manifest_hash` permaneceu identico com timestamp diferente;
- segunda carga manteve staging em 50.000 e canonical em 1.359;
- `ON CONFLICT` nao duplicou registros.

Failure injection:

| Scenario | Result |
|---|---|
| Network interruption + retry | PASS |
| Invalid checksum | PASS, fail closed |
| Invalid/rejected row | PASS |
| Duplicate key | PASS |
| Incomplete dataset | PASS, blocked |
| Canonical constraint violation | PASS, fail closed |
| Interrupted DB load | PASS, transaction removed all rows |
| Archive path traversal | PASS, blocked |

## 13. Cleanup

Rollback deixou zero datasets, zero staging rows e zero CNAEs do POC. O filesystem temporario foi removido.

PostgreSQL manteve 44,097,536 bytes alocados apos rollback; `VACUUM FULL` foi executado somente nas duas tabelas RF locais e vazias, reduzindo as relacoes RF para 925,696 bytes. Isso prova que rollback logico nao recupera imediatamente espaco fisico e que cleanup/maintenance deve fazer parte do desenho do staging.

## 14. Sizing And Performance

Observed Source Volume: **22,078 bytes compressed / 88,215 bytes extracted for the controlled CNAE sample**.

Projected Working Volume: **UNKNOWN - REQUIRES OFFICIAL MANIFEST AND MULTI-ENTITY POC**.

POC Throughput: **97,168 parsed rows/s; 145,759 COPY rows/s; 8,544 normalized staging rows/s**.

Projected National Ingestion Window: **UNKNOWN - REQUIRES MEASUREMENT**. A amostra pequena, cacheada e de baixa cardinalidade nao sustenta extrapolacao linear de download, WAL, indexes ou normalizacao nacional.

Detalhes: `docs/rf-03a/CAPACITY_ASSESSMENT.md`.

## 15. PostgreSQL Capacity And Decision Matrix

Current PostgreSQL: **NOT RECOMMENDED** para carga nacional.

O banco atual suporta o POC, mas storage/tier/CPU/memoria/IOPS remotos nao foram comprovados, nao ha PITR e o blast radius inclui cobranca, pagamentos, webhooks, auth e tenants. A opcao recomendada e object storage privado mais PostgreSQL RF dedicado.

Detalhes e matriz A-D: `docs/rf-03a/ARCHITECTURE_DECISION.md`.

## 16. Backup And PITR

Comando remoto:

`npx supabase backups list --project-ref zjtuvsgigymgludplghd`

Resultado:

```json
{"walg_enabled":true,"pitr_enabled":false,"backups":[]}
```

O backup logico GSBC existente enumera apenas tabelas `public`; nao comprova backup/restore de `rf_raw` e `rf_canonical`. RPO e RTO RF permanecem desconhecidos. Backup/PITR: **FAIL**.

## 17. Security And LGPD

- nenhum secret foi gravado ou impresso;
- nenhum endpoint publico foi criado;
- nenhum schema RF foi exposto adicionalmente no PostgREST;
- `anon` continua sem tabela/helper RF;
- service role foi usada somente para verificacao remota controlada;
- POC de banco usou Postgres local e rollback;
- raw nao foi publicado;
- CPF mascarado nao foi reconstruido;
- nenhum enriquecimento de QSA, rede social ou contato pessoal foi executado;
- RLS e grants RF-02B passaram novamente.

## 18. Observability

`docs/rf-03a/POC_METRICS.json` registra dataset version, fonte, tamanho, hash, ETag, arquivo, rows, rejeicoes, timings, throughput, idempotencia e cleanup.

Gap: nao ha dashboard/alerta produtivo, job ledger ativo nem tracing de worker porque o pipeline produtivo nao foi autorizado.

## 19. Cost

Nao foi estimado valor monetario: provider, regiao, volume oficial, tier de compute/DB, retencao e egress nao estao aprovados. Drivers obrigatorios para cotacao:

- raw/extracted/object versions;
- worker CPU/memory/disk/runtime;
- dedicated PostgreSQL storage/IOPS/connections;
- WAL, backups, PITR e restore tests;
- egress entre worker, object storage e DB;
- observabilidade e retencao de logs.

## 20. Regression And Commands

| Command/test | Result |
|---|---|
| `npm run test:rf-poc` | PASS, 8 tests |
| controlled POC runner | PASS with source limitation |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS, 1 preexisting warning |
| `supabase/tests/rf02b_privilege_hardening.sql` | PASS / ROLLBACK |
| production anon/service role probes | PASS |
| `pre-demo-release-smoke` + RF-01 Chromium | PASS, 5 tests |
| migration parity local/remote | PASS, `0001-0046` |
| local schema diff (`public,rf_raw,rf_canonical`) | PASS, no changes |

Preexisting lint warning: `src/components/design-system/data-table.tsx:72`, TanStack `useReactTable` incompatible-library advisory.

## 21. Findings Register

### P0

**RF03A-P0-001 - Official source not directly consumable/verified.**

Evidence: resets/timeouts on official share, DAV and browser; no authoritative listing, manifest, checksums or completeness proof. Impact: downloader/discovery cannot be approved for production and partial publication cannot be detected. Owner: Data Platform. Closure: successful direct discovery against official source in target worker network, with captured listing and completeness rules.

### P1

**RF03A-P1-001 - No production PITR or physical backup.**

Evidence: `pitr_enabled=false`, `backups=[]`. Closure: approved backup/PITR and tested restore with RPO/RTO.

**RF03A-P1-002 - No representative multi-entity official POC.**

Evidence: only mirrored CNAE sample; company/establishment/QSA/Simples parsers proved by fixtures only. Closure: bounded official files/subsets with referential reconciliation.

**RF03A-P1-003 - Production DB capacity unknown and shared blast radius.**

Evidence: remote tier/storage/CPU/memory/IOPS/WAL unavailable; remote inspect timed out. Closure: dedicated environment sizing and representative load/restore benchmark.

**RF03A-P1-004 - Worker and object storage not provisioned/approved.**

Evidence: no queue/worker, RF bucket, lifecycle, retention or worker identity. Closure: approve ADR-RF-009/010/013 and validate infrastructure in staging.

### P2

**RF03A-P2-001 - No official remote checksum observed.** Local SHA-256 detects local corruption but not source substitution.

**RF03A-P2-002 - Rollback does not reclaim relation allocation.** POC required local VACUUM FULL after rollback; staging lifecycle needs maintenance strategy.

**RF03A-P2-003 - Database types do not include RF schemas.** Acceptable before app/API consumption; must be regenerated before typed consumers.

### P3

**RF03A-P3-001 - Master Spec remains outside canonical docs path.** It was read from the supplied attachment; no content was changed or reconstructed.

## 22. Git And Release State

- `package.json` modificado somente para expor `test:rf-poc`;
- novos modulos restritos a `scripts/rf-poc/`;
- novas evidencias, ADRs, relatorio e registro de rodada em `docs/`;
- nenhuma migration criada ou modificada;
- nenhum arquivo de aplicacao/API/UI alterado;
- nenhum commit, push, deploy ou migration remota executado por RF-03A;
- working tree intencionalmente permanece com as alteracoes RF-03A para revisao humana.

## 23. Risk Register

| Risk | Probability | Impact | Severity | Mitigation |
|---|---|---|---|---|
| Official source unavailable/changes protocol | High | Critical | P0 | Validate from target worker; resilient discovery; no hardcoded files |
| Partial monthly publication ingested | Medium | Critical | P0-derived | Completeness manifest and stable-publication window |
| Shared DB degrades financial workloads | High | Critical | P1 | Dedicated RF DB and bounded worker |
| No recoverable production state | High | Critical | P1 | PITR/backups and restore exercise |
| Source corruption without official checksum | Medium | High | P2 | Local hash, ETag/size, redundant discovery, source policy |
| Staging/WAL consumes disk | Medium | High | P2 | quotas, preflight free-space, cleanup, vacuum policy |
| CNPJ letters mutilated | Low after controls | Critical | P1 controlled | string-only parser, fixtures, DB constraints |
| QSA personal data misused | Low | High | P2 | preserve masking; no reconstruction/enrichment |

## 24. ADRs

Created:

- `ADR-RF-009 Ingestion Worker` - Proposed;
- `ADR-RF-010 RF Object Storage` - Proposed;
- `ADR-RF-011 Bulk Load Strategy` - Accepted for further POC;
- `ADR-RF-012 Staging Strategy` - Accepted for design;
- `ADR-RF-013 Production Database Placement` - Proposed;
- `ADR-RF-014 Ingestion Scheduling` - Proposed, no cron created;
- `ADR-RF-015 Dataset Retention` - Proposed.

## 25. Recommended Production Architecture

Dedicated batch worker + private S3-compatible object storage + dedicated RF staging/canonical PostgreSQL. Vercel orchestrates only. Publication remains separate, logical, gated and reversible. GSBC tenant-scoped links/decisions stay outside global RF canonical.

## 26. RF-03B Preconditions

1. Close RF03A-P0-001 with direct official discovery in target worker network.
2. Capture authoritative full manifest and prove partial-publication detection.
3. Run official bounded multi-entity POC for company, establishment, CNAE, QSA and Simples/MEI.
4. Prove cross-entity references and numeric/alphanumeric CNPJ from official or controlled approved fixtures.
5. Approve worker, object storage and database placement ADRs.
6. Provision isolated staging resources with least-privilege service role.
7. Establish backup/PITR/restore and accepted RPO/RTO.
8. Execute representative volume, WAL, index, lock and concurrent GSBC workload benchmark.
9. Define retention/lifecycle and obtain cost approval.
10. Regenerate database types before API/UI use.

## 27. Gate Decision

**RF-03A Gate: NO-GO**.

Reasons: source oficial nao verificada/consumivel, P0 aberto, POC multi-entidade ausente, capacidade produtiva insuficiente e recuperacao inadequada. Os mecanismos locais passaram, mas nao satisfazem os criterios de source, sizing, DB capacity e backup/PITR para `GO`.

```text
RF-03A INGESTION ARCHITECTURE & CONTROLLED POC COMPLETE

Report:
docs/RF_03A_INGESTION_ARCHITECTURE_AND_POC_REPORT.md

Receita Source: NOT VERIFIED
POC: PARTIAL
Manifest: PASS
Integrity: PASS (LOCAL ONLY; REMOTE INTEGRITY UNAVAILABLE)
Parser: PASS
CNPJ Numeric: PASS
CNPJ Alphanumeric: PASS
Bulk Load: PASS
Idempotency: PASS
Failure Injection: PASS

Recommended Worker: DEDICATED BATCH WORKER/JOB; VERCEL ORCHESTRATION ONLY
Recommended Storage: PRIVATE DEDICATED S3-COMPATIBLE OBJECT STORAGE
Observed Volume: 22,078 B COMPRESSED / 88,215 B EXTRACTED / 1,359 CNAE ROWS
POC Throughput: 97,168 PARSE ROWS/S; 145,759 COPY ROWS/S
Projected National Window: UNKNOWN - REQUIRES OFFICIAL MANIFEST AND REPRESENTATIVE POC
Current PostgreSQL: NOT RECOMMENDED FOR NATIONAL INGESTION
Backup/PITR: FAIL
Typecheck: PASS
Lint: PASS (1 PREEXISTING WARNING)
Regression: PASS
P0: 1
P1: 4

RF-03A Gate: NO-GO
RF-03B: NOT READY

No national RF dataset ingested.
No RF dataset published.
No production ingestion activated.
No automatic monthly sync activated.
```

**STOP - AWAIT HUMAN REVIEW.**
