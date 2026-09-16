# RF-02B Privilege Hardening Report

Data: 2026-09-16

## 1. Executive Summary

RF-02B reproduziu e corrigiu localmente o finding `RF02A-SEC-001`. A migration `0046_rf_privilege_hardening.sql` remove acesso anonimo de `public.rf_company_links`, restringe os helpers `rf02_*` a `service_role`, elimina privilegios estruturais herdados por `authenticated`, concede acesso explicito ao pipeline privilegiado e endurece default privileges para objetos futuros criados por `postgres`.

A causa raiz foi confirmada no catalogo PostgreSQL: default ACLs do projeto Supabase no schema `public` concediam `ALL` em tabelas e `EXECUTE` em funcoes a `anon`, `authenticated` e `service_role`. A migration RF-02 concedeu apenas os privilegios desejados sem antes revogar os herdados. Para funcoes, o default global PostgreSQL de `EXECUTE TO PUBLIC` tambem precisava ser removido; uma revogacao apenas por schema nao o neutraliza.

Rebuild, testes de grants/RLS/default privileges, RF-02, tenant isolation, service role, CNPJ, typecheck, lint e smoke E2E passaram localmente. Nenhuma acao Git ou remota foi executada.

Gate: **GO FOR RELEASE REVIEW**.

Security finding: **REMEDIATED LOCALLY / PENDING RELEASE**.

RF-03: **NOT READY**. Alem do release produtivo da RF-02B, permanecem as precondicoes RF de storage, worker, sizing, backup, types e documento mestre canonico.

## 2. Entry Baseline

Baseline observado antes das alteracoes:

- branch: `main`;
- HEAD e `origin/main`: `7e425aa316491c90e7745279c8951e9f424992ec`;
- working tree: limpo;
- local migrations: `0001`-`0045`;
- remote migrations: `0001`-`0045`;
- Supabase remoto: projeto `GBSC`, ref `zjtuvsgigymgludplghd`;
- RF-02A report presente e commitado em `7e425aa`;
- producao sem `0046`;
- Master Spec ainda ausente do caminho canonico `docs/RF_CNPJ_DATA_INTELLIGENCE_MASTER_SPEC.md`.

Nao houve divergencia de baseline que exigisse parada.

## 3. Finding Reproduction

Estado local e remoto equivalente antes de `0046`:

`public.rf_company_links`:

```text
postgres=arwdDxtm
anon=arwdDxtm
authenticated=arwdDxtm
service_role=arwdDxtm
```

Os flags significam que as roles herdaram inclusive `TRUNCATE`, `REFERENCES` e `TRIGGER`, alem de CRUD.

Helpers:

```text
rf02_get_current_dataset_count:
PUBLIC=EXECUTE, anon=EXECUTE, authenticated=EXECUTE, service_role=EXECUTE

rf02_verify_cnpj_roundtrip:
PUBLIC=EXECUTE, anon=EXECUTE, authenticated=EXECUTE, service_role=EXECUTE
```

Comportamento anonimo reproduzido:

- `SELECT` no link retornava zero linhas por RLS, em vez de falhar no privilege boundary;
- `INSERT` falhava pela policy RLS;
- ambos os helpers eram executaveis por `anon`;
- nenhum dado empresarial foi exposto pelos helpers.

O finding era defense-in-depth real, mesmo sem exploit de dados observado.

## 4. Root Cause

Root cause: **IDENTIFIED**.

1. Migrations criam objetos como owner `postgres`.
2. Default ACL de `postgres` no schema `public` concedia `ALL` em novas tabelas a `anon`, `authenticated` e `service_role`.
3. Default ACL de funcoes concedia `EXECUTE` a essas roles.
4. PostgreSQL tambem possui default global de `EXECUTE TO PUBLIC` para funcoes.
5. A migration `0045` executou grants explicitos, mas nao revogou grants herdados.
6. `GRANT SELECT, INSERT, UPDATE, DELETE` nao reduz uma ACL `ALL` ja existente.
7. RLS conteve o impacto em `rf_company_links`, mas nao corrige a camada de privilegios.

Nao houve evidencia de migration ordering incorreta nem de policy RLS defeituosa.

## 5. Current Privilege Matrix

Matriz anterior a `0046`:

| Object | anon | authenticated | service_role | platform staff |
|---|---|---|---|---|
| RF raw | NONE | NONE | sem grant explicito RF | NONE |
| RF canonical public data | NONE | SELECT | sem grant explicito RF | SELECT |
| RF operational metadata | NONE | grant SELECT, bloqueado por RLS | sem grant explicito RF | SELECT |
| `rf_company_links` | ALL no grant layer; RLS bloqueia | ALL no grant layer; tenant read/staff write via RLS | ALL | CRUD via authenticated + RLS |
| `rf02_*` | EXECUTE | EXECUTE | EXECUTE | EXECUTE |

## 6. Target Privilege Matrix

Matriz local apos `0046`:

| Object | anon | authenticated comum | service_role | platform staff |
|---|---|---|---|---|
| RF raw | NONE | NONE | ALL table privileges | NONE |
| RF canonical public data | NONE | SELECT | ALL table privileges | SELECT |
| RF operational metadata | NONE | grant SELECT, RLS nega | ALL table privileges | SELECT |
| `rf_company_links` | NONE | tenant-scoped SELECT efetivo | SELECT/INSERT/UPDATE/DELETE | SELECT/INSERT/UPDATE/DELETE via RLS |
| `rf02_*` | NONE | NONE | EXECUTE | NONE |

Nota: `authenticated` conserva CRUD no grant layer de `rf_company_links` porque platform staff tambem usa essa database role. RLS diferencia usuario comum de staff. Privilegios estruturais `TRUNCATE`, `REFERENCES` e `TRIGGER` foram removidos de `authenticated`.

## 7. Migration Created

Migration:

`supabase/migrations/0046_rf_privilege_hardening.sql`

Escopo:

- ACL atual de `public.rf_company_links`;
- ACL atual dos dois helpers `rf02_*`;
- grants atuais de `service_role` em `rf_raw` e `rf_canonical`;
- default privileges de owner `postgres` em `public`, `rf_raw` e `rf_canonical`.

Nao altera:

- colunas;
- constraints;
- dados;
- policies;
- RLS;
- tabelas core;
- logica de negocio;
- aplicacao.

## 8. Grants Changed

`public.rf_company_links`:

- `anon`: `ALL -> NONE`;
- `authenticated`: `ALL -> SELECT, INSERT, UPDATE, DELETE`;
- `service_role`: `ALL -> SELECT, INSERT, UPDATE, DELETE`;
- `PUBLIC`: explicitamente revogado.

Helpers `rf02_*`:

- `PUBLIC`: `EXECUTE -> NONE`;
- `anon`: `EXECUTE -> NONE`;
- `authenticated`: `EXECUTE -> NONE`;
- `service_role`: `EXECUTE` preservado explicitamente.

Schemas RF:

- `service_role`: `USAGE` explicito em `rf_raw` e `rf_canonical`;
- `service_role`: `ALL` nas tabelas atuais dos dois schemas;
- `anon/authenticated`: raw permanece sem acesso;
- `authenticated`: SELECT canonical existente permanece.

## 9. Default Privileges Review

Owner relevante: `postgres`, confirmado por `relowner` e `proowner`.

Mudancas para objetos futuros:

- `public` tables/sequences: remove defaults de `anon` e `authenticated`;
- funcoes criadas por `postgres`: remove default global `EXECUTE TO PUBLIC`;
- `public` functions: remove defaults diretos de `anon` e `authenticated`;
- `rf_raw` e `rf_canonical`: remove user-facing table/sequence/function defaults;
- `rf_raw` e `rf_canonical`: concede defaults privilegiados a `service_role`.

Impacto deliberado:

- migrations futuras precisam declarar acesso de usuario explicitamente;
- objetos atuais fora do RF nao sao alterados;
- defaults de outros owners, incluindo `supabase_admin`, nao foram alterados;
- migrations do repositorio usam `postgres`, portanto o owner coberto corresponde ao path real;
- objetos criados manualmente por outro owner permanecem fora deste controle e sao risco operacional documentado.

A revogacao global de `EXECUTE TO PUBLIC` foi necessaria porque defaults por schema nao conseguem negar o default global PostgreSQL. Grants explicitos existentes e objetos existentes nao sao retroativamente alterados.

Status: **PASS**.

## 10. SECURITY DEFINER Review

Funcoes:

- `public.rf02_verify_cnpj_roundtrip(text)`;
- `public.rf02_get_current_dataset_count()`.

Confirmado:

- owner `postgres`;
- `SECURITY DEFINER`;
- volatilidade `STABLE`;
- `search_path` explicito;
- sem SQL dinamico;
- sem escrita;
- sem argumento de identidade/tenant;
- sem acesso a dado empresarial no roundtrip;
- contador retorna somente metadado agregado;
- `PUBLIC`, `anon` e `authenticated` sem execute;
- `service_role` com execute.

Status: **PASS**.

## 11. RLS Verification

A migration nao altera policies nem flags RLS.

Testes confirmaram:

- anon falha no privilege boundary antes da policy;
- tenant user le somente seu link;
- tenant user nao grava link;
- tenant user nao le raw;
- tenant user conserva leitura canonical;
- platform staff insere, atualiza e exclui link via RLS;
- cross-tenant continua bloqueado pela FK composta;
- service role continua funcional para pipeline futuro.

Status RLS: **PASS**.

Status tenant isolation: **PASS**.

## 12. Adversarial Tests

Arquivos:

- `supabase/tests/rf02_data_model.sql`;
- `supabase/tests/rf02b_privilege_hardening.sql`.

Resultados:

- RF-02 structural/adversarial: **PASS**;
- RF-02B privilege/adversarial: **PASS**.

RF-02B cobre:

- ACL exata de `anon`, `authenticated` e `service_role`;
- acesso anonimo real a tabela e helpers;
- acesso tenant-scoped;
- escrita comum bloqueada;
- escrita staff permitida;
- raw privado;
- canonical read-only para usuario;
- pipeline service role;
- helper service role;
- FK cross-tenant;
- rollback integral.

Todos os dados sinteticos terminaram em `ROLLBACK`.

## 13. Default Privilege Regression Test

O teste cria dentro de transacao:

- tabela e funcao probe em `public`;
- tabela e funcao probe em `rf_raw`;
- tabela e funcao probe em `rf_canonical`.

Asserts:

- `anon` nao herda acesso;
- `authenticated` nao herda acesso;
- `service_role` recebe acesso esperado;
- funcoes nao herdam `PUBLIC EXECUTE`.

Resultado: **PASS**.

Os probes foram removidos pelo `ROLLBACK`.

## 14. Local Rebuild

Comando:

`npx supabase db reset --local`

Resultado da cadeia de banco:

- migrations `0001 -> 0046`: **PASS**;
- seed: **PASS**;
- `0046`: **PASS**.

O primeiro encerramento do comando reportou timeout no health check do container local de Storage apos o banco e seed concluirem. `npx supabase start` recuperou o servico, e `npx supabase status` confirmou o stack operacional. Isso nao foi causado por erro SQL da migration.

Local rebuild final: **PASS AFTER INFRA HEALTH RETRY**.

## 15. Drift

Verificacao principal:

`npx supabase db diff --local --schema public,rf_raw,rf_canonical --use-pg-delta`

Resultado:

```text
No schema changes found
```

Drift: **NONE**.

Verificacao adicional com `migra` incluiu `storage` e produziu drop/recreate semanticamente identico para quatro storage policies, tres RF triggers e duas RF policies. Nao houve diferenca de regra, expressao ou objeto; o resultado foi classificado como normalizacao do engine, nao drift estrutural. `pg-delta` confirmou estado limpo.

## 16. Typecheck

Comando:

`npx tsc --noEmit`

Resultado: **PASS**.

## 17. Lint

Comando:

`npm run lint`

Resultado: **PASS**, zero erros.

Warning preexistente:

- `src/components/design-system/data-table.tsx:72`;
- React Compiler pula memoizacao de `useReactTable()`;
- nao relacionado a RF-02B.

## 18. E2E/Regression

Comando:

`npx playwright test e2e/rf01-cnpj-alphanumeric.spec.ts --project=chromium`

Resultado: **4 passed**.

Cobertura smoke:

- CNPJ numerico;
- CNPJ alfanumerico;
- rejeicao de formatos invalidos;
- regra compartilhada entre empresa, sindicato, promocao e prospectos.

Nenhum retry foi necessario.

## 19. Security Finding Status

Finding: `RF02A-SEC-001 — Excessive anon privileges on RF objects`.

Status: **REMEDIATED LOCALLY / PENDING RELEASE**.

Criterios locais atendidos:

- migration criada;
- anon sem table privileges no link;
- anon sem execute nos helpers;
- defaults tratados;
- testes de comportamento e catalogo passam;
- nenhuma regressao de RLS/tenant/service role.

Nao esta fechado em producao. Producao permanece em `0045`.

## 20. Governance Finding Status

Finding: `RF02A-GOV-001 — Executor crossed explicit release checkpoint`.

Status: **MITIGATED** nesta execucao.

Evidencias:

- checkpoints registrados em `AGENTS.md`;
- tokens independentes registrados;
- migration aplicada somente localmente;
- remoto consultado somente para baseline;
- nenhum `git add`, commit, push, PR, remote migration ou deploy;
- execucao parada em release review.

Mitigacao processual nao apaga o desvio historico; impede sua repeticao como regra operacional.

## 21. Release Diff

```text
Migration:
supabase/migrations/0046_rf_privilege_hardening.sql

Objects affected:
public.rf_company_links ACL
public.rf02_verify_cnpj_roundtrip(text) ACL
public.rf02_get_current_dataset_count() ACL
rf_raw schema/table service_role grants
rf_canonical schema/table service_role grants
postgres default privileges for public/rf_raw/rf_canonical

Privileges before:
anon ALL on rf_company_links
anon/PUBLIC EXECUTE on rf02_* helpers
authenticated ALL on rf_company_links
service_role without explicit RF-schema pipeline grants
future public objects inherited broad user-facing privileges

Privileges after:
anon NONE on rf_company_links and rf02_*
authenticated CRUD grant layer on link, tenant read/staff write via RLS
authenticated no structural link privileges and no helper execute
service_role explicit RF pipeline access and helper execute
future postgres-created objects require explicit user-facing grants

Production data mutation:
NONE

Application code impact:
NONE; no application consumer exists for RF objects/helpers

Rollback/reversal considerations:
ACL/default-privilege only; no data rollback required.
Regranting broad anon/PUBLIC privileges is not recommended.
A reversal must be a separately reviewed forward migration.
```

## 22. Production Release Preconditions

Before release:

1. human review of complete Git and migration diff;
2. confirm production still ends at `0045`;
3. confirm no new RF consumer depends on authenticated helper execute;
4. confirm owner remains `postgres`;
5. receive independent tokens for each desired action;
6. commit only with `AUTHORIZED: COMMIT`;
7. push only with `AUTHORIZED: PUSH`;
8. apply remote migration only with `AUTHORIZED: PRODUCTION MIGRATION`;
9. deploy only with `AUTHORIZED: DEPLOY`;
10. after remote migration, rerun effective ACL/RLS/default privilege checks;
11. never combine token inference.

## 23. RF-03 Readiness

RF-03: **NOT READY**.

RF-02B precisa primeiro ser revisada e liberada em producao. Alem disso, continuam abertos:

- Master Spec fora do caminho canonico;
- database types;
- storage privado e lifecycle;
- worker execution model;
- service-role path por job;
- sizing/partitioning benchmark;
- origem oficial/download contract;
- backup/PITR/restore.

RF-03 nao foi iniciado.

## 24. Gate Decision

RF-02B Gate: **GO FOR RELEASE REVIEW**.

Razoes:

- root cause identificado;
- migration minima e auditavel;
- rebuild SQL completo;
- grants corrigidos localmente;
- default privilege risk tratado;
- RLS e tenancy passam;
- adversarial passa;
- typecheck e lint passam;
- smoke E2E passa;
- drift limpo;
- nenhuma acao remota ou Git executada.

```text
Root Cause: IDENTIFIED
Migration: 0046_rf_privilege_hardening.sql
Local Migration: PASS
Anon Table Grants: PASS
Anon Function Execute: PASS
Default Privileges: PASS
RLS: PASS
Tenant Isolation: PASS
SECURITY DEFINER: PASS
Adversarial Tests: PASS
Typecheck: PASS
Lint: PASS
Drift: NONE
Security Finding: REMEDIATED LOCALLY
Governance Finding: MITIGATED
RF-02B Gate: GO FOR RELEASE REVIEW
RF-03: NOT READY
```

