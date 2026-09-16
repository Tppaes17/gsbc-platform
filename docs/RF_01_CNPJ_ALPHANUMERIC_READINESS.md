# RF-01 CNPJ Alphanumeric Readiness

Data: 2026-09-16

## 1. Executive Summary

RF-01 foi executado para fechar o bloqueio RF00-P0-001: o sistema deixava de aceitar CNPJ alfanumerico por validar e normalizar CNPJ como somente numerico. A correcao cria um helper canonico em `src/lib/cnpj/cnpj.ts`, substitui regexes e normalizadores numericos nos fluxos de empresa, sindicato, prospecto e promocao, e faz BrasilAPI/LeadCNPJ distinguirem CNPJ valido alfanumerico de erro de validacao.

Resultado: o produto agora aceita CNPJ numerico legado e CNPJ alfanumerico valido, incluindo o exemplo oficial `00.000.000/E08G-12`, preserva identificadores alfanumericos em importacao e UI, e evita consulta externa quando o provedor ainda nao foi validado para esse formato.

Gate: GO WITH CONDITIONS. O readiness de aplicacao esta concluido, sem migration, mas BrasilAPI/LeadCNPJ permanecem tratados como provedores legados para CNPJ alfanumerico ate confirmacao externa.

## 2. Scope

Incluido:

- Helper unico de CNPJ.
- Validacao e formatacao em empresa, sindicato, prospecto, promocao de prospecto.
- Preservacao de CNPJ alfanumerico em importacao de planilha.
- Tratamento explicito de provedor legado em BrasilAPI e LeadCNPJ.
- Ajuste de avaliacao, sweep e acao manual para nao tomar decisao cadastral com provedor sem suporte.
- Testes focados de validacao, normalizacao, formatacao e integracao com schemas.
- Busca global por regressao de padroes numericos antigos.

Nao incluido:

- Migrations.
- RF ingestion/downloader/ETL/scheduler/API.
- RF schemas, tabelas, indexes, triggers ou RLS.
- Company360, Business Universe ou Diff Engine.
- Phase RF-02 ou posterior.
- Commit ou push.

## 3. Files Analyzed

- `src/lib/validation/empresa.ts`
- `src/lib/validation/sindicato.ts`
- `src/lib/validation/promocao-prospecto.ts`
- `src/lib/validation/prospecto.ts`
- `src/lib/cnpj/brasil-api.ts`
- `src/lib/cnpj/leadcnpj.ts`
- `src/lib/cnpj/avaliacao.ts`
- `src/lib/cnpj/consulta-sweep.ts`
- `src/app/backoffice/empresas/[id]/dossie-actions.ts`
- `src/app/backoffice/prospectos/actions.ts`
- `src/app/backoffice/prospectos/prospectos-table.tsx`
- `src/app/backoffice/empresas/novo/empresa-form.tsx`
- `src/app/backoffice/sindicatos/novo/sindicato-form.tsx`
- `e2e/helpers/prospectos-fixture.ts`
- `supabase/migrations/*`
- `supabase/seed.sql`

## 4. Files Changed

- `src/lib/cnpj/cnpj.ts`
- `src/lib/validation/empresa.ts`
- `src/lib/validation/sindicato.ts`
- `src/lib/validation/promocao-prospecto.ts`
- `src/lib/validation/prospecto.ts`
- `src/lib/cnpj/brasil-api.ts`
- `src/lib/cnpj/leadcnpj.ts`
- `src/lib/cnpj/avaliacao.ts`
- `src/lib/cnpj/consulta-sweep.ts`
- `src/app/backoffice/empresas/[id]/dossie-actions.ts`
- `src/app/backoffice/prospectos/actions.ts`
- `src/app/backoffice/prospectos/prospectos-table.tsx`
- `src/app/backoffice/empresas/novo/empresa-form.tsx`
- `src/app/backoffice/sindicatos/novo/sindicato-form.tsx`
- `e2e/helpers/prospectos-fixture.ts`
- `e2e/rf01-cnpj-alphanumeric.spec.ts`
- `docs/RF_01_CNPJ_ALPHANUMERIC_READINESS.md`

## 5. Official Rule Used

Regra aplicada:

- CNPJ canonico tem 14 caracteres.
- As 12 primeiras posicoes aceitam letras maiusculas e numeros.
- As 2 ultimas posicoes sao digitos verificadores numericos.
- O calculo usa modulo 11 com pesos do CNPJ e valor ASCII do caractere menos 48.
- Mascara de exibicao preservada: `AA.AAA.AAA/AAAA-DD`, com `DD` numerico.

Casos verificados:

- Numerico legado: `11.222.333/0001-81`.
- Alfanumerico oficial: `00.000.000/E08G-12`.
- Lowercase normalizado para uppercase.
- DV invalido rejeitado.
- Caracteres proibidos rejeitados.

## 6. Canonical CNPJ Architecture

Foi criado `src/lib/cnpj/cnpj.ts` como modulo canonico client-safe, sem `server-only`.

Exports principais:

- `canonicalizeCnpjInput`
- `calculateCnpjCheckDigits`
- `parseCnpj`
- `isValidCnpj`
- `formatCnpj`
- `isAlphanumericCnpj`
- `isNumericCnpj`
- `cnpjDisplayPattern`

Decisao: armazenar e transportar CNPJ de prospecto como canonical uppercase sem mascara (`00000000E08G12`) e formatar para UI/empresa quando necessario (`00.000.000/E08G-12`). Isso evita duplicidade por variacao de mascara ou lowercase.

## 7. Validation Changes

`src/lib/validation/empresa.ts` e `src/lib/validation/sindicato.ts` agora usam `isValidCnpj` e `formatCnpj`, removendo regex numerica fixa.

`src/lib/validation/prospecto.ts` agora usa `parseCnpj` em `normalizarCnpjPlanilha`, removendo `replace(/\D/g, "")` para CNPJ.

`src/lib/validation/promocao-prospecto.ts` delega `formatarCnpj` para o helper canonico.

## 8. Formatting Changes

Formatacao numerica local removida de `src/app/backoffice/prospectos/prospectos-table.tsx`.

`formatCnpj` agora preserva letras e aplica mascara unica:

- `11222333000181` -> `11.222.333/0001-81`
- `00000000E08G12` -> `00.000.000/E08G-12`

## 9. Empresa Flow

Cadastro de empresa aceita CNPJ alfanumerico valido e persiste o valor formatado uppercase.

Consulta manual de dossie de empresa trata CNPJ alfanumerico valido como `formato_nao_suportado` para provedor externo, mantendo o dossie em `pesquisa_iniciada` e gravando evidencia nao confirmada, sem concluir irregularidade ou descartar empresa.

UI de nova empresa passou a exibir placeholder alfanumerico: `00.000.000/E08G-12`.

## 10. Sindicato Flow

Cadastro de sindicato aceita CNPJ alfanumerico valido e persiste o valor formatado uppercase.

UI de novo sindicato passou a exibir placeholder alfanumerico: `00.000.000/E08G-12`.

## 11. Prospect Flow

Prospectos importados por planilha agora aceitam CNPJ alfanumerico valido e guardam o CNPJ canonico uppercase em `cnpj_consultado`.

Promocao de prospecto para empresa usa `formatarCnpj`, agora ligado ao helper canonico, para criar ou localizar empresa por CNPJ formatado.

## 12. Import Flow

`validarLinhaProspecto` aceita CNPJ alfanumerico valido.

Durante importacao, se a consulta externa retornar `formato_nao_suportado`, a linha continua importada e o contador `consultadas` nao e incrementado como se houvesse consulta bem-sucedida.

Fixture E2E em `e2e/helpers/prospectos-fixture.ts` ganhou gerador opcional de CNPJ alfanumerico valido, sem remover a fixture numerica legada.

## 13. BrasilAPI

`src/lib/cnpj/brasil-api.ts` agora:

- Usa `parseCnpj`.
- Mantem consulta numerica legada com CNPJ canonico.
- Retorna `formato_nao_suportado` para CNPJ alfanumerico valido.
- Retorna `erro` apenas para CNPJ realmente invalido ou falha de rede/resposta.

Status RF-01: LEGACY_ONLY para consulta externa alfanumerica, com preservacao do identificador.

## 14. LeadCNPJ

`src/lib/cnpj/leadcnpj.ts` agora:

- Usa `parseCnpj`.
- Mantem comportamento `nao_configurado` quando nao ha chave.
- Com chave configurada, retorna `formato_nao_suportado` para CNPJ alfanumerico valido sem tentar chamada externa.
- Mantem consulta numerica legada.

Status RF-01: LEGACY_ONLY para consulta externa alfanumerica, com preservacao do identificador.

## 15. Avaliacao/Sweep

`src/lib/cnpj/avaliacao.ts` agora propaga `formato_nao_suportado` em `AvaliacaoResultado` e `ConsultaDossieResultado`.

`consultarEAtualizarDossie` registra tentativa e evidencia para CNPJ alfanumerico valido nao suportado pelo provedor, mas nao altera status para validado/descartado.

`src/lib/cnpj/consulta-sweep.ts` trata `formato_nao_suportado` como tentativa nao conclusiva e atualiza `ultima_consulta_em` para nao travar a fila.

## 16. UI Changes

- Placeholder de empresa: `00.000.000/E08G-12`.
- Placeholder de sindicato: `00.000.000/E08G-12`.
- Tabela de prospectos usa `formatCnpj` canonico.

Nenhum redesign ou mudanca de produto fora do escopo foi aplicado.

## 17. Unit Tests

Criado `e2e/rf01-cnpj-alphanumeric.spec.ts` com testes focados de unidade/componente logico via Playwright:

- CNPJ numerico legado valido.
- CNPJ alfanumerico valido.
- Normalizacao lowercase -> uppercase.
- Rejeicao de caractere proibido.
- Rejeicao de tamanho invalido.
- Rejeicao de DV invalido.
- Reuso da regra em schemas de empresa e sindicato.
- Reuso da regra em promocao e importacao de prospectos.

## 18. E2E Tests

Executado:

`npx playwright test e2e/rf01-cnpj-alphanumeric.spec.ts --project=chromium`

Resultado: PASS, 4/4 testes.

Executado tambem:

`npx playwright test e2e/prospectos.spec.ts e2e/promocao-prospecto.spec.ts --project=chromium`

Resultado: FAIL por bloqueio de login em todos os testes relacionados. A pagina retornou alerta `E-mail ou senha inválidos.` e os testes excederam timeout aguardando `/backoffice`. A falha ocorreu antes de qualquer interacao com CNPJ, importacao ou promocao.

## 19. Regression Search

Comando executado:

`rg -n "00\\.000\\.000/0000-00|14 dígitos|14 digitos|cnpjPattern|CNPJ deve estar no formato|replace\\(/\\\\D" src e2e supabase`

Resultado:

- Nenhum `cnpjPattern` numerico remanescente em validadores de CNPJ.
- Nenhum placeholder antigo `00.000.000/0000-00` remanescente.
- Nenhuma mensagem antiga `CNPJ deve estar no formato 00.000.000/0000-00` remanescente.
- `replace(/\D/g, "")` remanescente apenas em contextos nao-CNPJ ou fixture numerica legada: valores monetarios, CNAE, sanitizacao de filename, parsing de `.env` em testes, identificadores auxiliares e gerador numerico legado de fixture.

## 20. Typecheck

Comando:

`npx tsc --noEmit`

Resultado: PASS.

Nota: a primeira execucao apontou que `src/app/backoffice/empresas/[id]/dossie-actions.ts` nao tratava o novo status `formato_nao_suportado`. O fluxo foi corrigido e o typecheck passou na reexecucao.

## 21. Lint

Comando:

`npm run lint`

Resultado: PASS com warning preexistente.

Warning:

- `src/components/design-system/data-table.tsx:72` - `react-hooks/incompatible-library` por `useReactTable`; fora do escopo RF-01.

## 22. Test Results

- Typecheck: PASS.
- Lint: PASS com warning preexistente.
- RF-01 focused tests: PASS, 4/4.
- Related prospect/promotion E2E: FAIL por credenciais/dados de login invalidos no ambiente atual, antes do fluxo testado.
- `git diff --check`: PASS.

## 23. Remaining Findings

RF01-P2-001: BrasilAPI e LeadCNPJ ainda nao foram confirmados como fontes compativeis com CNPJ alfanumerico em consulta real. Mitigacao aplicada: retorno explicito `formato_nao_suportado`, sem perda de identificador e sem decisao cadastral automatica.

RF01-P2-002: E2E completo de UI para importacao/promocao depende de ambiente com usuarios demo validos. Nesta execucao, `admin.demo@gsbc.com.br` e `dirigente.demo@sindicatodemonstracao.org.br` falharam no login.

RF01-P3-001: Seeds continuam numericas. Isso nao bloqueia RF-01 porque o escopo era readiness e compatibilidade, mas uma seed alfanumerica pode ser adicionada em fase futura autorizada.

## 24. RF00-P0-001 Closure Assessment

RF00-P0-001: CLOSED para camada de aplicacao.

Evidencias:

- CNPJ alfanumerico valido nao e mais rejeitado por regex numerica.
- Normalizacao de prospecto nao remove letras.
- Formatacao preserva letras.
- Empresa e sindicato aceitam CNPJ alfanumerico valido.
- Importacao de prospectos aceita CNPJ alfanumerico valido.
- BrasilAPI/LeadCNPJ nao classificam CNPJ alfanumerico valido como CNPJ invalido; retornam estado explicito de provedor sem suporte.

Condicao residual: provedores externos permanecem LEGACY_ONLY ate confirmacao de suporte real ao formato alfanumerico.

## 25. Risks

- Provider risk: provedores externos podem mudar API ou passar a aceitar CNPJ alfanumerico; o sistema deve ser revisado quando houver confirmacao oficial.
- Data consistency risk: dados existentes permanecem em formatos historicos. A compatibilidade foi mantida, mas nao houve migration de normalizacao.
- E2E environment risk: suite de UI relacionada depende de seeds/credenciais demo funcionais.
- Product risk: sem fonte oficial consultavel para alfanumerico, dossies alfanumericos ficam nao conclusivos ate provider readiness.

## 26. Gate Decision

Gate: GO WITH CONDITIONS.

Condicoes:

- Nao iniciar RF-02 automaticamente.
- Antes de liberar RF ingestion, confirmar estrategia oficial para consulta/enriquecimento de CNPJ alfanumerico.
- Reexecutar E2E de prospectos/promocao apos corrigir ambiente de autenticacao demo.

No migration applied.
No RF ingestion implemented.
No commit performed.
No push performed.
