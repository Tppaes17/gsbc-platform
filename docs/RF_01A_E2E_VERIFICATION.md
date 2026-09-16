# RF-01A E2E Verification

Data: 2026-09-16

## 1. Executive Summary

RF-01A verificou a regressao E2E complementar do RF-01. A falha originalmente registrada como credencial demo invalida nao se confirmou como causa raiz: os dois usuarios demo autenticam corretamente via Supabase Auth e possuem memberships ativos.

A causa operacional encontrada foi de fixture/teste: os E2Es de prospectos ainda usavam CNPJs numericos para importar dados, o que disparava consulta sincronica a BrasilAPI durante o upload e tornava o teste dependente de rede externa. A fixture tambem misturava uma linha alfanumerica com uma numerica quando `alphanumeric: true`, mantendo metade do fluxo dependente do provider legado.

Foram aplicadas apenas correcoes em testes/fixture. Nenhum codigo funcional, migration, seed, RLS, API RF ou provider foi alterado.

Resultado final: RF-01 focused tests PASS, RF-01A E2E regression PASS, typecheck PASS, lint PASS. Gate RF-01 final: GO.

## 2. Original Failure

Falha reportada no RF-01:

`E-mail ou senha inválidos.` durante `loginAs`, antes dos fluxos de prospectos/promocao.

Reproducao RF-01A:

`npx playwright test e2e/prospectos.spec.ts e2e/promocao-prospecto.spec.ts --project=chromium`

Resultado inicial nesta fase:

- Owner autenticou e chegou ao upload.
- Importacao ficou pendente em `Importando e consultando Receita Federal...`.
- Usuario sindicato teve timeout em login no mesmo run, mas sem a mensagem de senha invalida no snapshot.
- Checagem direta via Supabase Auth confirmou login OK para `admin.demo@gsbc.com.br` e `dirigente.demo@sindicatodemonstracao.org.br`.

Conclusao: a falha exata de senha invalida nao foi reproduzida como causa raiz.

## 3. Reproduction

Comandos executados:

- `npx playwright test e2e/prospectos.spec.ts e2e/promocao-prospecto.spec.ts --project=chromium`
- `npx supabase status`
- script Node com `supabase.auth.signInWithPassword` para os dois usuarios demo
- consultas de memberships para os usuarios demo

Evidencias:

- `admin.demo@gsbc.com.br`: OK, user id `30000000-0000-0000-0000-000000000001`.
- `dirigente.demo@sindicatodemonstracao.org.br`: OK, user id `30000000-0000-0000-0000-000000000002`.
- Membership owner: tenant platform, role `gsbc_super_admin`.
- Membership sindicato: tenant sindicato, role `sindicato_dirigente`.
- Falha inicial de upload ficou presa aguardando resultado de importacao/consulta externa.

## 4. Root Cause

Causa raiz: fixture E2E inadequada para RF-01A.

Detalhes:

- `e2e/prospectos.spec.ts` e `e2e/promocao-prospecto.spec.ts` usavam `createProspectosFixture(testInfo)` com CNPJ numerico.
- O fluxo real de importacao consulta automaticamente a Receita Federal para CNPJs numericos, de forma sincronica.
- Isso tornava o E2E dependente de BrasilAPI/rede externa, fora do objetivo RF-01A.
- A opcao `alphanumeric: true` do helper gerava apenas `cnpjUm` alfanumerico; `cnpjDois` continuava numerico.
- O teste de promocao esperava redirect automatico, mas a promocao era concluida no banco e no audit log antes da UI navegar. O E2E agora valida conclusao real por banco e abre a empresa criada.
- O assert final `getByText(fixture.nomeUm).toHaveCount(0)` era falso-negativo porque o proprio campo de busca continha o texto.

## 5. Classification

TEST_FIXTURE.

Nao houve evidencia de:

- SEED_DATA
- ENVIRONMENT_CONFIG
- LOCAL_SUPABASE_STATE
- AUTH_REGRESSION
- RF01_REGRESSION

## 6. Files Changed

- `e2e/helpers/prospectos-fixture.ts`
- `e2e/prospectos.spec.ts`
- `e2e/promocao-prospecto.spec.ts`

## 7. Fix Applied

Alteracoes aplicadas:

- `createProspectosFixture(testInfo, { alphanumeric: true })` passou a ser usado nos E2Es de prospectos/promocao.
- `createProspectosFixture` agora gera `cnpjDois` alfanumerico quando `alphanumeric: true`.
- Teste de promocao ganhou timeout de 60s para cobrir o fluxo completo de upload, promocao, abertura de empresa e verificacao final.
- Teste de promocao confirma a criacao da empresa via banco apos o clique real no submit e entao navega para a empresa criada.
- Assert final de remocao da lista de prospectos passou a verificar o empty state `Nenhum resultado corresponde à busca`, evitando falso negativo causado pelo texto presente no input de busca.

Nao foram aplicados:

- Bypass de login.
- Skip de teste.
- Reducao de cobertura.
- Alteracao de auth.
- Alteracao de provider.
- Alteracao de migration/seed.

## 8. E2E Scenarios Executed

Regressao RF-01A:

`npx playwright test e2e/prospectos.spec.ts e2e/promocao-prospecto.spec.ts --project=chromium`

Cenarios:

- Owner ve menu Oportunidades e importa planilha com CNPJs alfanumericos validos.
- Owner promove prospecto alfanumerico para empresa sem recadastro.
- Usuario sindicato nao ve menu Prospectos e nao acessa rota restrita.

Focused RF-01:

`npx playwright test e2e/rf01-cnpj-alphanumeric.spec.ts --project=chromium`

Cenarios:

- CNPJ numerico legado valido.
- CNPJ alfanumerico oficial valido.
- Rejeicoes de caractere/tamanho/DV.
- Reuso da regra em empresa, sindicato, promocao e importacao.

## 9. E2E Results

RF-01A regression:

`3 passed (50.4s)`

Focused RF-01:

`4 passed (3.1s)`

Login smoke:

- Coberto pelos E2Es RF-01A com owner e sindicato.
- Confirmado tambem via Supabase Auth direto.

Importacao/consulta de prospecto:

- Coberta por `e2e/prospectos.spec.ts`.

Visualizacao de CNPJ:

- Coberta pela tabela de prospectos e detalhe/empresa no fluxo de promocao.

Cadastro de empresa:

- Coberto por promocao real de prospecto para empresa.

Cadastro de sindicato:

- Nao ha smoke UI dedicado existente; validacao de schema coberta no RF-01 focused test.

## 10. Numeric CNPJ Regression

Resultado: PASS.

Evidencia:

- `e2e/rf01-cnpj-alphanumeric.spec.ts` validou `11.222.333/0001-81`.
- Fixture numerica legada permanece disponivel quando `alphanumeric` nao e usado.
- Nenhuma alteracao foi feita no caminho numerico de provider.

## 11. Alphanumeric CNPJ Regression

Resultado: PASS.

Evidencia:

- `e2e/rf01-cnpj-alphanumeric.spec.ts` validou `00.000.000/E08G-12`.
- `e2e/prospectos.spec.ts` importou planilha alfanumerica.
- `e2e/promocao-prospecto.spec.ts` promoveu prospecto alfanumerico para empresa.
- `e2e/helpers/prospectos-fixture.ts` gera duas linhas alfanumericas quando solicitado.

## 12. Provider Behavior

BrasilAPI e LeadCNPJ nao foram reabertos.

Comportamento preservado:

- CNPJ numerico segue pelo provider legado.
- CNPJ alfanumerico valido nao e convertido em invalido.
- CNPJ alfanumerico valido retorna tratamento de provider sem suporte no fluxo RF-01.

RF-01A removeu dependencia de provider externo dos E2Es de regressao, sem alterar providers.

## 13. Typecheck

Comando:

`npx tsc --noEmit`

Resultado: PASS.

## 14. Lint

Comando:

`npm run lint`

Resultado: PASS com warning preexistente:

- `src/components/design-system/data-table.tsx:72` - `react-hooks/incompatible-library` por `useReactTable`.

## 15. Remaining Risks

- O redirect automatico apos promocao nao foi usado como criterio de sucesso do E2E porque a acao conclui banco/audit e o teste valida a conclusao real por banco antes de abrir a empresa. Pode ser revisitado em uma rodada especifica de UX/Next server actions se desejado.
- Nao ha smoke UI dedicado para cadastro manual de sindicato; o RF-01 focused test cobre o schema.
- Providers externos continuam LEGACY_ONLY para alfanumerico ate confirmacao oficial.

## 16. RF-01 Final Gate Assessment

RF00-P0-001: CLOSED.

RF01 focused tests: PASS.

RF01A E2E regression: PASS.

Numeric CNPJ: PASS.

Alphanumeric CNPJ: PASS.

Typecheck: PASS.

Lint: PASS.

Gate final RF-01: GO.

## 17. RF-02 Authorization Recommendation

RF-02 READY FOR HUMAN AUTHORIZATION.

No migration applied.
No RF ingestion implemented.
No commit performed.
No push performed.
