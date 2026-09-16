# RF-00 — Discovery & Repository Audit

Data: 2026-09-16

Workstream: RF-CNPJ Data Intelligence

Escopo: auditoria tecnica pre-implementacao, conforme `RF_CNPJ_DATA_INTELLIGENCE_MASTER_SPEC.md` e `RF_00_DISCOVERY_REPOSITORY_AUDIT_EXECUTION_ARTIFACT.md`.

Gate: **GO WITH CONDITIONS**

## 1. Executive Summary

O repositorio GSBC tem uma base tecnica viavel para iniciar o workstream RF-CNPJ: Next.js App Router, Supabase/PostgreSQL, migrations SQL numeradas, RLS em dados operacionais, service role inventariado em parte, crons Vercel, dossies cadastrais, auditoria, backup logico e suite Playwright.

O modulo RF-CNPJ, porem, nao deve ser implementado ainda alem da proxima fase autorizavel. A RF-00 identificou P0 aberto em compatibilidade com CNPJ alfanumerico: varias camadas removem letras ou validam exclusivamente digitos. Tambem ha P1 relevantes de capacidade, storage, ingestao, publicacao, rollback, search, rate limiting, governanca de service role e validacao externa da origem oficial.

Decisao recomendada: avancar para **RF-01 — CNPJ Alphanumeric Readiness**, sem iniciar RF-02/RF-03 ate corrigir o P0 e aprovar decisoes de storage, worker, sizing e modelo versionado.

Contagem de findings:

| Severidade | Quantidade |
|---|---:|
| P0 | 2 |
| P1 | 9 |
| P2 | 9 |
| P3 | 4 |

CNPJ Alphanumeric Readiness: **NOT READY**

## 2. Scope

Incluido:

- leitura integral do Master Spec RF-CNPJ e do artefato de execucao RF-00;
- inventario de stack, docs canonicos, migrations, crons, APIs, jobs, storage, testes e observabilidade;
- auditoria global de CNPJ;
- matriz de readiness alfanumerica;
- analise de RLS, tenancy e service role;
- analise de banco, storage, workers, scheduler, busca, backup, LGPD e CI/CD;
- plano tecnico, findings, risk register, ADRs propostos, roadmap e precondicoes.

Excluido por restricao explicita do artefato:

- codigo de producao;
- migrations;
- schema/RLS;
- endpoints;
- frontend;
- ETL/downloader/importacao;
- POC destrutiva;
- commit, push, PR ou deploy.

## 3. Methodology

Comandos e verificacoes executadas:

| Comando | Resultado |
|---|---|
| Leitura integral de `RF_CNPJ_DATA_INTELLIGENCE_MASTER_SPEC.md` | concluida |
| Leitura integral de `RF_00_DISCOVERY_REPOSITORY_AUDIT_EXECUTION_ARTIFACT.md` | concluida |
| `find docs -maxdepth 2 -type f` | docs canonicos e historicos mapeados |
| `find supabase/migrations -maxdepth 1 -type f` | migrations `0001` a `0042` encontradas |
| `find src/app/api -maxdepth 4 -type f` | APIs/cron/webhooks mapeados |
| `find src/lib -maxdepth 3 -type f` | bibliotecas de dominio mapeadas |
| `rg` global para CNPJ, regex numerica, `replace(/\D/g)`, `parseInt`, `Number` | incompatibilidades identificadas |
| `curl -I -L --max-time 20 https://arquivos.receitafederal.gov.br/index.php/s/YggdBLfdninEJX9` | falhou: connection reset by peer |
| `npx tsc --noEmit` | passou |
| `npm run lint` | passou com 1 warning existente em `data-table.tsx` |
| `npx supabase migration list --local` | falhou: Postgres local indisponivel em `127.0.0.1:54322` |
| `npx supabase db diff --local --schema public,storage --use-migra` | falhou: Docker daemon indisponivel |
| `git status --short && git diff --stat` | sem saida antes da substituicao final deste relatorio |

Fontes externas oficiais consultadas:

- Receita Federal, metadados CNPJ: `https://www.gov.br/receitafederal/dados/cnpj-metadados.pdf/view`.
- Receita Federal, CNPJ alfanumerico: `https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/cnpj-alfanumerico/cnpj-alfa`.
- Receita Federal, primeiro CNPJ alfanumerico: `https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2026/julho/receita-federal-gera-o-primeiro-cnpj-em-formato-alfanumerico`.

Classificacao usada:

- **COMPROVADO NO REPOSITORIO**: evidenciado por arquivo/comando.
- **NAO IDENTIFICADO**: busca/leitura nao encontrou implementacao.
- **HIPOTESE / REQUER VALIDACAO EXTERNA**: depende de ambiente, infraestrutura, Receita Federal ou decisao humana.

## 4. Repository Baseline

COMPROVADO NO REPOSITORIO:

- Next.js 16.3.1, React 19.2.8, TypeScript, ESLint e Playwright em `package.json`.
- Supabase local configurado em `supabase/config.toml`.
- Migrations de `0001_core_schema.sql` ate `0042_ai_copilot_guardrails.sql`.
- Canonicos presentes: `docs/PRODUCT.md`, `docs/PRODUCT_REVIEW.md`, `docs/DOMAIN_RULES.md`, `docs/MULTITENANCY.md`, `docs/SECURITY.md`, `docs/ARCHITECTURE.md`, `docs/CURRENT_STATE_GAP_ANALYSIS.md`.
- Historico por rodadas ate `docs/rodadas/rodada-46-pre-demo-release-audit.md`.
- Relatorios relevantes: `docs/PHASE_0_EXECUTION_REPORT.md`, `docs/STG_00_09_CONSOLIDATION_REPORT.md`, `docs/PRE_STG10_REMEDIATION_REPORT.md`.
- Phase 0 reporta typecheck, migration diff, RLS adversarial, service role, audit, webhook, backup e E2E aprovados na execucao historica.
- Nesta execucao atual: `npx tsc --noEmit` passou; `npm run lint` passou com warning.

NAO IDENTIFICADO:

- GitHub Actions no repositorio local.
- Worker/queue dedicado fora de Vercel Cron.
- Storage dedicado para RF-CNPJ.
- Schemas `rf_raw` ou `rf_canonical`.

HIPOTESE / REQUER VALIDACAO EXTERNA:

- Estado real do Supabase local atual, pois Docker/Postgres local nao estavam ativos.
- Capacidade do projeto Supabase/Vercel em producao.
- Estrutura atual do diretorio oficial da Receita Federal.

## 5. Current Architecture

Aplicacao:

- Framework: Next.js App Router.
- Linguagem: TypeScript.
- Frontend: React, Tailwind, shadcn/Base UI, design system local em `src/components/design-system`.
- Backend: Server Actions, Route Handlers para cron/webhooks/health.
- Package manager: npm, evidenciado por `package.json` e scripts.

Banco:

- Supabase/PostgreSQL.
- Schema principal `public`; storage via Supabase Storage.
- RLS em tabelas tenant-scoped.
- Funcoes `SECURITY DEFINER` para helpers e operacoes sensiveis.
- Tipos gerados em `src/types/database.types.ts`.

Infra:

- Vercel Cron em `vercel.json`.
- Backup logico via `/api/cron/backup`.
- Webhook de pagamentos via `/api/webhooks/payments/[provider]`.
- Storage privado para documentos em bucket `documentos-empresas`, evidenciado por migrations e actions.

Arquitetura alvo documentada:

- `docs/ARCHITECTURE.md` recomenda modular monolith, eventos, audit, read models de busca e jobs idempotentes.
- `docs/MULTITENANCY.md` define tenant como fronteira primaria.
- `docs/SECURITY.md` exige RLS/authorization server-side, audit imutavel, least privilege e evals P0.

## 6. Current Data Model

Mapa simplificado real:

```text
tenants
  +-- sindicatos
  +-- memberships -> users -> roles -> permissions
  +-- empresas
        +-- empresa_contatos
        +-- dossies_cadastrais
              +-- dossie_evidencias
        +-- documentos
        +-- instrumentos
              +-- clausulas
              +-- obrigacoes
                    +-- cobrancas
                          +-- cobranca_eventos
                          +-- negociacoes
                          +-- pagamentos
                          +-- payment_charges
                          +-- payment_reconciliations
                          +-- contestacoes
                          +-- escalonamentos
        +-- notificacoes
        +-- work_items
  +-- financial_contracts
        +-- financial_split_rules
        +-- payment_split_items
        +-- financial_repasses
audit_logs
payment_webhook_events
collection_strategies
  +-- collection_templates
  +-- collection_strategy_steps
collection_enrollments
  +-- collection_executions
policy_decisoes
ai_interacoes
```

Observacoes:

- `empresas.cnpj` e `sindicatos.cnpj` sao `text`, mas isso nao basta para readiness alfanumerica.
- `dossies_cadastrais` nasceu vinculado a empresa/tenant e depois passou a permitir prospectos sem tenant/empresa em `0018_prospectos.sql`.
- `empresas` nao modela matriz/filial como entidade propria; hoje a ficha de empresa e o estabelecimento sao efetivamente colapsados.

## 7. CNPJ Usage Audit

Banco/migrations:

- `supabase/migrations/0001_core_schema.sql`: `sindicatos.cnpj text not null unique`.
- `supabase/migrations/0004_onboarding_and_invites.sql`: `p_cnpj text`.
- `supabase/migrations/0006_empresas.sql`: `empresas.cnpj text not null`, unique `(tenant_id, cnpj)`.
- `supabase/migrations/0016_inteligencia_cadastral.sql`: `dossies_cadastrais.cnpj_consultado text`, evidencias tipo `cnpj`, `qsa`, `cnae`.
- `supabase/migrations/0018_prospectos.sql`: unique parcial em `dossies_cadastrais(cnpj_consultado)` para prospectos.
- `supabase/seed.sql`: CNPJs numericos de seed.

Validacao/normalizacao:

- `src/lib/validation/empresa.ts`: regex formatada numerica.
- `src/lib/validation/sindicato.ts`: regex formatada numerica.
- `src/lib/validation/promocao-prospecto.ts`: regex numerica e formatador por grupos `\d`.
- `src/lib/validation/prospecto.ts`: `replace(/\D/g, "")`, remove letras.

Integracoes:

- `src/lib/cnpj/brasil-api.ts`: `replace(/\D/g, "")`, exige 14 digitos, mensagem numerica.
- `src/lib/cnpj/leadcnpj.ts`: `replace(/\D/g, "")`, exige 14 digitos, mensagem numerica.
- `src/lib/cnpj/avaliacao.ts`: depende dos clientes acima.
- `src/lib/cnpj/consulta-sweep.ts`: usa service role e dossies com `cnpj_consultado`.

Frontend/UI:

- `src/app/backoffice/empresas/novo/empresa-form.tsx`: placeholder numerico.
- `src/app/backoffice/sindicatos/novo/sindicato-form.tsx`: placeholder numerico.
- `src/app/backoffice/prospectos/prospectos-table.tsx`: mascara numerica local.
- `src/app/backoffice/empresas/[id]/page.tsx`: exibe CNPJ de empresa.
- `src/app/backoffice/cobrancas/[id]/payment-charge-actions.ts`: passa `payerDocument: empresa?.cnpj`.

Testes/fixtures:

- E2E geram CNPJ numerico em `e2e/*`.
- `e2e/helpers/prospectos-fixture.ts` gera CNPJ via digits-only.
- Nao ha teste alfanumerico identificado.

## 8. Alphanumeric CNPJ Readiness

Matriz:

| Camada | Local | Estado atual | Compativel? | Severidade | Correcao necessaria |
|---|---|---|---|---|---|
| Banco | `empresas.cnpj`, `sindicatos.cnpj`, `dossies_cadastrais.cnpj_consultado` | `text` | Parcial | P1 | adicionar canonicalizacao/constraints futuras sem converter para numero |
| Unicidade | `(tenant_id, cnpj)`, prospecto por `cnpj_consultado` | compara string armazenada | Parcial | P1 | armazenar forma canonica ou coluna canonica para evitar duplicidade por mascara/case |
| Validacao empresa | `src/lib/validation/empresa.ts` | regex numerica | Nao | P0 | aceitar 14 caracteres alfanumericos oficiais |
| Validacao sindicato | `src/lib/validation/sindicato.ts` | regex numerica | Nao | P0 | mesma correcao |
| Promocao prospecto | `src/lib/validation/promocao-prospecto.ts` | regex/formatador `\d` | Nao | P0 | helper unico de CNPJ |
| Importacao | `src/lib/validation/prospecto.ts` | `replace(/\D/g, "")` | Nao | P0 | preservar letras e rejeitar caracteres invalidos explicitamente |
| BrasilAPI | `src/lib/cnpj/brasil-api.ts` | remove letras e exige digitos | Nao | P0 | nao mutilar; tratar provider legado explicitamente |
| LeadCNPJ | `src/lib/cnpj/leadcnpj.ts` | remove letras e exige digitos | Nao | P0 | idem |
| Frontend | placeholders e mascara local | numerico | Nao | P2 | texto/mascara compativel com alfanumerico |
| Testes | `e2e/*` | fixtures numericas | Nao | P1 | adicionar casos alfanumericos unit/E2E |
| Types | `src/types/database.types.ts` | string | Sim parcial | P3 | sem acao estrutural imediata |

Conclusao: **NOT READY**. O P0 bloqueia qualquer ingestao ou API RF que prometa suporte ao novo formato.

## 9. Tenant & RLS Analysis

Como funciona hoje:

- Tabelas operacionais tem `tenant_id` direto ou derivado.
- RLS usa `public.is_platform_staff(auth.uid())` e `public.user_tenant_ids(auth.uid())`.
- Portal empresarial usa principal separado via `empresa_contatos`.
- Service role bypassa RLS e e usada em rotas/jobs controlados.

Tabelas empresariais com RLS/evidencias:

- `empresas`, `empresa_contatos`: `0006_empresas.sql`.
- `instrumentos`, `clausulas`, `obrigacoes`: `0007_instrumentos_obrigacoes.sql`.
- `cobrancas`, `cobranca_eventos`: `0008_cobrancas.sql`.
- `dossies_cadastrais`, `dossie_evidencias`: `0016_inteligencia_cadastral.sql`.
- `dossie_importacoes`: `0018_prospectos.sql`.
- `contestacoes`, `pagamentos`, `documentos`, `notificacoes`, financeiro e escalonamento em migrations posteriores.

Service role:

- `src/lib/supabase/admin.ts` documenta uso.
- Usos observados: usuarios/actions, portal login, empresas actions, CNPJ sweep, collection engine, operations sync, payments, backup.
- Phase 0 adicionou testes e grants para alguns caminhos, mas STG report ainda recomenda governanca mais formal por invariant.

Base publica RF compartilhada:

- Pode ser global tecnicamente, mas classificacoes, obrigacoes, cobrancas, contatos privados, comunicacoes, documentos e financeiro devem continuar tenant-scoped.
- Qualquer tabela de link/enquadramento deve conter `tenant_id` e RLS.

Novos testes adversariais necessarios:

- busca RF nao vaza classificacao de outro tenant;
- exportacao RF nao inclui dados tenant-scoped indevidos;
- endpoints admin `/internal/rfb/*` negam usuarios comuns;
- service role exige job id/tenant/contexto valido;
- tentativa de associar empresa de tenant A com classificacao tenant B falha.

## 10. Database Capacity

CONFIRMADO:

- Banco atual e Supabase/PostgreSQL.
- Migrations usam indices B-tree comuns em tenant, empresa, cobranca e relacionamentos.
- `supabase/config.toml` local existe, mas nao define capacidade produtiva.
- `npx supabase migration list --local` nao pode conectar nesta execucao.
- `npx supabase db diff --local` nao pode rodar sem Docker.

PROVAVEL:

- PostgreSQL pode suportar consulta exata e filtros iniciais se houver schema dedicado, bulk loading e indices adequados.
- Ingestao da base nacional no mesmo banco transacional pode degradar app se nao houver isolamento, particionamento e backpressure.

NAO DETERMINADO:

- Tamanho real do banco atual.
- Plano Supabase/Vercel em uso.
- IOPS, CPU, RAM, pooling, PITR, storage e limites de conexao.
- Tempo de backup/restore com base RF.

Conclusao: capacidade nao pode ser afirmada sem sizing e POC.

## 11. Storage Analysis

COMPROVADO NO REPOSITORIO:

- Bucket `documentos-empresas` aparece em `0013_documentos.sql` e varias actions.
- Backup logico usa storage privado `db-backups`, conforme `docs/PHASE_0_EXECUTION_REPORT.md` e `src/lib/backup/engine.ts`.
- `supabase/config.toml` tem secao storage, mas buckets locais comentados.

NAO IDENTIFICADO:

- bucket `/rfb-cnpj`.
- lifecycle/retencao para raw files.
- politica de custo para raw compressed/extracted.
- controle de checksums/manifest.

Recomendacao:

- bucket dedicado privado `rfb-cnpj`.
- paths:

```text
rfb-cnpj/{dataset_version}/raw
rfb-cnpj/{dataset_version}/extracted
rfb-cnpj/{dataset_version}/manifest
rfb-cnpj/{dataset_version}/logs
```

- acesso de escrita apenas service worker/admin.
- raw files reconstruiveis pela origem oficial; diffs/eventos GSBC nao reconstruiveis devem ser preservados no banco/backup.

## 12. Worker/Scheduler Analysis

Mecanismos existentes:

- Vercel Cron em `vercel.json`.
- Route Handlers protegidos por `CRON_SECRET`.
- Jobs server-side com service role.
- Nao ha queue dedicada ou worker persistente identificado.

Adequacao por etapa:

| Etapa | Mecanismo recomendado |
|---|---|
| DISCOVER | Vercel Cron diario pode orquestrar |
| PLAN | app/worker leve com manifest deterministico |
| DOWNLOAD | worker dedicado ou job com storage streaming; nao function curta |
| VERIFY | worker dedicado |
| EXTRACT | worker dedicado; evitar memory load |
| LOAD | `COPY`/bulk load, preferencialmente fora do request lifecycle |
| VALIDATE | SQL + worker |
| NORMALIZE | SQL/bulk |
| INDEX | banco, janela controlada |
| DIFF | SQL batch/worker |
| PUBLISH | transacao curta/controlada |
| REPORT | cron/app |

Conclusao: Vercel Cron serve para agenda/orquestracao, nao para ingestao massiva completa.

## 13. Receita Federal Source Analysis

Origem especificada:

`https://arquivos.receitafederal.gov.br/index.php/s/YggdBLfdninEJX9`

Resultado desta execucao:

- `curl -I -L --max-time 20` falhou com `Recv failure: Connection reset by peer`.
- Ferramenta web tambem nao retornou conteudo utilizavel.

Estado: **EXTERNAL VALIDATION REQUIRED**.

Nao foi comprovado nesta execucao:

- se existe listagem HTML estavel;
- se WebDAV esta disponivel;
- nomes atuais dos arquivos;
- headers uteis;
- checksum remoto;
- estrutura mensal;
- risco de publicacao parcial.

Requisito para RF-03: validar origem em ambiente com acesso estavel antes de automatizar discovery/download.

## 14. Dataset Discovery Strategy

Estrategia proposta:

1. Buscar listagem remota ou manifest se existir.
2. Normalizar nomes, tamanhos, datas e possiveis etags.
3. Gerar manifest deterministico local por dataset.
4. Verificar conjunto esperado de arquivos por entidade.
5. Bloquear dataset se arquivos faltarem, mudarem durante download ou tiverem tamanho/hash instavel.
6. Nunca assumir dia fixo de publicacao.
7. Manter idempotencia por `dataset_version + manifest_hash`.

Se a origem oficial nao oferecer checksum, calcular hash local e registrar tamanho/last-modified/etag quando disponiveis.

## 15. Ingestion Architecture Options

| Alternativa | Analise |
|---|---|
| A — PostgreSQL atual + schema dedicado | menor complexidade; risco de impacto no app; exige particionamento/backpressure/benchmark |
| B — PostgreSQL dedicado para RF-CNPJ | melhor isolamento; maior custo/operacao; exige sincronizacao/link com app |
| C — Storage + staging externo + PostgreSQL canonical | bom equilibrio; raw/extract fora do banco, canonical/indexado no banco; exige worker |
| D — Search engine externo | nao recomendado agora; falta benchmark que prove necessidade |

Recomendacao tecnica preliminar: **C evoluindo para A/B conforme benchmark**. Comecar com raw em storage dedicado, staging controlado e canonical no PostgreSQL com schema dedicado. Separar banco fisico se benchmark mostrar risco ao transacional.

## 16. Recommended Architecture

Recomendacao:

- Criar schemas dedicados `rf_raw` e `rf_canonical` ou prefixo equivalente se o projeto decidir manter apenas `public`.
- Dados RF sao globais, versionados e imutaveis por dataset.
- Dados derivados GSBC sao tenant-scoped e protegidos por RLS.
- Publicacao por swap logico de versao ativa.
- Rollback sem reingestao.
- `cnpj_canonical text` uppercase sem pontuacao como chave logica.
- Dado operacional nunca e sobrescrito por dado RF sem decisao humana/regra explicita.

## 17. Search Architecture

PostgreSQL e suficiente inicialmente para:

- busca exata por CNPJ com B-tree;
- filtros por CNAE, UF, municipio, situacao, porte, natureza juridica;
- combinacoes comuns se houver indices compostos/materialized views;
- razao social/nome fantasia com `unaccent`, trigram e/ou full-text apos benchmark.

OpenSearch/Elasticsearch:

- nao recomendado nesta RF-00;
- considerar apenas se benchmark com volume representativo falhar em PostgreSQL.

Risco: qualquer search que combine base RF global com dados GSBC tenant-scoped precisa aplicar autorizacao antes de retornar campos derivados.

## 18. Company 360 Gap Analysis

| Capacidade | Existe hoje? | Onde | Gap | Impacto |
|---|---|---|---|---|
| Ficha empresa | Parcial | `src/app/backoffice/empresas/[id]/page.tsx` | sem dataset version RF | medio |
| Matriz/filiais | Nao | nao identificado | sem estrutura empresarial RF | alto |
| CNAEs | Parcial | `empresas.cnae`, dossie oficial | sem secundarios normalizados | alto |
| QSA | Parcial | `dossies_cadastrais.dados_oficiais/qsa` | JSON snapshot, nao relacional/versionado | medio |
| Historico cadastral | Nao | nao identificado | sem diff RF mensal | alto |
| Enquadramento | Parcial | `empresas.enquadramento`, oportunidades/policies | nao ligado a RF versionado | alto |
| Obrigacoes | Sim parcial | `obrigacoes`, `cobrancas` | depende de empresa atual, nao RF | medio |
| Comunicacoes | Parcial | `notificacoes`, escalonamento, email | sem timeline unificada RF | medio |
| Financeiro | Parcial bom | revenue/reconciliation | mock PSP em alguns pontos | medio |
| Juridico | Parcial | escalonamento/documentos | nao RF-driven | medio |

## 19. Business Universe Gap Analysis

Capacidades atuais:

- busca de empresas/prospectos do proprio sistema;
- importacao de prospectos por planilha;
- oportunidade/revenue/operacoes em dados internos.

Ausente:

- pesquisa nacional da base RF;
- filtros por UF/municipio/CNAE/porte/capital/situacao em universo completo;
- segmentos salvos/dinamicos;
- comparacao RF vs carteira tenant em escala;
- exportacao auditada de alto volume;
- acoes em massa sobre universo empresarial.

Reutilizavel:

- design system/data table;
- operacoes/work items;
- policies/audit;
- revenue filters como inspiracao de drill-down;
- RLS patterns.

## 20. Diff Engine Strategy

Eventos alvo:

- `COMPANY_CREATED`, `ESTABLISHMENT_CREATED`, `ESTABLISHMENT_CLOSED`, `REGISTRATION_STATUS_CHANGED`, `MAIN_CNAE_CHANGED`, `SECONDARY_CNAE_CHANGED`, `ADDRESS_CHANGED`, `MUNICIPALITY_CHANGED`, `STATE_CHANGED`, `LEGAL_NAME_CHANGED`, `TRADE_NAME_CHANGED`, `SHARE_CAPITAL_CHANGED`, `COMPANY_SIZE_CHANGED`, `PARTNER_STRUCTURE_CHANGED`, `SIMPLES_STATUS_CHANGED`, `MEI_STATUS_CHANGED`.

Abordagem recomendada:

- hash por registro canonical relevante;
- comparar versao anterior ativa contra nova versao validada;
- gerar eventos consolidados append-only;
- nao atualizar enquadramento/obrigacao/cobranca automaticamente;
- alimentar fila de revisao/classificacao.

Custo:

- full diff nacional e caro; exigir particionamento/batch por entidade/UF/hash prefix;
- diff deve rodar fora do ciclo de deploy e fora de request user-facing.

## 21. Union Classification Integration

Arquitetura atual:

- `empresas.enquadramento` existe como campo textual.
- `oportunidades` e policy runtime suportam inferencia/governanca.
- Instrumentos/obrigacoes/cobrancas existem por tenant.

Regra:

- alteracao RF pode criar `reclassification_required`, mas nao pode alterar sindicato, instrumento, obrigacao ou cobranca automaticamente.

Necessario:

- tabela de link RF empresa/estabelecimento -> empresa GSBC;
- status `UNCLASSIFIED`, `AUTO_SUGGESTED`, `UNDER_REVIEW`, `CONFIRMED`, `CONTESTED`, `REJECTED`, `NEEDS_DATA`;
- auditoria de quem confirmou/rejeitou;
- policy gate antes de impacto financeiro/juridico.

## 22. LGPD & Security

Dados empresariais publicos nao eliminam obrigacoes de protecao.

Pontos atuais:

- contatos empresariais em `empresa_contatos`.
- documentos em storage privado e metadados em `documentos`.
- QSA hoje aparece como JSON/evidencias de dossie, nao modelo relacional.
- logs estruturados basicos existem.

Regras para RF-CNPJ:

- nao reconstruir CPF descaracterizado;
- QSA/representantes exigem minimizacao, finalidade e controle de acesso;
- enrichment externo, scraping e redes sociais ficam fora do RF-CNPJ inicial;
- exportacoes de alto volume precisam audit e permissao especifica;
- endpoints precisam rate limit e protecao contra enumeracao.

## 23. Observability

Existente:

- `src/lib/observability/events.ts` para structured logs.
- Phase 0 cobre alguns eventos de backup/webhook.
- Relatorios documentam ausencia de vendor externo/SLO dashboard.

Necessario para RF:

- dataset version ativa/disponivel;
- sync status/job state;
- download bytes e duracao;
- records/sec;
- linhas rejeitadas;
- validation failures;
- duracao de indexacao;
- publish/rollback;
- search latency;
- storage consumption;
- alertas para dataset novo, falha, volume anormal, sync atrasado.

## 24. CI/CD

COMPROVADO:

- scripts npm: `build`, `lint`, `test:e2e`, `test:phase0`, `check:phase0`, `check:revenue-core`.
- Vercel inferido por `vercel.json` e docs historicos.
- Supabase migrations versionadas.

NAO IDENTIFICADO:

- GitHub Actions/workflows locais.
- pipeline automatizado de migrations/prod.
- gate especifico RF.

Principio:

- deploy de codigo e ingestao de dataset devem ser processos independentes.
- migrations RF criam infraestrutura; ingestao/publish deve rodar por job controlado, nao durante deploy.

## 25. Backup & Disaster Recovery

Existente:

- backup logico local em `src/lib/backup/engine.ts`.
- cron `/api/cron/backup`.
- Phase 0 registra restore smoke proof local.

Classificacao:

- Raw RF: reconstruivel se fonte oficial permanecer disponivel e manifest/hash for preservado.
- Canonical RF ativo/anterior: reconstruivel a partir de raw + pipeline versionado.
- Diffs/eventos/classificacoes/links/decisoes GSBC: **nao reconstruiveis** a partir da Receita; exigem backup confiavel.

Gaps:

- PITR/producao nao comprovado nesta RF-00.
- RTO/RPO nao definidos.
- backup/restore com volume RF nao dimensionado.

## 26. Sizing

Numeros reais nao foram inventados nesta auditoria.

Metodologia:

```text
raw_compressed = soma(tamanho_zip_arquivos)
raw_extracted = soma(tamanho_csv_extraido)
staging = raw_extracted normalizado + overhead tipo/indices temporarios
canonical_data = linhas normalizadas por entidade * tamanho medio linha
indexes = canonical_data * fator_indice_medido
active_dataset = canonical_data + indexes
previous_dataset = active_dataset anterior
diff_history = eventos_mensais * tamanho medio evento * retencao
backup_overhead = active + previous + GSBC non-reconstructible + WAL/PITR
```

Dados ainda necessarios:

- lista oficial de arquivos e tamanhos;
- contagem real de empresas/estabelecimentos/socios/simples/referencias;
- tamanho medio pos-normalizacao;
- fator de indices por estrategia;
- plano Supabase/Vercel;
- politica de retencao.

## 27. Test Strategy

RF-01:

- unit: CNPJ numerico, CNPJ alfanumerico, canonicalizacao, formatacao, rejeicao de caracteres invalidos.
- E2E: criar/importar/visualizar CNPJ alfanumerico.

RF-02:

- SQL/RLS: roles autenticadas nao escrevem RF raw/canonical.
- SQL: uma unica versao ativa.
- SQL: constraints de status/job.

RF-03/RF-04:

- integration: storage, manifest, staging, bulk import, validate, publish, rollback.
- failure modes: arquivo faltando, zip corrompido, schema inesperado, volume anormal.

RF-05+:

- E2E: busca exata, CNAE, UF/municipio, Company 360, Universo Empresarial, vinculo ao tenant.
- Security: cross-tenant, service role, export, enumeracao.
- Performance: volume representativo, bulk ingestion, consultas, concorrencia.

## 28. Findings Register

| ID | Severidade | Area | Finding | Evidencia | Risco | Remediacao | Gate |
|---|---|---|---|---|---|---|---|
| RF00-P0-001 | P0 | CNPJ | Sistema remove/rejeita letras de CNPJ | `empresa.ts`, `sindicato.ts`, `promocao-prospecto.ts`, `prospecto.ts`, `brasil-api.ts`, `leadcnpj.ts` | CNPJ oficial alfanumerico invalido/mutilado | RF-01 helper unico e testes | RF-01 |
| RF00-P0-002 | P0 | Execucao | Master/artefato proibem implementacao antes da auditoria | secs. 2, 41 do artefato | migration/ETL prematura sem decisao humana | parar em RF-00 | Agora |
| RF00-P1-001 | P1 | Modelo RF | Nao existem schemas/tabelas RF versionadas | sem `rf_*` em migrations | sem provenance/rollback | RF-02 | antes RF-03 |
| RF00-P1-002 | P1 | Storage | Sem bucket/retencao RF | somente docs/backup buckets | sem reprocessamento auditavel | decidir storage | antes RF-03 |
| RF00-P1-003 | P1 | Workers | Cron atual nao prova ingestao massiva | `vercel.json`, ausencia de queue | timeouts/degradacao | worker dedicado/orquestracao | antes RF-03 |
| RF00-P1-004 | P1 | Origem RF | URL oficial nao validada nesta execucao | curl reset/web fetch sem conteudo | discovery fragil | validacao externa | antes RF-03 |
| RF00-P1-005 | P1 | Capacity | Sem sizing real | Supabase/Docker indisponivel; sem dados volume | custo/indisponibilidade | POC/benchmark | antes RF-03/prod |
| RF00-P1-006 | P1 | Service role | Uso amplo exige invariant por path | `src/lib/supabase/admin.ts`, STG report | bypass RLS | matriz e testes | RF-02/RF-03 |
| RF00-P1-007 | P1 | Search/export | Sem rate limit/export auditado | nao identificado | enumeracao/scraping | policy/rate limit | RF-05/RF-07 |
| RF00-P1-008 | P1 | Backup | PITR/restore gerenciado nao comprovado | Phase 0: restore logico smoke | perda de dados GSBC derivados | definir RPO/RTO/PITR | antes prod |
| RF00-P1-009 | P1 | Tests | Sem testes CNPJ alfanumerico | e2e numericos | regressao invisivel | unit/E2E RF-01 | RF-01 |
| RF00-P2-001 | P2 | UI | Placeholders/mascaras numericos | forms/tables | UX incorreta | atualizar copy/formatacao | RF-01 |
| RF00-P2-002 | P2 | Provider externo | BrasilAPI/LeadCNPJ podem nao suportar alfanumerico | clientes atuais | falso negativo | erro explicito/provider policy | RF-01 |
| RF00-P2-003 | P2 | Company 360 | Sem matriz/filiais/historico RF | page empresa atual | visao incompleta | RF-06 | RF-06 |
| RF00-P2-004 | P2 | Universo | Sem pesquisa nacional/segmentos | nao identificado | produto incompleto | RF-07 | RF-07 |
| RF00-P2-005 | P2 | Diff | Sem engine mensal | nao identificado | radar inexistente | RF-08 | RF-08 |
| RF00-P2-006 | P2 | Observability | Sem dashboard/alerta externo RF | `events.ts` baseline | baixa operabilidade | metricas/alertas | RF-04 |
| RF00-P2-007 | P2 | CI/CD | Sem workflow local identificado | find `.github` sem resultado | gate manual | definir release gate RF | RF-02 |
| RF00-P2-008 | P2 | LGPD | QSA relacional/governanca ausente | dossie JSON | risco privacy | policy QSA | RF-02/RF-06 |
| RF00-P2-009 | P2 | DB drift check | diff/list nao rodaram por ambiente | Docker/Postgres off | baseline atual nao comprovado localmente | rodar com Docker | antes migration |
| RF00-P3-001 | P3 | Docs | Relatorio anterior era resumido | arquivo substituido | baixa rastreabilidade | estrutura 34 secoes | concluido |
| RF00-P3-002 | P3 | Lint | Warning TanStack Table | `npm run lint` | ruido CI | avaliar depois | nao bloqueia |
| RF00-P3-003 | P3 | Fixtures | Seeds todos numericos | `e2e/*`, `seed.sql` | cobertura limitada | adicionar alfanumerico | RF-01 |
| RF00-P3-004 | P3 | Naming | Nomenclatura RF futura ainda nao final | plano preliminar | churn menor | ADR final | RF-02 |

## 29. Risk Register

| Risco | Probabilidade | Impacto | Mitigacao | Owner sugerido |
|---|---|---|---|---|
| Volume maior que banco atual suporta | Media | Alto | POC + benchmark + possivel DB dedicado | Principal Architect |
| Custo storage/index alto | Media | Alto | sizing e retencao | Tech Lead/Finance |
| Degradacao do app durante ingestao | Media | Alto | worker isolado/backpressure | Reliability |
| Schema upstream muda | Alta | Medio | parser versionado/gates | Data Engineer |
| Origem indisponivel ou sem checksum | Media | Alto | manifest/hash local/retry | Data Engineer |
| Arquivo parcialmente publicado | Media | Alto | estabilidade de size/hash antes download | Data Engineer |
| CNPJ alfanumerico quebra fluxos | Alta | Alto | RF-01 | Full-stack |
| Tenant leakage em dados derivados | Media | Critico | RLS/testes adversariais | Security |
| Service role mal usado | Media | Critico | matriz, assertions, tests | Security |
| Backup nao cobre derivados | Media | Alto | PITR/restore drill | SRE |
| Scheduler insuficiente | Media | Alto | worker dedicado | Platform |
| Diff caro demais | Media | Medio | hashes/batch/partition | Data Engineer |

## 30. Architectural Decisions Proposed

### ADR-RF-001

Questao: onde residem dados RF?

Alternativas: schema no banco atual; banco dedicado; storage+canonical hibrido.

Evidencia: app transacional ja usa Supabase; nao ha sizing; ingestao massiva pode degradar.

Recomendacao: storage dedicado + canonical em schema dedicado, com possibilidade de DB separado apos benchmark.

Trade-offs: menor complexidade inicial versus risco de carga no transacional.

Decisao pendente: infraestrutura real e POC.

### ADR-RF-002

Questao: CNPJ canonico.

Alternativas: manter mascara; armazenar digits-only; armazenar alfanumerico sem pontuacao uppercase.

Evidencia: Receita introduziu formato alfanumerico; codigo atual remove letras.

Recomendacao: `cnpj_canonical text` uppercase sem pontuacao; display separado.

Decisao pendente: RF-01.

### ADR-RF-003

Questao: search externo.

Alternativas: PostgreSQL indices; OpenSearch/Elasticsearch.

Evidencia: sem benchmark de falha em PostgreSQL.

Recomendacao: PostgreSQL primeiro; search engine externo apenas com evidencia.

Decisao pendente: benchmark RF-05.

### ADR-RF-004

Questao: publicacao/rollback.

Alternativas: update in-place; versionamento imutavel + active flag.

Evidencia: Master Spec exige rollback sem reingestao.

Recomendacao: versoes imutaveis e swap logico.

Decisao pendente: desenho SQL RF-02/RF-04.

## 31. Migration Plan

Nao criar migration nesta fase.

Ordem preliminar respeitando o padrao real `0043_*`:

1. `0043_rf_cnpj_dataset_infrastructure.sql`: schemas, dataset versions, files, jobs, quality checks, grants base.
2. `0044_rf_cnpj_canonical_registry.sql`: empresas, estabelecimentos, socios, simples e referencias.
3. `0045_rf_cnpj_publication_controls.sql`: active version, locks, publish/rollback.
4. `0046_rf_cnpj_company_linkage.sql`: link com `empresas`, match status e provenance.
5. `0047_rf_cnpj_change_events.sql`: diff events e fila de reavaliacao.
6. `0048_rf_cnpj_search_indexes.sql`: indices validados por benchmark.
7. `0049_rf_cnpj_export_audit_and_rate_limits.sql`: export/rate controls se necessario.

## 32. Technical Roadmap

Sequencia confirmada:

1. RF-01 — CNPJ Alphanumeric Readiness.
2. RF-02 — Data Model.
3. RF-03 — Ingestion Pipeline.
4. RF-04 — Dataset Publication.
5. RF-05 — Search API.
6. RF-06 — Company 360.
7. RF-07 — Universo Empresarial.
8. RF-08 — Diff Engine.
9. RF-09 — Union Classification Integration.

Nao alterar ordem sem nova decisao, exceto POC tecnico controlado antes de RF-03.

## 33. Preconditions for RF-01

RF-01 pode iniciar quando houver autorizacao humana explicita.

Escopo RF-01 recomendado:

- criar helper unico de canonicalizacao/formatacao;
- atualizar validacoes de empresa/sindicato/prospecto/promocao;
- remover `replace(/\D/g, "")` de CNPJ;
- atualizar mensagens de "digitos" para "caracteres";
- tratar BrasilAPI/LeadCNPJ como providers possivelmente legados;
- adicionar unit/E2E para alfanumerico;
- nao criar ingestion RF.

Precondicoes antes da primeira migration RF-02:

- rodar `npx supabase migration list --local` com Docker/Postgres ativos;
- rodar `npx supabase db diff --local --schema public,storage --use-migra`;
- confirmar que RF-01 deixou P0=0;
- aprovar storage/worker/sizing minimo.

## 34. Gate Decision

**GO WITH CONDITIONS**

Condicoes:

- P0 de CNPJ alfanumerico deve ser resolvido em RF-01.
- Nenhuma ingestion/migration RF deve iniciar antes de RF-01 e da aprovacao humana do modelo RF-02.
- Origem oficial da Receita deve ser validada externamente em ambiente com acesso estavel.
- Docker/Supabase local devem estar ativos para validar migration list e drift antes de criar `0043`.
- Storage/retencao/worker/sizing devem ser decididos antes de RF-03.
- Service role e RLS precisam de testes adversariais especificos para dados RF derivados.

Next authorized phase: **RF-01**

No production code changed.

No migration applied.

No commit performed.

No push performed.
