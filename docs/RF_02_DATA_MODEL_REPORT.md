# RF-02 Data Model Report

Data: 2026-09-16

## 1. Executive Summary

RF-02 implementou localmente a fundacao persistente do RF-CNPJ Data Intelligence: schemas `rf_raw` e `rf_canonical`, versionamento de dataset, manifest/files, jobs, quality checks, modelo canonical minimo para empresas, estabelecimentos, CNAEs, QSA, Simples/MEI, referencias oficiais e vinculo tenant-aware entre registros RF e `empresas` GSBC.

Nenhum dataset real foi ingerido. Nenhum deploy, commit, push ou migration de producao foi executado.

Gate: GO WITH CONDITIONS. O modelo local, rebuild, drift, RLS/adversariais, CNPJ numerico e alfanumerico passaram. Condicoes restantes: Master Spec nao esta no caminho canonico `docs/RF_CNPJ_DATA_INTELLIGENCE_MASTER_SPEC.md`, types do banco nao foram regenerados por decisao de evitar churn antes de consumo por app, e particionamento/storage fisico seguem para POC/RF-03.

## 2. Entry Gate

Entradas verificadas:

- RF-00: `docs/RF_00_REPOSITORY_AUDIT.md`.
- RF-01: `docs/RF_01_CNPJ_ALPHANUMERIC_READINESS.md`.
- RF-01A: `docs/RF_01A_E2E_VERIFICATION.md`.
- Master Spec: lido do anexo `/Users/thiagopisciottipaes/Library/CloudStorage/OneDrive-Pessoal/Backup MacPro/GSBC/RF_CNPJ_DATA_INTELLIGENCE_MASTER_SPEC.md`.
- Docs canonicos: `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/MULTITENANCY.md`, `docs/DOMAIN_RULES.md`.

Observacao: o Master Spec nao existe em `docs/` no workspace atual. Isso nao bloqueou a execucao porque o arquivo anexado foi lido, mas e uma pendencia de localizacao documental.

## 3. Preflight Results

Comandos:

- `git status --short`: sem alteracoes rastreadas no inicio desta rodada.
- Ultima migration antes da RF-02: `0042_ai_copilot_guardrails.sql`.
- `npx supabase status`: Supabase local ativo.
- `npx supabase migration list --local`: PASS, migrations 0001-0042 antes da RF-02.
- `npx supabase db diff --local --schema public,storage --use-migra`: PASS, sem drift pre-RF-02.

Preflight: PASS.

## 4. Existing Database Baseline

Baseline confirmado:

- Projeto Supabase local em Postgres 17.
- API local expoe `public` e `graphql_public`; `rf_raw`/`rf_canonical` nao sao expostos por default.
- Migrations existentes 0001-0042.
- RLS existente baseado em `public.is_platform_staff(auth.uid())` e `public.user_tenant_ids(auth.uid())`.
- Auditoria existente via `public.log_audit_event`.

## 5. Schema Decision

Decisao: criar schemas separados:

- `rf_raw`: staging/raw operacional privado.
- `rf_canonical`: dados RF globais, versionados, read-only para usuarios.
- `public.rf_company_links`: vinculo tenant-aware entre RF global e empresas GSBC.

Justificativa: evita adicionar `tenant_id` artificial em dado publico global e evita expor raw/canonical como tabelas de negocio.

## 6. Global vs Tenant-Scoped Model

Global RF:

- Dataset versions.
- Files/manifest.
- Jobs.
- Quality checks.
- Empresas RF.
- Estabelecimentos RF.
- QSA.
- CNAEs e referencias.
- Simples/MEI.

Tenant-scoped GSBC:

- `public.rf_company_links`, com `tenant_id`, `empresa_id`, match status/method, confidence, confirmacao/rejeicao e timestamps.

## 7. Dataset Version Model

Tabela: `rf_canonical.rf_dataset_versions`.

Campos principais:

- `dataset_version`
- `competence_month`
- `source`
- `status`
- `is_current`
- `manifest_hash`
- timestamps de discovery/download/validacao/publicacao/retirada/falha
- `supersedes_dataset_version_id`
- `metadata`

Invariantes:

- unique `(source, dataset_version)`.
- no maximo uma versao `is_current` por `source`.
- no maximo uma versao `PUBLISHED` por `source`.
- `is_current` exige `status = PUBLISHED`.

## 8. Dataset Files Model

Tabela: `rf_canonical.rf_dataset_files`.

Suporta:

- tipo de arquivo por entidade ou manifest/other;
- identifier/source_url;
- tamanho esperado/obtido;
- etag/last_modified;
- checksum;
- storage path;
- status;
- attempts;
- erro;
- metadata.

Nao assume quantidade ou nomes fixos.

## 9. Sync Jobs Model

Tabela: `rf_canonical.rf_sync_jobs`.

Job types preparados:

`DISCOVER`, `PLAN`, `DOWNLOAD`, `VERIFY`, `EXTRACT`, `LOAD`, `VALIDATE`, `NORMALIZE`, `INDEX`, `DIFF`, `PUBLISH`, `ROLLBACK`, `REPORT`.

RF-02 nao implementa worker.

## 10. Quality Checks Model

Tabela: `rf_canonical.rf_quality_checks`.

Checks preparados:

- file integrity;
- row count;
- rejection rate;
- duplicate key;
- referential integrity;
- schema compatibility;
- volume variation;
- canonical validation.

Severidades: `INFO`, `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.

## 11. Canonical Company Model

Tabela: `rf_canonical.rf_companies`.

Campos:

- `dataset_version_id`
- `cnpj_root`
- `legal_name`
- `legal_nature_code`
- `responsible_qualification_code`
- `share_capital`
- `company_size_code`
- `federative_entity`
- `source_file_id`
- `source_record_hash`
- `imported_at`

CNPJ raiz e texto uppercase, nao numerico.

## 12. Canonical Establishment Model

Tabela: `rf_canonical.rf_establishments`.

Campos:

- `cnpj_root`, `cnpj_order`, `cnpj_dv`, `cnpj_canonical`
- `branch_type`
- fantasia;
- situacao cadastral e datas;
- motivo;
- endereco;
- CNAE principal;
- contatos publicos oficiais;
- status especial;
- proveniencia.

Constraints preservam `cnpj_canonical = cnpj_root || cnpj_order || cnpj_dv`.

## 13. CNAE Model

Tabelas:

- `rf_canonical.rf_cnaes`
- `rf_canonical.rf_establishment_secondary_cnaes`

CNAE principal fica em `rf_establishments.main_cnae_code`; secundarios ficam em tabela separada pesquisavel.

## 14. QSA Model

Tabela: `rf_canonical.rf_partners`.

Regra aplicada: documentos pessoais mascarados sao preservados apenas como fonte (`partner_document_masked`, `legal_representative_document_masked`). O modelo nao tenta recompor CPF/CNPJ descaracterizado.

## 15. Simples/MEI Model

Tabela: `rf_canonical.rf_simples_mei`.

Campos:

- `cnpj_root`
- opcoes Simples/MEI;
- datas de inicio/fim;
- proveniencia.

A tabela nao produz decisao automatica de enquadramento.

## 16. Reference Tables

Criadas:

- `rf_canonical.rf_cnaes`
- `rf_canonical.rf_municipalities`
- `rf_canonical.rf_countries`
- `rf_canonical.rf_legal_natures`
- `rf_canonical.rf_partner_qualifications`
- `rf_canonical.rf_registration_status_reasons`

Todas versionadas por `dataset_version_id`.

## 17. Provenance

Todo registro canonical relevante preserva `dataset_version_id` e `source_record_hash`.

Entidades que tambem preservam `source_file_id`:

- empresas;
- estabelecimentos;
- socios;
- Simples/MEI;
- referencias.

Teste SQL confirmou falha ao inserir empresa sem `source_record_hash`.

## 18. Publication/Rollback Readiness

Representado por:

- `status` em `rf_dataset_versions`;
- `is_current`;
- `supersedes_dataset_version_id`;
- `published_at`;
- `retired_at`.

Rollback futuro e representavel por trocar a versao corrente/publicada de forma transacional, sem reingestao. Fluxo operacional nao foi implementado.

## 19. GSBC Company Linkage

Tabela: `public.rf_company_links`.

Campos:

- `tenant_id`
- `empresa_id`
- `dataset_version_id`
- `rf_company_id`
- `rf_establishment_id`
- `cnpj_canonical`
- `match_status`
- `match_method`
- `confidence`
- confirmacao/rejeicao
- metadata/auditoria basica.

FK composta `(tenant_id, empresa_id)` garante que link nao associe empresa de outro tenant.

## 20. RLS

Raw:

- RLS habilitado.
- Sem policies e sem grants para `authenticated`.

Canonical:

- RLS habilitado.
- Select global autenticado para tabelas canonical/reference.
- Jobs/quality checks visiveis apenas para platform staff.
- Sem policies de insert/update/delete para usuarios.

Links:

- RLS tenant-scoped.
- Select por platform staff ou membro do tenant.
- Escrita restrita a platform staff.

## 21. Grants

`rf_raw`:

- `revoke all` de `anon` e `authenticated`.

`rf_canonical`:

- `grant usage` para `authenticated`.
- `grant select` em tabelas canonical permitidas.
- Sem grants de escrita.

`public.rf_company_links`:

- `grant select, insert, update, delete` para `authenticated`, limitado por RLS.

## 22. Service Role

Service role nao foi usado genericamente em codigo de app.

RF-02 cria tabelas e invariantes. Futuros caminhos privilegiados previstos:

- worker de discovery/download/load/normalize;
- publicacao/rollback;
- associacao automatica sugerida.

Esses caminhos deverao ser implementados em RF-03+ com escopo, caller, tabela, invariant e auditoria explicitos.

## 23. Audit Requirements

RF-02 preparou:

- `rf_sync_jobs` para ledger operacional;
- `rf_quality_checks` para evidencias de gate;
- `public.rf_company_links` com confirmacao/rejeicao e ator;
- uso futuro de `audit_logs`/`log_audit_event` para eventos humanos e publicacao/rollback.

Eventos de publicacao/rollback nao foram implementados.

## 24. Storage Contract

Contrato aprovado:

```text
rfb-cnpj/{dataset_version}/raw/
rfb-cnpj/{dataset_version}/extracted/
rfb-cnpj/{dataset_version}/manifest/
rfb-cnpj/{dataset_version}/logs/
```

Bucket fisico nao foi criado nesta fase.

Privacidade:

- bucket futuro privado;
- writers: worker autorizado/service operation especifica;
- readers: operacoes server-side;
- raw/extracted/canonical reconstruiveis;
- links, decisoes, diffs GSBC, audit e classificacoes nao reconstruiveis apenas pela Receita e exigem backup.

## 25. Index Strategy

Criados apenas indices estruturais:

- dataset/status;
- manifest/status;
- CNPJ raiz/canonical;
- company/establishment FK;
- CNAE;
- UF/municipio;
- match status;
- tenant/empresa/link.

Nao foram criados trigram/full-text/search complexo.

## 26. Partitioning Decision

Nao implementado em RF-02.

ADR-RF-007 registra POC necessario antes de particionar por `dataset_version_id`, UF ou entidade. Decisao depende de sizing real e benchmarks.

## 27. Migrations Created

- `supabase/migrations/0043_rf_dataset_governance.sql`
- `supabase/migrations/0044_rf_canonical_model.sql`
- `supabase/migrations/0045_rf_security_and_links.sql`

## 28. Database Types

Nao regenerado.

Justificativa:

- Os schemas `rf_raw` e `rf_canonical` nao sao expostos no PostgREST local.
- Nenhum codigo da aplicacao consome RF-02 ainda.
- `src/types/database.types.ts` e manual no projeto atual.
- Regeneracao completa agora geraria diff massivo sem uso funcional imediato.

Precondicao RF-03: atualizar tipos antes de implementar APIs/UI/worker que consumam `public.rf_company_links` ou schemas RF.

## 29. SQL Tests

Arquivo: `supabase/tests/rf02_data_model.sql`.

Execucao:

`docker exec -i supabase_db_GSBC_2_-_Claude psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/rf02_data_model.sql`

Resultado: PASS.

Cobertura:

- maximo uma versao corrente;
- CNPJ alfanumerico persiste;
- CNPJ numerico persiste;
- proveniencia obrigatoria;
- link cross-tenant falha;
- usuario autenticado nao escreve canonical;
- usuario autenticado nao escreve link;
- usuario autenticado nao le raw;
- tenant le apenas seu link;
- rollback logico representado por versao retired + published/current.

## 30. RLS/Adversarial Tests

Resultado: PASS.

Testes adversariais executados no SQL:

- tentativa de escrita em canonical como `authenticated`: bloqueada.
- tentativa de leitura raw como `authenticated`: bloqueada.
- tentativa de insert em `rf_company_links` como tenant user: bloqueada.
- tentativa de linkar `tenant_id` divergente da empresa: bloqueada por FK composta.

## 31. Reset/Rebuild Test

Comando:

`npx supabase db reset --local`

Resultado: PASS.

Aplicou migrations 0001-0045 e `supabase/seed.sql` do zero.

## 32. Typecheck/Lint

Typecheck:

`npx tsc --noEmit` — PASS.

Lint:

`npm run lint` — PASS com warning preexistente em `src/components/design-system/data-table.tsx:72` (`react-hooks/incompatible-library` por TanStack Table).

## 33. Drift Check

Comando:

`npx supabase db diff --local --schema public,storage,rf_raw,rf_canonical --use-migra`

Resultado:

`No schema changes found`.

Drift: NONE.

## 34. Remaining Findings

- RF02-F1: Master Spec nao esta no caminho canonico `docs/RF_CNPJ_DATA_INTELLIGENCE_MASTER_SPEC.md`.
- RF02-F2: Database types nao foram atualizados; necessario antes de RF-03 app/API.
- RF02-F3: Bucket/storage fisico nao criado; contrato documentado apenas.
- RF02-F4: Particionamento diferido para POC.
- RF02-F5: Worker strategy definida conceitualmente, mas nao implementada.

## 35. Risk Register Update

- P1-001 Storage capacity/lifecycle: mitigado parcialmente por contrato; ainda aberto para RF-03.
- P1-002 Dataset versioning: mitigado por `rf_dataset_versions`.
- P1-006 RLS/grants: mitigado por schemas, grants e testes adversariais.
- P1-008 Rollback readiness: mitigado por versionamento logico; fluxo operacional pendente.
- P2-007 Search performance: aberto para RF-05/benchmark.
- P2-008 Partitioning: aberto para POC.
- P2-009 Types/API exposure: aberto antes de RF-03.

## 36. ADRs

Criados:

- `docs/architecture/ADR-RF-001-physical-data-placement.md`
- `docs/architecture/ADR-RF-002-canonical-cnpj.md`
- `docs/architecture/ADR-RF-004-versioning-publication-model.md`
- `docs/architecture/ADR-RF-005-schema-strategy.md`
- `docs/architecture/ADR-RF-006-global-vs-tenant-scoped-security.md`
- `docs/architecture/ADR-RF-007-partitioning.md`
- `docs/architecture/ADR-RF-008-storage-contract.md`

## 37. Preconditions for RF-03

- Mover/copiar Master Spec para `docs/RF_CNPJ_DATA_INTELLIGENCE_MASTER_SPEC.md`.
- Aprovar RF-02 migrations e ADRs.
- Definir worker execution model.
- Validar origem oficial Receita externamente.
- Criar/validar bucket privado conforme contrato.
- Definir retention/lifecycle e backup de dados nao reconstruiveis.
- Atualizar database types antes de APIs/UI.
- Executar POC de sizing/partitioning.
- Manter RF-03 sem ingestion real ate discovery/downloader validado.

RF-03 nao esta automaticamente autorizado.

## 38. Gate Decision

RF-02 Gate: GO WITH CONDITIONS.

Motivo: modelo, rebuild, drift, invariantes, RLS/adversariais e regressao CNPJ passaram. Condicoes restantes nao sao criticas para a fundacao local, mas precisam de revisao humana antes de RF-03.

RF-03: READY FOR HUMAN REVIEW.

No RF dataset ingested.
No production migration applied.
No deploy performed.
No commit performed.
No push performed.
