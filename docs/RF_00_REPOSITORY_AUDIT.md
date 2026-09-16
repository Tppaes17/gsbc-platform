# RF-00 — Repository Audit: RF-CNPJ Data Intelligence

Data: 2026-09-16

Escopo: auditoria inicial solicitada por `RF_CNPJ_DATA_INTELLIGENCE_MASTER_SPEC.md`.

Gate final: **GO WITH CONDITIONS**

Justificativa objetiva: o repositório tem base SaaS multi-tenant, RLS, cron, service role controlado, dossiês cadastrais e padrões de auditoria suficientes para iniciar RF-01 e RF-02. Porém há P0 de compatibilidade com CNPJ alfanumérico e P1/P2 de arquitetura de ingestão, storage, sizing, performance e governança que impedem qualquer ingestão estrutural antes de correções e decisões explícitas.

## 1. Método

A auditoria foi feita por leitura direta do repositório, sem alterar código de produção, migrations, RLS, APIs ou dados.

Comandos e verificações executadas:

- `sed` integral no artefato `RF_CNPJ_DATA_INTELLIGENCE_MASTER_SPEC.md`.
- `git status --short && git branch --show-current`.
- `find supabase/migrations -maxdepth 1 -type f | sort | tail -n 15`.
- `find src/app/api -maxdepth 4 -type f | sort`.
- `find src/lib -maxdepth 3 -type f | sort`.
- `rg -n "CNPJ|cnpj|\\d\\{14\\}|replace\\(/\\D|parseInt\\(|Number\\(cnpj|14 dígitos|cnpjDigitos|formatCnpj" src supabase e2e docs --glob '!node_modules'`.
- Leitura dirigida de validações, clientes CNPJ, migrations de empresas/dossiês, crons e service role.

Fontes externas oficiais consultadas para calibrar a leitura do requisito:

- Receita Federal, página de metadados CNPJ: `https://www.gov.br/receitafederal/dados/cnpj-metadados.pdf/view`.
- Receita Federal, CNPJ alfanumérico: `https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/cnpj-alfanumerico/cnpj-alfa`.
- Receita Federal, primeiro CNPJ alfanumérico: `https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2026/julho/receita-federal-gera-o-primeiro-cnpj-em-formato-alfanumerico`.

## 2. Arquitetura atual

Stack observada:

- Next.js App Router com React e Server Actions.
- Supabase/PostgreSQL como banco principal, com migrations SQL versionadas.
- Supabase Auth e helpers `@supabase/ssr`.
- Vercel Cron para jobs periódicos.
- Playwright para E2E e a11y.
- TypeScript e ESLint.

APIs e jobs existentes:

- `src/app/api/cron/collection-engine/route.ts`.
- `src/app/api/cron/prospectos-consulta/route.ts`.
- `src/app/api/cron/backup/route.ts`.
- `src/app/api/webhooks/payments/[provider]/route.ts`.
- `src/app/api/health/route.ts`.

Crons definidos em `vercel.json`:

- `/api/cron/collection-engine`, diário às 12h.
- `/api/cron/prospectos-consulta`, diário às 13h.
- `/api/cron/backup`, diário às 06h.

Componentes de domínio relevantes:

- Cadastro de empresas: `src/app/backoffice/empresas/*`, `src/lib/validation/empresa.ts`, `supabase/migrations/0006_empresas.sql`.
- Sindicatos: `src/app/backoffice/sindicatos/*`, `src/lib/validation/sindicato.ts`.
- Inteligência cadastral/CNPJ: `src/lib/cnpj/*`, `src/app/backoffice/prospectos/*`, `supabase/migrations/0016_inteligencia_cadastral.sql`, `0017_enriquecimento_web.sql`, `0018_prospectos.sql`.
- Service role: `src/lib/supabase/admin.ts`.
- Observabilidade interna: `src/lib/observability/events.ts`.
- Backup: `src/lib/backup/engine.ts`, `src/app/api/cron/backup/route.ts`.

## 3. Banco, RLS e tenancy

O banco atual é tenant-scoped para dados operacionais:

- `empresas` tem `tenant_id`, `cnpj text not null` e unicidade `(tenant_id, cnpj)` em `supabase/migrations/0006_empresas.sql`.
- `empresa_contatos` deriva tenancy por `empresa_id`.
- `dossies_cadastrais` permite vínculo a `tenant_id` e `empresa_id`, mas também suporta prospectos sem tenant em `supabase/migrations/0018_prospectos.sql`.
- `dossie_evidencias` deriva acesso via dossiê.

RLS já é aplicada em entidades operacionais:

- `empresas` e `empresa_contatos`: RLS em `0006_empresas.sql`.
- `dossies_cadastrais` e `dossie_evidencias`: RLS em `0016_inteligencia_cadastral.sql`.
- `dossie_importacoes`: RLS em `0018_prospectos.sql`.

Hardening relevante já existe:

- `supabase/migrations/0032_phase0_security_hardening.sql` valida tenant real em auditoria e restringe spoofing de `tenant_id/entity_id`.
- `supabase/migrations/0033_phase0_service_role_grants.sql` reforça funções `service_role` exclusivas.
- `src/lib/supabase/admin.ts` documenta que `service_role` contorna RLS e lista usos permitidos.

Gap para RF-CNPJ:

- Não existe schema dedicado `rf_raw` ou `rf_canonical`.
- Não existem tabelas `rf_dataset_version`, `rf_dataset_manifest`, `rf_sync_job`, `company_change_event` ou equivalentes.
- Não existe política de retenção para raw files, versão ativa + versão anterior.
- Não existe isolamento explícito entre dado público RF compartilhado e inferências/decisões tenant-scoped.

## 4. Uso atual de CNPJ

Uso como texto:

- `empresas.cnpj` é `text` em `supabase/migrations/0006_empresas.sql`.
- `dossies_cadastrais.cnpj_consultado` é `text` em `supabase/migrations/0016_inteligencia_cadastral.sql`.
- Types gerados indicam `cnpj: string` e `cnpj_consultado: string | null` em `src/types/database.types.ts`.

Clientes e fluxos:

- BrasilAPI: `src/lib/cnpj/brasil-api.ts`.
- LeadCNPJ: `src/lib/cnpj/leadcnpj.ts`.
- Avaliação/dossiê: `src/lib/cnpj/avaliacao.ts`.
- Sweep diário de prospectos: `src/lib/cnpj/consulta-sweep.ts`.
- Importação de prospectos: `src/lib/validation/prospecto.ts` e `src/app/backoffice/prospectos/actions.ts`.
- Promoção de prospecto para empresa: `src/lib/validation/promocao-prospecto.ts` e `src/app/backoffice/prospectos/actions.ts`.

## 5. Compatibilidade com CNPJ alfanumérico

Status: **não compatível hoje**.

Evidências P0:

- `src/lib/validation/empresa.ts` usa regex exclusivamente numérica e formatada: `^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$`.
- `src/lib/validation/promocao-prospecto.ts` repete regex numérica e `formatarCnpj(cnpjDigitos)` usa grupos `\d`.
- `src/lib/validation/prospecto.ts` normaliza planilha com `replace(/\D/g, "")`, removendo letras.
- `src/lib/cnpj/brasil-api.ts` normaliza `cnpjEntrada.replace(/\D/g, "")` e retorna erro “precisa ter 14 dígitos”.
- `src/lib/cnpj/leadcnpj.ts` normaliza `cnpjEntrada.replace(/\D/g, "")` e retorna erro “precisa ter 14 dígitos”.
- `src/app/backoffice/prospectos/prospectos-table.tsx` mascara CNPJ apenas se `length === 14` e com regex numérica.
- Formulários novos exibem placeholder numérico em `src/app/backoffice/empresas/novo/empresa-form.tsx` e `src/app/backoffice/sindicatos/novo/sindicato-form.tsx`.

Impacto:

- Um CNPJ alfanumérico oficial como `00.000.000/E08G-12` perderia letras e seria rejeitado ou consultado incorretamente.
- Importações por planilha podem classificar CNPJ válido como inválido.
- Dossiês e promoção para empresa podem armazenar ou formatar errado.
- Integrações externas legadas podem precisar erro explícito por capacidade do provider, não mutilação silenciosa do identificador.

## 6. Infraestrutura de ingestão

Estado atual:

- Há Vercel Cron e service role para jobs server-side.
- Há backup diário.
- Há sweep CNPJ de prospectos, mas baseado em chamadas online à BrasilAPI, não em base RF local.

Gap:

- Não há downloader de arquivos oficiais.
- Não há manifest determinístico.
- Não há staging, validação, publish, rollback ou swap de dataset.
- Não há parser streaming/bulk.
- Não há armazenamento raw nem política de hash por arquivo.
- Não há worker dedicado para dezenas de milhões de registros.
- Não há sizing de banco, storage, índices ou backup/restore para RF-CNPJ.

Risco: Vercel Functions/Cron podem não ser adequados para ingestão massiva por tempo, memória e IO. O cron pode orquestrar, mas o processamento pesado deve ser validado em worker dedicado ou pipeline externo compatível com Supabase/PostgreSQL.

## 7. Storage e volume

Estado atual:

- O repositório contém backup e documentos, mas não há storage bucket ou política específica para raw files da Receita.
- Não há estimativa local de volume compactado/descompactado/staging/índices.

Decisões pendentes:

- Onde armazenar ZIPs oficiais e arquivos extraídos.
- Período de retenção dos arquivos brutos.
- Se staging fica no mesmo projeto Supabase ou em ambiente/banco separado.
- Custo de manter versão ativa + anterior + staging + índices.
- Impacto em backup e restore.

Recomendação inicial: GO somente para RF-01/RF-02. RF-03 exige sizing e prova de carga com volume representativo antes de produção.

## 8. Scheduler, workers e backpressure

Vercel Cron atual é suficiente para checks pequenos:

- Detecção diária de nova versão.
- Disparo de job assíncrono.
- Consulta de status.

Não é comprovadamente suficiente para:

- Download de múltiplos ZIPs grandes.
- Extração e parse massivo.
- COPY/bulk load.
- Indexação de dezenas de milhões de linhas.
- VACUUM/ANALYZE pós-publicação.

Condição: antes do RF-03, definir worker, limites de concorrência, retry, idempotência, cancelamento e janela operacional.

## 9. APIs e UX atuais

Não existem ainda:

- `GET /api/cnpj/{cnpj}` local baseado em dataset ativo.
- `GET /api/companies/search`.
- `GET /api/companies/{cnpj}/establishments`.
- `GET /api/companies/{cnpj}/partners`.
- `GET /api/companies/{cnpj}/changes`.
- Endpoints internos `/internal/rfb/*`.
- Módulo “Universo Empresarial”.
- Company 360º com fonte RF versionada.

Existem fluxos próximos:

- Página de empresas e dossiê cadastral.
- Prospectos e importação por planilha.
- Consulta oficial via BrasilAPI/Minha Receita.
- Enriquecimento opcional LeadCNPJ.

Risco de produto: apresentar a consulta atual como “base RF-CNPJ local” seria funcionalidade falsa. A UI deve distinguir consulta online existente de dataset oficial versionado futuro.

## 10. Auditoria e provenance

Pontos fortes:

- O projeto já tem `audit_logs` e `log_audit_event`.
- Há eventos/policies para decisões críticas.
- Dossiês armazenam evidências e snapshots JSON.

Gaps para RF-CNPJ:

- Não há `dataset_version` em dados oficiais consultados.
- Não há `source_file`, `source_record_hash`, `imported_at` por registro RF.
- Não há eventos de mudança entre versões.
- Não há trilha para publicação/rollback de dataset.

## 11. Performance e busca

Estado atual:

- Tabelas operacionais pequenas/médias, com índices por tenant e relacionamento.
- Não há índices ou schemas preparados para dezenas de milhões de registros RF.
- Busca atual em empresa/prospecto é orientada a UI operacional, não search engine cadastral.

Gaps:

- Necessidade de índices por `cnpj_canonical`, `cnpj_root`, UF, município, CNAE, situação, porte, natureza jurídica e data de abertura.
- Necessidade de busca textual case/accent-insensitive por razão social/nome fantasia.
- Necessidade de benchmark antes de escolher trigram/full-text/search externo.

Condição: não introduzir Elasticsearch/OpenSearch antes de benchmark, conforme spec.

## 12. Segurança e LGPD

Riscos identificados:

- Base pública RF pode ser compartilhada, mas classificações, obrigações, cobranças, comentários e contatos privados permanecem tenant-scoped.
- QSA e representantes podem conter dados pessoais e exigem governança de acesso, logs e minimização.
- Exportações de alto volume ainda não possuem controle/auditoria específicos.
- Endpoints de busca podem permitir enumeração abusiva se lançados sem rate limiting.

Condições:

- RLS deve continuar como autoridade final para dados operacionais.
- RF público pode ter política separada, mas dados derivados por tenant não podem vazar.
- Exigir testes adversariais antes de liberar APIs e exportação.

## 13. Mapa de riscos

| Severidade | Risco | Evidência | Impacto | Mitigação |
|---|---|---|---|---|
| P0 | CNPJ alfanumérico rejeitado/mutilado | `replace(/\D/g, "")`, regex `\d` em validações e clientes | Perda de compatibilidade com padrão oficial novo | RF-01 antes de qualquer ingestão/API |
| P0 | Ingestão massiva sem sizing | Ausência de manifest, staging, worker e volume | Indisponibilidade, custo e perda operacional | RF-00/RF-02 + benchmark antes de RF-03 |
| P1 | Sem modelo RF versionado | Não há `rf_dataset_version`/manifest/job | Impossível provar origem e rollback | RF-02 migration dedicada |
| P1 | Sem raw storage/retention | Nenhum bucket/política RF | Reprocessamento e auditoria frágeis | Decisão explícita de storage |
| P1 | Sem publish/rollback | Não há ACTIVE/ARCHIVED nem swap | Dataset ruim pode ficar ativo | RF-04 com rollback testado |
| P1 | Sem diff engine | Não há `company_change_event` | Radar e reavaliação sindical inexistentes | RF-08 após dataset ativo |
| P1 | Service role em ingestão futura | `createAdminClient()` bypassa RLS | Blast radius alto se usado fora do worker | Encapsular operações admin e testar grants |
| P1 | Enumeração abusiva | APIs RF/search não existem com rate limit | Carga e extração massiva | Rate limit por perfil antes de RF-05 |
| P2 | BrasilAPI/LeadCNPJ legados | Clientes atuais online e numéricos | Confusão entre fonte online e dataset local | UX e código distinguindo fonte |
| P2 | E2E fixtures numéricas | Fixtures geram CNPJ numérico | Testes não cobrem padrão novo | Adicionar testes alfanuméricos RF-01 |

## 14. P0, P1, P2 e P3

P0:

- Corrigir normalização/validação/formatação de CNPJ para preservar letras e aceitar formato alfanumérico oficial.
- Bloquear implementação estrutural de ingestão até existir auditoria aceita e decisões de storage/sizing.

P1:

- Criar modelo de dados RF versionado com manifest, jobs, provenance, publicação e rollback.
- Definir storage de raw files, retenção e backup/restore.
- Definir worker/scheduler de alto volume.
- Definir RLS/roles para dado público RF versus dados tenant-scoped derivados.
- Implementar testes de isolamento para qualquer dado derivado por tenant.

P2:

- Migrar UI e mensagens de “14 dígitos” para “14 caracteres”.
- Distinguir explicitamente BrasilAPI/LeadCNPJ de dataset RF local.
- Adicionar API local e rate limit.
- Adicionar busca textual/indexação com benchmark.

P3:

- Universo Empresarial completo.
- Company 360º estratégico.
- Radar Empresarial e segmentos dinâmicos.
- Exportações auditadas de alto volume.

## 15. Arquitetura concreta recomendada

Schemas:

- `rf_raw`: manifests, arquivos, checksums e logs de importação.
- `rf_canonical`: versões publicadas/staging e entidades normalizadas.
- `public`: projeções/links operacionais GSBC e eventos tenant-scoped.

Tabelas iniciais RF-02:

- `rf_dataset_versions`.
- `rf_dataset_files`.
- `rf_sync_jobs`.
- `rf_quality_checks`.
- `rf_empresas`.
- `rf_estabelecimentos`.
- `rf_socios`.
- `rf_simples`.
- tabelas de referência: CNAE, município, natureza jurídica, qualificação, motivo, país.
- `company_change_events` para diffs consolidados.
- tabela de link entre `empresas` operacionais e RF canonical, com estados `MATCHED`, `NOT_FOUND`, `INVALID_IDENTIFIER`, `MULTIPLE_MATCH`, `REVIEW_REQUIRED`.

Princípios:

- CNPJ sempre `text`.
- Campo canônico sem pontuação e uppercase.
- Nunca usar `number`, `bigint`, `parseInt` ou `replace(/\D/g, "")` para CNPJ.
- Dados RF são versionados e imutáveis por dataset.
- Dados operacionais GSBC não são sobrescritos por RF.
- Publicação é swap lógico de versão ativa.
- Rollback não exige reingestão.

## 16. Ordem de implementação recomendada

1. RF-01 — CNPJ Alphanumeric Readiness.
2. RF-02 — Data Model.
3. RF-03 — Ingestion Pipeline em ambiente controlado.
4. RF-04 — Dataset Publication, observabilidade e rollback.
5. RF-05 — Search API com rate limit e benchmark.
6. RF-06 — Company 360º e vínculo com empresas.
7. RF-07 — Universo Empresarial.
8. RF-08 — Diff Engine/Radar.
9. RF-09 — Integração com enquadramento sindical.

## 17. Ordem de migrations proposta

Próxima migration provável: `0043_rf_cnpj_foundation.sql`, somente após RF-00 ser aceito.

Sequência sugerida:

1. `0043_rf_cnpj_foundation.sql`: schemas/tabelas de versão, manifest, jobs, checks, grants, RLS base.
2. `0044_rf_cnpj_canonical_tables.sql`: empresas, estabelecimentos, sócios, simples e referências.
3. `0045_rf_cnpj_publication_controls.sql`: active version, publish/rollback functions, locks.
4. `0046_rf_cnpj_company_links.sql`: links com `empresas`, match status, provenance.
5. `0047_rf_cnpj_change_events.sql`: diff events e fila de reavaliação.
6. `0048_rf_cnpj_search_indexes.sql`: índices após benchmark inicial.

## 18. Plano de testes

RF-01:

- Unit: normalização numérica e alfanumérica.
- Unit: formatação `00.000.000/E08G-12`.
- Unit: rejeição de caracteres inválidos sem remover letras silenciosamente.
- E2E: criar/importar/visualizar CNPJ alfanumérico sem rejeição por regex.

RF-02:

- SQL/RLS: roles autenticadas não escrevem tabelas RF.
- SQL/RLS: service role/worker consegue job controlado.
- SQL: uma única versão ativa.
- SQL: constraints de status e unicidade.

RF-03/RF-04:

- Integration: manifest determinístico e idempotência.
- Integration: staging não publica em falha de quality gate.
- Integration: publish/rollback.
- Load: volume representativo da base real, não 10 mil registros simulados como prova de capacidade.

RF-05+:

- Security: isolamento tenant em dados derivados.
- Security: rate limit e exportação auditada.
- E2E: busca CNPJ, CNAE, UF/município, Company 360º, histórico e versão.

## 19. Decisões pendentes

1. Storage bruto: Supabase Storage, Blob externo, bucket dedicado ou outro.
2. Worker: Vercel Cron apenas orquestra ou processamento em worker dedicado.
3. Banco: mesmo Supabase ou instância/staging separado para carga.
4. Particionamento: por dataset version, UF ou estratégia híbrida.
5. Retenção: ativa + anterior + quanto tempo de raw.
6. Backup/restore: custo e tempo com base RF.
7. Publicação: função SQL transacional, flag ativa ou materialized projections.
8. Search: PostgreSQL full-text/trigram versus search externo após benchmark.
9. Rate limit: provider e perfis.
10. Exportação: limites, auditoria e permissões.

## 20. Conclusão

**GO WITH CONDITIONS** para iniciar RF-01 e RF-02.

Condições bloqueadoras antes de ingestão real:

- P0 de CNPJ alfanumérico resolvido.
- Modelo de dados RF versionado aprovado.
- Storage bruto, worker e retenção definidos.
- Benchmark/sizing inicial feito com volume representativo.
- RLS e grants testados para separar base pública, dados derivados e dados operacionais tenant-scoped.

Não há autorização técnica nesta auditoria para iniciar RF-03, ingestão massiva, endpoints públicos de busca, Company 360º, Universo Empresarial, cobrança automática ou classificação jurídica automática.
