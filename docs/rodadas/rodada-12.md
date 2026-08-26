# GSBC — Rodada 12

## Objetivo
Testes automatizados de regressão sobre o fluxo completo, para não
depender só de verificação manual pelo navegador nas próximas rodadas —
recomendação registrada ao final da Rodada 11.

## Escolha de ferramenta
Playwright, não Vitest/Jest: o que mais importa verificar nesta
plataforma não é lógica isolada em funções puras, é a **integração real
entre Next.js, Postgres e RLS** — RLS decide o que cada papel vê e pode
fazer, e isso só se prova de ponta a ponta, contra o banco de verdade,
como já vinha sendo feito manualmente em toda rodada (regra 92). Testes
unitários com mocks de Supabase dariam falsa confiança exatamente onde a
plataforma é mais sensível.

## Estado inicial
Rodadas 1–11 funcionando e testadas manualmente. Nenhuma automação
existia — cada rodada repetia o mesmo roteiro manual (login como GSBC,
login como sindicato, conferir dado real, conferir RLS) do zero.

## Implementações

### Infraestrutura
- `@playwright/test` + Chromium instalado.
- `playwright.config.ts`: `baseURL` configurável via `BASE_URL`, 1
  worker (evita concorrência de escrita no mesmo Postgres local),
  trace só em falha.
- `e2e/helpers/auth.ts` (login/logout reutilizável) e
  `e2e/helpers/seed-ids.ts` (UUIDs fixos do seed, documentados como
  precisando de sincronia manual se o seed mudar).
- Scripts novos: `npm run test:e2e` (assume Supabase e dev server já de
  pé) e `npm run test:e2e:reset` (reseta o banco antes).

### Specs

- **`rls-visibility.spec.ts`** (8 testes, somente leitura, roda a
  qualquer momento): GSBC vê todos os módulos e pode gerenciar
  cobranças; sindicato acompanha sem os botões de escrita exclusivos da
  GSBC; e — reprodução automatizada da regressão real corrigida na
  Rodada 5 (migration `0009`) — o nome do responsável (staff GSBC) nunca
  aparece em branco para o sindicato.
- **`financeiro-e-notificacoes.spec.ts`** (1 teste, precisa de dados
  recém-semeados): completa o pagamento restante da cobrança de
  demonstração pela UI, confirma a cascata Parcialmente paga → Paga, e
  envia uma notificação de verdade — reproduz automaticamente a
  verificação manual feita nas Rodadas 8 e 11.
- **`site-institucional.spec.ts`** (3 testes, idempotente): home,
  navegação e envio real do formulário de diagnóstico.

### Depuração real durante a escrita dos testes
As primeiras execuções encontraram 3 falhas — todas de seletor ambíguo
(ex.: `getByRole("link", { name: "Soluções" })` batendo no link do
menu, no rodapé, e em "Conhecer todas as soluções" ao mesmo tempo; ou o
CTA "Solicitar diagnóstico gratuito" sendo `role="button"` mesmo
renderizado como link, por causa da composição do Base UI), não bugs de
produto — corrigidas restringindo o escopo dos seletores antes de
declarar a spec pronta.

## Arquivos criados
`playwright.config.ts`, `e2e/README.md`, `e2e/helpers/{auth.ts,
seed-ids.ts}`, `e2e/{rls-visibility,financeiro-e-notificacoes,
site-institucional}.spec.ts`.

## Arquivos alterados
`package.json` (`test:e2e`, `test:e2e:reset`, dependência
`@playwright/test`), `.gitignore` (`test-results/`, `playwright-report/`,
`blob-report/`).

## Banco de dados
Nenhuma migração — rodada de tooling, não de produto.

## Segurança
Nenhuma mudança de superfície — os testes usam as mesmas credenciais de
demonstração já documentadas (`admin.demo@gsbc.com.br`,
`dirigente.demo@sindicatodemonstracao.org.br`), sem novo acesso.

## Testes realizados
A própria suíte é o teste desta rodada — rodei três vezes até ficar
verde de ponta a ponta:

- `rls-visibility.spec.ts` + `site-institucional.spec.ts` contra o
  estado do banco já mutado por toda a sessão (sem reset) — passaram,
  confirmando que são de fato seguros de repetir a qualquer momento.
- `supabase db reset` seguido de `financeiro-e-notificacoes.spec.ts`
  isolado — passou.
- Suíte completa (`npx playwright test`) contra um reset fresco: **11/11
  testes passando em ~18s**.
- `npm run build`, `npx tsc --noEmit`, `npx eslint .` sem erros (os
  arquivos de `e2e/` não disparam nenhuma regra de lint do projeto).
- Banco deixado num reset limpo ao final da rodada, para a próxima
  sessão (manual ou automatizada) começar de um estado conhecido.

## Decisões arquiteturais
Nenhum ADR novo — infraestrutura de teste, não mudança de modelo de
dados ou autorização.

## Pendências
- Sem isolamento cross-tenant testado de verdade (só existe 1 sindicato
  semeado — precisaria de uma segunda entidade no seed para provar que
  o tenant A nunca vê dados do tenant B). Documentado em `e2e/README.md`.
- Fluxos de criação (nova empresa, novo instrumento, nova obrigação)
  ainda não têm spec — cobertos manualmente a cada rodada até aqui.
- Sem integração em CI (não existe pipeline configurado neste projeto
  ainda) — os testes rodam localmente, sob demanda.

## Riscos residuais
| Risco | Classificação | Observação |
|---|---|---|
| `financeiro-e-notificacoes.spec.ts` exige reset manual antes | Baixo | Documentado em `e2e/README.md` e no próprio cabeçalho da spec; `test:e2e:reset` automatiza isso |
| UUIDs do seed hardcoded em `seed-ids.ts` | Baixo | Simples de manter — só 4 valores, documentado que precisam de sincronia manual |

## Regras de negócio pendentes
Nenhuma nova.

## Próxima rodada recomendada
Cobertura de cross-tenant isolation (exigiria estender o seed com um
segundo sindicato/tenant) ou specs para os fluxos de criação
(empresa/instrumento/obrigação) que hoje só têm verificação manual.
