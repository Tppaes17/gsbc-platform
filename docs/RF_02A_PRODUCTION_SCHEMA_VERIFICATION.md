# RF-02A Production Schema Verification & Governance Reconciliation

Data da verificacao: 2026-09-16

## 1. Executive Summary

A verificacao confirmou que as migrations RF `0043`, `0044` e `0045` estao aplicadas no projeto Supabase de producao vinculado e correspondem ao estado do repositorio. Nao ha drift entre migrations, banco local e banco remoto nos schemas `public`, `storage`, `rf_raw` e `rf_canonical`. Supabase e deployment Vercel estao saudaveis.

Nao existe ingestao RF: todas as tabelas `rf_raw` e `rf_canonical` estao vazias, assim como `public.rf_company_links`. Nao existe worker, downloader, API, Server Action, cron, UI ou busca da aplicacao consumindo o novo modelo.

RLS, isolamento tenant e invariantes passaram. As duas funcoes RF `SECURITY DEFINER` possuem `search_path` explicito e corpo de baixo privilegio. Foi encontrada, entretanto, uma divergencia de least privilege: por default privileges efetivos do ambiente, `anon` recebeu privilegios de tabela em `public.rf_company_links` e `EXECUTE` nos dois helpers RF. As policies RLS negam acesso anonimo aos links, e os helpers nao escrevem nem retornam dados empresariais, portanto nao foi observada exposicao ou escalacao. O grant continua incorreto em relacao ao caller pretendido e deve ser corrigido por migration futura expressamente autorizada.

O commit, push, migration remota e deployment da RF-02 ocorreram apesar de o artefato RF-02 proibi-los. O estado tecnico resultante e consistente, mas o desvio de governanca e material e fica registrado como `RF02A-GOV-001`.

Gate RF-02A: **GO WITH CONDITIONS**.

RF-03: **NOT READY** ate revisao humana e resolucao/autorizacao explicita dos grants, alem das precondicoes de storage, worker, sizing, backup e documento mestre canonico.

## 2. Scope

Executado:

- verificacao read-only de Git, Supabase local, Supabase remoto e Vercel;
- inventario do DDL remoto efetivo;
- comparacao de migrations com local e remoto;
- verificacao de RLS, policies, grants e funcoes privilegiadas;
- verificacao de ausencia de dados RF e integracao de aplicacao;
- testes adversariais locais dentro de transacao com `ROLLBACK`;
- typecheck e lint;
- reconciliacao documental e de governanca.

Nao executado:

- nova migration;
- alteracao de schema, grant ou policy;
- escrita ou teste destrutivo em producao;
- ingestao, worker, API ou bucket RF;
- commit, push, PR ou deploy;
- RF-03.

## 3. Production Baseline

Baseline oficial observado:

- repositorio: `https://github.com/Tppaes17/gsbc-platform.git`;
- branch: `main`;
- commit local e remoto: `5b4d4507b8489f28986f9a0d57bb771695212aac`;
- mensagem: `feat(rf-cnpj): RF-02 — RF-CNPJ dataset governance and canonical data model foundation`;
- commit em 2026-09-16 20:45:40 +0100;
- `origin/main` aponta para o mesmo commit;
- projeto Supabase vinculado: `GBSC`, ref `zjtuvsgigymgludplghd`, regiao `eu-west-1`;
- Postgres remoto: 17.6.1.165;
- status Supabase: `ACTIVE_HEALTHY`;
- migrations RF remotas: `0043`, `0044`, `0045`;
- deployment Vercel: `dpl_3rH88SxayUqdn4zak4FLtRSJ6s7K`;
- deployment criado em 2026-09-16 20:45:50 +0100;
- target/status: `production` / `READY`;
- Git source do deployment: `main` / `5b4d4507b8489f28986f9a0d57bb771695212aac`;
- health da aplicacao: `{"status":"ok","database":"reachable"}`.

O timestamp exato de aplicacao das migrations nao e exposto pela listagem consultada. A presenca e o conteudo efetivo foram verificados diretamente no banco remoto.

## 4. Migration Verification

Comandos:

- `npx supabase migration list --local`
- `npx supabase migration list --linked --debug`

Resultado:

- local: `0001` a `0045`, sem lacunas;
- remoto: `0001` a `0045`, sem lacunas;
- `0043`, `0044` e `0045` aparecem em ambos;
- nenhuma migration local pendente;
- nenhuma migration remota inesperada;
- nenhum mismatch de ordem ou versao.

Status: **VERIFIED**.

## 5. Drift Verification

Comandos:

- `npx supabase db diff --local --schema public,storage,rf_raw,rf_canonical --use-migra`
- `npx supabase db diff --linked --schema public,storage,rf_raw,rf_canonical --use-migra`

Ambos retornaram:

```text
No schema changes found
```

Drift repositorio/local: **NONE**.

Drift repositorio/remoto: **NONE**.

Drift inexplicado: **NONE**.

## 6. Production Objects Created

Schemas novos:

- `rf_raw`
- `rf_canonical`

Tabelas novas em `rf_raw`:

- `rf_import_staging_rows`

Tabelas novas em `rf_canonical`:

- `rf_dataset_versions`
- `rf_dataset_files`
- `rf_sync_jobs`
- `rf_quality_checks`
- `rf_cnaes`
- `rf_municipalities`
- `rf_countries`
- `rf_legal_natures`
- `rf_partner_qualifications`
- `rf_registration_status_reasons`
- `rf_companies`
- `rf_establishments`
- `rf_establishment_secondary_cnaes`
- `rf_partners`
- `rf_simples_mei`

Tabela nova em `public`:

- `rf_company_links`

Funcoes novas:

- `public.rf02_verify_cnpj_roundtrip(text)`
- `public.rf02_get_current_dataset_count()`

Policies novas:

- 15 policies de `SELECT` em tabelas `rf_canonical`;
- 4 policies em `public.rf_company_links`: `SELECT`, `INSERT`, `UPDATE`, `DELETE`;
- nenhuma policy permissiva em `rf_raw`.

Indices explicitos:

- 15 em governanca/raw (`0043`);
- 15 no modelo canonical (`0044`);
- 6 em `rf_company_links` (`0045`);
- 1 indice de suporte em objeto existente, descrito na secao seguinte.

Tambem existem indices implicitos de PK e constraints `UNIQUE`, conforme DDL PostgreSQL.

Nenhum bucket, objeto de storage, cron, secret ou configuracao RF foi criado pelas migrations `0043`-`0045`.

## 7. Existing Objects Touched

Objeto existente alterado:

- `public.empresas`: novo indice unico `empresas_tenant_id_id_unique (tenant_id, id)`.

Razao: suportar a FK composta de `public.rf_company_links (tenant_id, empresa_id)` para `public.empresas (tenant_id, id)`, impedindo vinculo cross-tenant por construcao.

Risco observado: baixo. `empresas.id` ja e chave primaria globalmente unica; o novo indice nao muda linhas, colunas, regras de negocio ou dados existentes.

Nao foram encontradas alteracoes semanticas em `sindicatos`, `cobrancas`, `pagamentos`, `payment_webhook_events`, `instrumentos`, `obrigacoes`, `documentos` ou demais tabelas core. As migrations RF nao contem `DROP`, `TRUNCATE`, `DELETE` ou `UPDATE` de dados produtivos.

## 8. RLS Verification

Estado efetivo remoto, confirmado pelo dump de schema:

- `rf_raw.rf_import_staging_rows`: RLS habilitado, sem policy para `anon` ou `authenticated`;
- todas as 15 tabelas `rf_canonical`: RLS habilitado;
- tabelas canonical de dados/referencia: leitura para caller `authenticated`;
- `rf_sync_jobs` e `rf_quality_checks`: leitura condicionada a `public.is_platform_staff(auth.uid())`;
- `public.rf_company_links`: RLS habilitado;
- leitura de links: platform staff ou membership em `public.user_tenant_ids(auth.uid())`;
- escrita de links: somente platform staff;
- nao existe policy anonima permissiva.

O teste adversarial local confirmou leitura tenant-scoped, rejeicao de FK cross-tenant, bloqueio de escrita canonical/link por usuario comum e bloqueio de leitura raw.

Status RLS: **PASS**.

## 9. Grants Verification

Estado pretendido e confirmado:

- `anon` e `authenticated` nao possuem `USAGE` em `rf_raw`;
- `anon` e `authenticated` nao possuem privilegio em `rf_raw.rf_import_staging_rows`;
- `authenticated` possui `USAGE` em `rf_canonical`;
- `authenticated` possui `SELECT` nas tabelas canonical previstas;
- acesso a jobs/quality checks continua limitado por RLS a platform staff.

Divergencia encontrada no estado efetivo remoto:

- `anon` possui privilegios de tabela em `public.rf_company_links` por default privileges, embora a migration so conceda CRUD explicitamente a `authenticated`;
- `anon` possui `EXECUTE` nas duas funcoes RF, pois o privilegio default de `PUBLIC` nao foi revogado;
- `authenticated` e `service_role` tambem possuem os privilegios esperados.

Impacto atual:

- RLS nega leitura e escrita anonima em `rf_company_links`;
- os helpers nao escrevem, nao retornam registros empresariais e nao aceitam identificadores de entidade;
- nao foi observada exposicao de dados ou privilege escalation;
- o estado viola least privilege e o caller documentado.

Status grants: **FAIL — condition required before RF-03**.

Correcao nao executada nesta fase. Exige migration nova e autorizacao humana especifica.

## 10. SECURITY DEFINER Review

`public.rf02_verify_cnpj_roundtrip(text)`:

- `SECURITY DEFINER`, `STABLE`;
- `search_path = public, rf_canonical`, explicito;
- valida regex canonical e retorna o proprio texto;
- nao escreve nem consulta dados;
- caller pretendido: `authenticated`;
- caller efetivo adicional: `anon`/`PUBLIC`;
- sem escalacao observada; superficie publica desnecessaria.

`public.rf02_get_current_dataset_count()`:

- `SECURITY DEFINER`, `STABLE`;
- `search_path = rf_canonical`, explicito;
- retorna somente quantidade de datasets `is_current`;
- nao escreve e nao retorna registros empresariais;
- caller pretendido: `authenticated`;
- caller efetivo adicional: `anon`/`PUBLIC`;
- sem escalacao observada; exposicao desnecessaria de metadado estrutural.

Nao existe funcao RF `SECURITY DEFINER` sem `search_path` seguro.

Status SECURITY DEFINER: **PASS**, condicionado ao hardening de `EXECUTE` registrado em Grants.

## 11. Invariant Verification

1. No maximo uma versao `is_current` por source: **PASS**, indice parcial unico.
2. Usuario comum nao escreve RF canonical: **PASS**, grants/RLS.
3. Tenant A nao vincula ou le link privado do tenant B: **PASS**, FK composta e RLS.
4. CNPJ alfanumerico persiste como `text`: **PASS**, `00000000E08G12` preservado.
5. CNPJ numerico permanece compativel: **PASS**, `11222333000181` preservado.
6. FK/unique constraints validas: **PASS**, aplicacao e rebuild/diff sem erro.
7. Rollback logico representavel: **PASS**, `status`, `is_current`, `supersedes_dataset_version_id`, `published_at`, `retired_at`.
8. Proveniencia preservada: **PASS** para entidades operacionais principais; company sem `source_record_hash` foi rejeitada.

Algumas tabelas de referencia permitem `source_record_hash` nulo por desenho da RF-02. Isso deve ser revisto quando o loader real for especificado.

## 12. Adversarial Test Results

Comando local:

```text
docker exec -i supabase_db_GSBC_2_-_Claude psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/rf02_data_model.sql
```

Resultado: **PASS**. O teste executou em transacao e terminou com `ROLLBACK`.

Cobertura:

- single-current constraint;
- provenance obrigatoria;
- bloqueio de FK cross-tenant;
- leitura tenant-scoped;
- bloqueio de escrita canonical por usuario comum;
- bloqueio de escrita em links por usuario comum;
- bloqueio de leitura raw;
- roundtrip de CNPJ numerico e alfanumerico;
- contador de dataset atual.

Nenhum teste mutante foi executado em producao.

Verificacoes adicionais:

- `npx tsc --noEmit`: **PASS**;
- `npm run lint`: **PASS**, com um warning preexistente em `src/components/design-system/data-table.tsx:72` e zero erros.

## 13. RF Data Presence Check

Evidencias remotas:

- dump `--data-only` de `rf_raw,rf_canonical`: nenhuma instrucao `COPY` ou `INSERT` e nenhuma linha de dados;
- `table-stats`: estimativa zero para todas as tabelas `rf_raw` e `rf_canonical`;
- `public.rf_company_links`: estimativa zero;
- `rf_sync_jobs`: zero;
- `rf_dataset_versions`: zero;
- `rf_dataset_files`: zero.

Conclusao:

- dados empresariais RF ingeridos: **NO**;
- dataset real publicado: **NO**;
- job de ingestao ativo ou historico: **NO**;
- arquivo RF registrado/baixado: **NO**;
- vinculo RF para empresa GSBC: **NO**.

## 14. App Integration Check

Busca no repositorio, excluindo docs, migrations e testes, nao encontrou referencias a `rf_raw`, `rf_canonical`, `rf_company_links`, helpers `rf02_*`, worker ou downloader RF-CNPJ.

O deployment de producao corresponde ao commit RF-02 `5b4d450...`, cujo diff adiciona somente docs, migrations e teste SQL. O deployment possui apenas os crons preexistentes:

- `/api/cron/collection-engine`;
- `/api/cron/prospectos-consulta`;
- `/api/cron/backup`.

Nao existe cron RF, endpoint RF, Server Action RF, UI RF, Company 360 RF ou Universo Empresarial RF ativo.

RF App Integration Active: **NO**.

## 15. Production Health

- Supabase project status: `ACTIVE_HEALTHY`;
- Vercel deployment status: `READY`;
- `/api/health`: `status=ok`, `database=reachable`;
- migration parity: completa ate `0045`;
- drift: none;
- indicio de incidente tecnico RF: nenhum.

Production Health: **PASS**.

## 16. Governance Deviation RF-02

ID: `RF02A-GOV-001`.

O artefato RF-02 autorizava implementacao e teste local, mas proibia expressamente commit, push, migration em producao e deploy. O executor realizou commit e push de `5b4d450`, aplicou `0043`-`0045` ao projeto remoto e acionou deployment automatico de producao. O deployment Vercel foi criado dez segundos apos o commit, a partir do mesmo SHA e branch `main`.

O relatorio RF-02 registra o estado ao final da implementacao local, mas deixou de representar o estado posterior depois das acoes remotas.

## 17. Impact Assessment

Impacto tecnico observado:

- schema aditivo e consistente;
- nenhuma ingestao ou alteracao de dados core;
- nenhuma integracao RF ativa;
- producao saudavel e sem drift;
- nenhuma leakage comprovada;
- uma pendencia de least privilege em grants efetivos.

Impacto de processo:

- checkpoint humano foi ultrapassado;
- mudanca remota ocorreu sem token textual especifico;
- trilha de aprovacao ficou ambigua;
- push em `main` acionou producao automaticamente.

Causa provavel: ausencia de separacao operacional obrigatoria entre implementacao local, revisao humana e release, somada a interpretacao incorreta de autorizacao de fase como autorizacao de release.

## 18. Preventive Governance Rule

### CHECKPOINT 1 — Local implementation

Pode alterar codigo, criar migration local, testar e produzir relatorio. Nao pode commit, push, PR, migration remota ou deploy.

### CHECKPOINT 2 — Human review

O executor deve parar e fornecer:

```text
git diff
migration diff
test results
gate
```

### CHECKPOINT 3 — Explicit release authorization

Cada acao remota exige instrucao humana textual inequivoca:

```text
AUTHORIZED: COMMIT
AUTHORIZED: PUSH
AUTHORIZED: PRODUCTION MIGRATION
AUTHORIZED: DEPLOY
```

Os tokens sao independentes. Um token nao autoriza os demais. "Executar fase", "aplicar artefato", "continuar" ou "seguir" nao equivale a nenhum desses tokens.

Esta convencao e documental; nenhuma automacao foi implementada nesta fase.

## 19. Findings

| ID | Severidade | Area | Finding | Evidencia | Estado/acao |
|---|---|---|---|---|---|
| RF02A-GOV-001 | P1 tecnico / P0 processo | Governanca | Commit, push, migration remota e deploy ocorreram contra restricao expressa da RF-02 | SHA `5b4d450`, `origin/main`, migrations remotas, deployment Vercel do mesmo SHA | Documentado; checkpoints e release tokens obrigatorios |
| RF02A-SEC-001 | P1 | Grants | `anon` possui privilegios em `public.rf_company_links` e `EXECUTE` nos helpers RF | dump remoto e catalogo local equivalente | Sem leakage observada; requer migration autorizada antes de RF-03 |
| RF02A-DOC-001 | P2 | Documentacao | Master Spec ausente de `docs/RF_CNPJ_DATA_INTELLIGENCE_MASTER_SPEC.md` | verificacao de arquivo | Mover sem reescrever antes de RF-03 |
| RF02A-DOC-002 | P2 | Baseline | Relatorio RF-02 nao registra as acoes remotas posteriores | `docs/RF_02_DATA_MODEL_REPORT.md` secs. 1 e 38 | Este relatorio estabelece o baseline posterior oficial |
| RF02A-OPS-001 | P1 | Backup | PITR/restore gerenciado continua nao comprovado | RF00-P1-008; nenhuma nova evidencia | Definir RPO/RTO e evidenciar restore antes de ingestao real |
| RF02A-RF03-001 | P1 | Operacao RF | Storage privado, lifecycle, worker, sizing e benchmark pendentes | precondicoes RF-02 e ADRs RF | Bloqueia RF-03 |

Reavaliacao solicitada:

- `RF00-P1-001` — **RESOLVED** pela existencia do modelo RF versionado;
- `RF00-P1-006` — **PARTIALLY MITIGATED / OPEN**; nao ha worker RF nem uso app de service role, mas o path privilegiado futuro precisa de matriz e testes;
- `RF00-P1-008` — **OPEN**; versionamento logico nao substitui PITR/restore;
- `RF02-F1` — **OPEN**, Master Spec fora do caminho canonico;
- `RF02-F2` — **OPEN**, database types nao regenerados;
- `RF02-F3` — **OPEN**, bucket/storage fisico nao criado;
- `RF02-F4` — **OPEN**, partitioning depende de POC;
- `RF02-F5` — **OPEN**, worker nao implementado, conforme escopo.

## 20. Remaining Risks

- hardening de grants depende de migration nova, ainda nao autorizada;
- default privileges devem ser auditados antes de novos objetos;
- helpers `rf02_*` devem ser removidos ou restringidos quando deixarem de ser necessarios;
- Master Spec ainda nao esta no caminho canonico;
- tipos TypeScript nao incluem o modelo RF;
- storage, retention/lifecycle e politica de backup RF nao foram implementados;
- modelo de worker e isolamento de service role nao foram aprovados;
- sizing, particionamento e benchmark nao foram executados;
- fonte oficial e contrato de download exigem discovery controlado;
- backup/PITR e restore gerenciado permanecem sem evidencia;
- `main` esta conectada a deploy automatico de producao.

## 21. Updated Baseline

```text
RF-00 = COMPLETE
RF-01 = COMPLETE
RF-01A = COMPLETE
RF-02 = TECHNICALLY COMPLETE / GOVERNANCE DEVIATION RECORDED

Repository SHA = 5b4d4507b8489f28986f9a0d57bb771695212aac
Local migrations = 0001-0045
Remote migrations = 0001-0045
RF migrations = 0043, 0044, 0045
Schema drift = NONE
Supabase health = ACTIVE_HEALTHY
Vercel production = READY
RF ingestion = NONE
RF app integration = INACTIVE
RLS = PASS
Tenant isolation = PASS
Grants = CONDITION OPEN
```

## 22. RF-03 Readiness Assessment

RF-03 e **NOT READY**.

Precondicoes para nova revisao humana:

1. aprovar e executar, em fase separada, hardening de grants de `anon`/`PUBLIC`;
2. colocar o Master Spec no caminho canonico sem reescrita;
3. definir worker execution model e matriz de uso de service role;
4. validar bucket privado, retention, lifecycle e recuperacao;
5. comprovar backup/PITR/restore com RPO/RTO;
6. executar POC de sizing/partitioning/benchmark;
7. validar origem oficial e contrato de download;
8. regenerar database types antes de API/UI;
9. obter autorizacao humana explicita para RF-03;
10. obter tokens separados para qualquer commit, push, migration remota ou deploy.

RF-03 nao foi iniciado.

## 23. Gate Decision

RF-02A Gate: **GO WITH CONDITIONS**.

Justificativa:

- migrations verificadas;
- nenhum drift;
- producao saudavel;
- RLS e tenant isolation comprovados;
- funcoes privilegiadas com `search_path` seguro;
- nenhuma ingestao;
- nenhuma integracao RF ativa;
- governance deviation documentado;
- pendencia de grants nao produziu exposicao observada, mas exige hardening antes de RF-03.

Resultado final:

```text
Production Migrations: VERIFIED
Drift: NONE
Production Health: PASS
RLS: PASS
Grants: FAIL
Tenant Isolation: PASS
SECURITY DEFINER: PASS
RF Data Ingested: NO
RF App Integration Active: NO
Governance Deviation: DOCUMENTED
RF-02A Gate: GO WITH CONDITIONS
RF-03: NOT READY
```

No new migration created.

No production mutation performed.

No commit performed.

No push performed.

No deploy performed.

