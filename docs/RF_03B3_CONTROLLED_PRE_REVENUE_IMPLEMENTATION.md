# RF-03B.3 — Controlled Pre-Revenue Implementation

**Data:** 2026-09-18  
**Modo:** MODE A / zero incremental cost  
**Status:** IMPLEMENTATION COMPLETE — AWAITING REVIEW  
**Commit/push:** não realizados

## Executive Summary

Foi implementada a integração de leitura entre o dataset RF controlado e os workspaces existentes de Prospecto e Empresa. A aplicação agora consulta o snapshot RF publicado por CNPJ exato, exibe fonte, versão, competência e freshness, diferencia ausência no recorte de inexistência oficial e mantém a promoção Prospecto → Empresa explícita.

Não houve ingestão, provisioning, contratação, upgrade ou escrita cloud. A ponte de leitura usa um RPC `security invoker`, disponível somente a `authenticated`, sobre o schema canônico global e read-only. O dado RF não determina enquadramento sindical, obrigação, cobrança ou conclusão jurídica.

O gate proposto é **CONDITIONAL**. O código, SQL isolado, build e 50 testes Node RF passaram, mas o limite provisionado do banco cloud permanece **UNKNOWN**, nenhuma carga real cloud foi autorizada e o reset local do Supabase falhou antes das migrations do projeto por incompatibilidade interna da imagem atual. Por isso, o E2E autenticado completo e as 14 verificações transacionais não foram repetidos após a alteração.

## Entry Gates

- RF-03B.2B: **PASS — ZERO-INCREMENTAL-COST ARCHITECTURE APPROVED**.
- Custo incremental autorizado: **USD 0 (DECISION)**.
- National Production: diferida.
- Cloud write: bloqueada enquanto capacidade/headroom forem desconhecidos.
- Processo Git: working tree sem commit e sem push.

## Repository Baseline

- Branch/HEAD de entrada: `340af91` (`fix(rf-controlled): close TOCTOU race...`) **MEASURED**.
- Baseline antes da edição: RF Controlled 9/9, RF transactional 14/14, RF POC 12/12, lifecycle 9/9, source probe 14/14, typecheck PASS e lint sem erros **MEASURED**.
- Três diretórios `rf-source-evidence*` já estavam untracked e não foram alterados.

## MODE A Inventory

- Parser/download/manifest/quality gates: `scripts/rf-poc/`.
- Source discovery hardening: `scripts/rf-source-probe/`.
- Versioning/publication/rollback model: `scripts/rf-lifecycle/`.
- Controlled selection, capacity gate, package, cleanup e lock: `scripts/rf-controlled/`.
- Canonical DB model: migrations `0043`–`0046`.
- Product integration: RPC `0047`, `src/lib/rf/` e `RfIntelligencePanel`.

## Controlled Dataset

O recorte permanece real, determinístico, versionado e limitado a 50.000 registros por package. Seletores explícitos e manifest são obrigatórios. Não existe comando de ingestão nacional na aplicação. A implementação de produto apenas lê uma versão `PUBLISHED/is_current=true`.

## Capacity & Headroom

- Relações RF cloud: aproximadamente **632 KiB (MEASURED em RF-03B.2B)**; aproximadamente **696 KiB** incluindo `rf_company_links`.
- Limite provisionado cloud: **UNKNOWN**.
- Headroom cloud seguro: **UNKNOWN / DERIVED**.
- Guardrail vigente: reserva mínima de 30%; RF limitada ao menor entre 10% da capacidade e 500 MiB; projeção total máxima de 70% **DECISION**.
- Resultado: `CONTROLLED DATASET EXPANSION: PAUSED`. Nenhuma carga foi realizada.

## Architecture Implemented

`public.rf_controlled_company_lookup(text)` fornece uma projeção read-only do dataset corrente, estabelecimento, empresa raiz e Simples/MEI. O RPC é `stable`, `security invoker`, revogado de `public`/`anon` e concedido a `authenticated`. O schema `rf_canonical` continua global; nenhuma relação operacional de tenant é retornada.

O serviço server-side valida CNPJ antes da consulta e converte o snapshot nos estados explícitos da UI. Prospecto e Empresa reutilizam a mesma apresentação, evitando semânticas divergentes.

## CNPJ

O caminho usa `parseCnpj`, preserva uppercase alfanumérico e nunca converte o identificador para número. Teste de regressão cobre root `12ABC345`. O RPC recebe o canonical de 14 caracteres validado na camada de aplicação.

## Provenance

O resultado conserva `source`, `dataset_version`, `competence_month`, `manifest_hash`, `published_at` e timestamps canônicos disponíveis. A UI identifica a fonte como Receita Federal e descreve o resultado como snapshot, não como consulta em tempo real. Enrichment externo e decisões humanas permanecem separados.

## Freshness

Freshness é `CURRENT` até 62 dias desde a competência, `STALE` acima disso e `UNKNOWN` para data ausente, inválida ou futura. Os três estados possuem regressão determinística. A referência exibida vem do dataset, não do horário da página.

## Search

O fluxo de produto implementado nesta rodada é busca por CNPJ exato, suficiente para os workspaces de Prospecto e Empresa. Estados:

- `FOUND`
- `NOT_IN_CONTROLLED_DATASET`
- `NOT_FOUND_IN_LOADED_RF_VERSION`
- `INVALID_QUERY`
- `DATASET_UNAVAILABLE`

`NOT_IN_CONTROLLED_DATASET` informa expressamente que o resultado não significa inexistência na Receita. Razão social, CNAE, UF/município, Simples e MEI continuam validados no tooling transacional, mas ainda não receberam tela de busca livre.

## Prospect Integration

O detalhe do Prospecto consulta RF pelo `cnpj_consultado` e apresenta evidência oficial, disponibilidade, versão e freshness antes da seção de oportunidade. O lookup não altera o dossiê, score, tenant ou status e não promove automaticamente.

## Promotion

O fluxo já existente continua explícito, Owner-only, auditado e protegido contra Empresa duplicada. Nenhuma lógica de promoção foi alterada. Testes autenticados de promoção duplicada, concorrente, sem permissão e tenant incorreto não foram repetidos após esta alteração devido ao blocker do reset local.

## Company Intelligence

O workspace de Empresa exibe razão social RF, nome fantasia, matriz/filial, situação cadastral, CNAE principal, localidade, Simples e MEI quando presentes. O painel inclui aviso de que esses dados não constituem enquadramento, obrigação ou conclusão jurídica.

## Tenant Isolation

RF canônico permanece global e read-only. O RPC não consulta nem retorna `tenant_id`, Empresa GSBC, Prospecto, vínculo RF ou qualquer contexto operacional. A página de Empresa continua protegida pela query/RLS existente e o detalhe de Prospecto continua Owner-only. O negative test de RLS anterior passou; não foi repetido depois do reset local bloqueado.

## Locks

O lock local por dataset/version, heartbeat, TTL, ownership e stale-reclaim mutex permanece inalterado. Regressões de concorrência e recuperação passaram no conjunto de 15 testes RF Controlled.

## Idempotency

Lookup é read-only e `stable`. Curated package, hashes, seleção e lifecycle continuam determinísticos. A migration usa `create or replace function` e grants explícitos. Nenhuma promoção ou import é acionado pela consulta.

## Manifest

O manifest controlado vigente registra versão, fonte, referência, SHA-256, parser, política, row count e hashes. A classificação `NOT_FOUND_IN_LOADED_RF_VERSION` só é usada quando o metadata do dataset declara que o CNPJ/root pertence ao recorte; sem essa evidência, a resposta é `NOT_IN_CONTROLLED_DATASET`.

## Drift

Os parsers continuam fail-closed para formato incompatível, checksum, arquivo e versão. A camada de produto lê apenas campos canônicos versionados. Alteração incompatível de payload exigirá atualização coordenada do tipo e RPC.

## Publication

A aplicação observa apenas `PUBLISHED/is_current=true`; versões intermediárias não são consultadas. A função resolve a versão e seus registros em uma única statement SQL, evitando mistura entre versões durante a leitura.

## Rollback

Rollback MODE A permanece por troca do ponteiro de versão publicada no lifecycle. O RPC acompanha automaticamente a versão corrente. A validação SQL desta rodada foi executada em transação com rollback e confirmou zero resíduo. Isso não equivale a rollback nacional production-grade.

## Cleanup

O teste SQL criou schema/tabelas sintéticos apenas dentro de uma transação, validou lookup e privilégios e executou `ROLLBACK`; `to_regprocedure(...) is null = true` confirmou zero resíduo da função. Os diretórios de evidência preexistentes foram preservados. Nenhum package, lock ou dataset novo foi criado.

## Security

- `anon`: sem `EXECUTE` no RPC **MEASURED**.
- `authenticated`: com `EXECUTE` **MEASURED**.
- Função `security invoker`: respeita grants/RLS do chamador.
- Sem service role, secret, browser credential ou bypass novo.
- Sem escrita ou vínculo tenant no lookup.
- Validação de CNPJ ocorre antes do acesso.

## Performance

O RPC usa os índices existentes de `is_current`, `dataset_version_id`, `cnpj_canonical` e `cnpj_root`. O benchmark anterior mediu buscas indexadas sub-10 ms no recorte real **MEASURED em RF-03B.2A**. Não foi feita nova medição cloud e nenhum resultado é extrapolado para escala nacional.

## Tests

| Verificação | Resultado |
|---|---|
| `npm run test:rf-controlled` | PASS — 15/15 |
| `npm run test:rf-poc` | PASS — 12/12 |
| `npm run test:rf-lifecycle` | PASS — 9/9 |
| `npm run test:rf-source-probe` | PASS — 14/14 |
| Total Node RF | PASS — 50/50 |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS com 1 warning preexistente em `data-table.tsx` |
| `npm run build` | PASS — 41 páginas |
| RPC SQL transacional | PASS — lookup, grants e rollback |
| `git diff --check` | PASS |
| `npm run test:rf-controlled-db` pós-mudança | FAIL (environment) — schema RF ausente após reset local bloqueado |
| Playwright E2E autenticado | NOT RUN — stack local sem schema da aplicação após reset bloqueado |

O `supabase db reset` falhou em bootstrap interno com duplicate key `schema_migrations_pkey` para `20250926223044`. `supabase migration up` chegou à `0004` e falhou porque a imagem atual de `auth.users` não possui `email_confirmed_at`. Como consequência esperada, `test:rf-controlled-db` falhou por ausência de `rf_canonical.rf_dataset_versions`. São blockers ambientais anteriores à migration `0047`; nenhum metadado interno foi adulterado para contorná-los.

## Failure Modes

- Capacidade insuficiente/desconhecida: fail-closed antes de escrita, PASS nos testes existentes.
- Manifest inválido/source drift/CNPJ malformado: fail-closed, PASS.
- Duplicate run/stale lock/abandoned mutex: PASS.
- Dataset ausente/freshness stale ou unknown/ausência fora do recorte: PASS.
- Publicação/rollback/cleanup: PASS nos testes lifecycle e SQL isolado.
- Promoção concorrente/tenant unauthorized após mudança: NOT RUN; lógica não alterada, risco residual documentado.

## Pilot Readiness

**NOT READY FOR CONTROLLED PILOT.** O produto está preparado para ler um recorte publicado, mas ainda não há capacidade cloud conhecida nem carga real autorizada. Antes de piloto: medir limite provisionado, total DB, RF atual, delta estimado; executar gate; carregar package aprovado de forma transacional; repetir RLS/E2E; confirmar restore/rollback e operadores autorizados.

## Risk Register

| Risco | Prob. | Impacto | Detecção | Mitigação | Residual |
|---|---|---|---|---|---|
| Crescimento do recorte | M | H | métricas/package | limite 50k + capacity gate | L-M |
| Dado stale | M | H | badge/competência | freshness explícita + stop threshold | L |
| Source/schema drift | M | H | parser/hash/typecheck | hard stop e versão | L-M |
| Execução duplicada | L | H | lock/heartbeat | mutex e ownership | L |
| Vazamento tenant | L | Critical | RLS negative tests | RF global sem joins operacionais | L, E2E pendente |
| Exaustão de capacidade | H enquanto UNKNOWN | H | capacity preflight | STOP EXPANSION | L sem carga |
| Dependência local | M | M | falha de runner | execução reproduzível/documentada | M |
| Cleanup incompleto | L | H | verificação direta | cleanup idempotente/rollback | L |
| Scope creep de piloto | M | H | policy/max rows | aprovação Owner | L-M |
| Ausência interpretada como inexistência | M | H | estados/UI | mensagem explícita | L |
| Expansão nacional acidental | L | Critical | ausência de comando/gate | MODE B diferido | L |

## Decision Log

| Decision | Alternatives | Evidence | Reason | Trade-off | Revisit trigger |
|---|---|---|---|---|---|
| RPC read-only público/autenticado | expor schema; service role | grants/RLS e SQL testado | menor superfície e nenhum secret | projeção específica | necessidade de busca avançada |
| Busca exata nos workspaces | tela global completa | fluxo atual parte de CNPJ | entrega integração mínima segura | filtros livres adiados | piloto pedir discovery |
| Classificação por metadata do recorte | tratar todo miss como inexistente | requisito normativo | evita falso negativo oficial | metadata obrigatória para estado preciso | novo formato de manifest |
| Gate CONDITIONAL | PASS; FAIL | código verde, capacity/E2E pendentes | não liberar piloto sem evidência | revisão adicional | capacity e E2E disponíveis |

## Deferred National Production

**National Production Ingestion: DEFERRED — BUDGET GATE REQUIRED**

## Next Owner Decision

Autorizar somente a medição de capacidade e a preparação de um package real controlado, sem carga, para revisão. A importação cloud continua bloqueada até o capacity gate e o review do working tree.

## Final Gates

**RF-03B.3 Gate: CONDITIONAL — CONTROLLED PRE-REVENUE RF INTEGRATION REQUIRES OPEN ITEMS**

**RF-03B.4 Readiness: BLOCKED — CAPACITY EVIDENCE REQUIRED** (authenticated E2E/RLS blocker resolved by Claude review below; real cloud provisioned-capacity evidence remains the only open item)

**National Production Ingestion: DEFERRED — BUDGET GATE REQUIRED**

## Claude Adversarial Review — 2026-09-18

Independent review of migration `0047`, `src/lib/rf/`, `src/components/rf/rf-intelligence-panel.tsx` and the two page integrations, per explicit owner instruction not to trust green tests alone. This review did not stop at static analysis: it fixed the local environment blocker the report flagged, then directly exercised the real RLS/grant behavior and the real UI end-to-end.

**Environment blocker root-caused and fixed (not just re-described):** the local stack's `auth`/`storage` containers had not re-bootstrapped their internal schemas after an earlier `db reset` recreated the Postgres data volume out from under them (DB container recently recreated; `auth`/`storage` containers still running from before, so GoTrue/Storage's own one-time internal migrations never re-ran). Restarted both containers to force re-bootstrap, confirmed `auth.users.email_confirmed_at` and `storage.buckets` now exist, then ran `supabase migration up` cleanly through `0047` — proving the new migration applies without conflict on a fully-migrated stack. Applied `supabase/seed.sql` directly (no destructive reset needed).

**Re-ran everything the report could not:**
- `test:rf-controlled-db`: 14/14 assertions PASS (previously blocked by the missing schema).
- `e2e/prospectos.spec.ts` + `e2e/promocao-prospecto.spec.ts`: 3/3 PASS, including the full Owner promotion flow, which exercises the Prospecto detail page with `RfIntelligencePanel` now embedded — the addition does not break the existing flow.
- Logged into the real running app as the seeded Owner and opened two real Empresa detail pages in-browser. No console errors on either page.

**Real bug initially suspected, then correctly attributed — worth recording precisely:**
1. My first direct SQL call to the RPC (`set local role authenticated` with no JWT claims) returned an empty result despite matching fixture rows. Traced to `auth.role()` in the RLS policies reading `request.jwt.claims`, which plain `SET ROLE` does not populate — not a bug, a gap in my own first test. Re-tested with `set_config('request.jwt.claims', ...)` matching the pattern PostgREST actually sets on a real request, and the RPC returned fully correct data with tenant isolation confirmed (`tenant_id` never present in the payload, verified programmatically).
2. In-browser, the Empresa page for the seeded company `11.222.333/0001-44` showed "Consulta inválida" in the RF panel. Traced directly with `parseCnpj` in isolation: that CNPJ genuinely fails check-digit validation, and so does the other seeded demo company's CNPJ (`22.333.444/0001-55`). Confirmed via `git log` that `supabase/seed.sql` was last touched in the project's initial commit, entirely unrelated to this round — these are long-standing fictitious placeholder CNPJs, and the RF panel is the first feature to ever validate them at read time. This is correct, intentional fail-closed behavior surfacing a pre-existing seed-data characteristic, not a defect in this round's code. Confirmed the positive path separately: the seeded alphanumeric E2E CNPJ (`A4.E92.D77/6100-09`, which does pass check-digit validation) correctly resolved to `DATASET_UNAVAILABLE` in the panel, since no RF dataset is actually published in this environment.
3. Writing a permanent SQL regression test (below) for this RPC, a `v_result -> 'establishment' is not null` assertion fired even though `raise notice` showed the value was genuinely absent. This is the classic PostgreSQL JSONB gotcha: `jsonb_build_object('establishment', NULL)` serializes the SQL NULL as the JSON scalar `null`, and `->` then returns the non-NULL jsonb value `'null'::jsonb` — `IS NOT NULL` never fires on it. Fixed the test to check `jsonb_typeof(...) = 'null'`. The real TypeScript consumer is unaffected: `JSON.parse` maps JSON `null` to JS `null` directly, with none of this ambiguity — confirmed by reading `intelligence.ts`, which treats `payload.establishment` as `null` exactly as intended.

**New permanent regression test added:** `supabase/tests/rf03b3_controlled_lookup.sql`, following the project's established adversarial-SQL-test convention (`rf02_data_model.sql`, `rf02b_privilege_hardening.sql`). Proves, against real seeded fixture data in a rolled-back transaction: `anon` denied at the grant level (`insufficient_privilege`); `authenticated` with a real simulated JWT succeeds; the function resolves only the `PUBLISHED`/`is_current` dataset version even when a `RETIRED` version exists with an establishment sharing the same CNPJ; no `tenant_id` key ever appears in the payload; a CNPJ absent from the loaded dataset returns dataset context but no establishment; and zero residue survives the rollback (verified both inline and via an explicit standalone existence check after `rollback`).

**Categories checked with no defect found:** SQL injection (parameterized function argument, never interpolated), tenant isolation (RPC never references `tenant_id`, `public.empresas`, `public.prospectos` or any tenant table; confirmed programmatically in the new test), authorization ordering on both pages (`requireCurrentUser`/`isOwner`/existing RLS-gated fetch always happens before the RF lookup, confirmed by reading the page source directly), TypeScript-interface-to-database-column drift (every field name in `semantics.ts` cross-checked against migration `0044`'s actual column definitions — exact match), dataset-version scoping (the `simples` CTE independently re-joins `current_dataset`, not just chained through `establishment`, preventing a stale-version leak — confirmed by the new RETIRED-version test case).

**Residual risks (unchanged from the report, not resolved by this review):** real cloud provisioned-capacity/headroom remains `UNKNOWN` — this review only exercised the local stack; production-worker Receita reachability remains unproven; QSA density unbenchmarked. None of these are newly introduced by this round.

Re-verified after this review: `test:rf-controlled` 15/15, `test:rf-controlled-db` 14/14, `test:rf-poc` 12/12, `test:rf-lifecycle` 9/9, `test:rf-source-probe` 14/14 (64 Node tests total), new `supabase/tests/rf03b3_controlled_lookup.sql` PASS (exit 0, zero residue independently confirmed via direct query), `tsc --noEmit` clean, `eslint` zero errors (one pre-existing unrelated warning), `npm run build` PASS (41 pages), `e2e/prospectos.spec.ts` + `e2e/promocao-prospecto.spec.ts` 3/3 PASS, manual in-browser verification with no console errors. No cloud write, national ingestion, provisioning, purchase or billing change was performed. Commit remains local only, per the review-before-push gate.
