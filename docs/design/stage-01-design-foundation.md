# GSBC — Stage 1 (Design Foundation)

Origem: `GSBC_Master_Prompt_Revisao_Design_Frontend_UX.md` (fornecido pelo
usuário em 2026-08-28), executado após o
[GSBC Design Baseline](https://claude.ai/code/artifact/3c62b120-7889-4f59-a831-3966142d43c2)
(levantamento pré-Stage 1, mesma data).

## Objetivo

Consolidar o design system antes de tocar em qualquer tela de produto —
conectar a paleta institucional (`--color-brand-*`, já existente em
`globals.css` mas isolada) ao tema operacional, cobrir os tokens
ausentes identificados no baseline, e criar os componentes de página
que os stages seguintes vão precisar prontos.

## O que mudou

### Tokens (`src/app/globals.css`)

- `--primary`, `--sidebar-*` e `--accent`/`--info` deixaram de rodar
  sobre o placeholder navy genérico (`oklch(0.32 0.09 258)`, marcado
  como provisório no próprio comentário do código) e passaram a
  derivar de `--color-brand-navy`/`--color-brand-teal` — a mesma
  paleta já usada no site institucional, sem inventar cor nova.
- Tokens novos, complementando (nunca substituindo) os existentes:
  `--info`/`--info-foreground`, `--surface-elevated`,
  `--border-subtle`, `--text-secondary`, `--financial-positive`,
  `--financial-negative`, `--financial-neutral` — cobrindo a lista
  pedida na Seção 9 do master prompt.
- Modo escuro (`.dark`) recebeu a mesma reconexão por coerência —
  hoje é código morto no app (nenhum `ThemeProvider`/toggle liga a
  classe `.dark`), mas mantido íntegro para quando for ativado.
- Verificado ao vivo via `getComputedStyle` no dashboard renderizado:
  `--primary` resolve para `#304755`, `--financial-positive` para
  `#14874e` — sem erro de CSS, sem token quebrado.

### Componentes novos (`src/components/design-system/`)

| Componente | Função | Status |
|---|---|---|
| `PageSection` | Agrupa seção com title/description/action opcional | Pronto, ainda não aplicado a uma tela nesta rodada |
| `DetailHeader` | Identidade + status + metadata + ações, separados | **Aplicado em 2 telas** (ver abaixo) |
| `TableToolbar` | Casca: search/filters/count/selected/actions | Casca — sem lógica ligada (Stage 4) |
| `FilterBar` | Casca de filtros contextuais | Casca — sem lógica ligada (Stage 4) |
| `RiskPanel` | Sinaliza risco (tons warning/negative) | Pronto, ainda não aplicado a uma tela nesta rodada |
| `FinancialSummary` | Linhas de valor com hierarquia, nunca recalcula | Pronto, ainda não aplicado a uma tela nesta rodada |
| `CriticalActionDialog` | Confirmação com contexto + impacto antes/depois | Pronto, ainda não aplicado a uma tela nesta rodada (Stage 7) |
| `FormSection` | Agrupa campos de formulário longo | Pronto, ainda não aplicado a uma tela nesta rodada (Stage 6) |

Critério do Stage 1 ("componentes devem ser reais e reutilizados em
pelo menos duas telas quando aplicável") cumprido por `DetailHeader`:
substituiu o bloco `PageHeader` + linha de status/valor montada à mão
em duas páginas de detalhe.

### Telas atualizadas

- `src/app/backoffice/empresas/[id]/page.tsx` — `PageHeader` +
  `StatusBadge` avulsos → `DetailHeader` (title, subtitle, status,
  metadata com CNPJ).
- `src/app/backoffice/cobrancas/[id]/page.tsx` — mesmo padrão, com
  metadata cobrindo valor original e valor acordado (quando há
  desconto de negociação) e `StatusAction` mantido no slot de ações.
  A linha de links de navegação (Ver ficha da empresa / Ver
  instrumento / Ver negociação / Enviar notificação) permanece abaixo,
  intacta — não é metadata, é navegação/ação contextual.

Nenhum dado, query ou texto visível mudou — confirmado por
`get_page_text` antes/depois idêntico, byte a byte, nas duas páginas.

## Testes realizados

- `npx tsc --noEmit` — 0 erros.
- `npx eslint .` — 0 erros (2 warnings pré-existentes, não
  relacionados: `data-table.tsx` incompatibilidade conhecida do React
  Compiler com TanStack Table; `globals.css` sem parser de CSS no
  ESLint).
- `npm run build` — build de produção limpo, 37 rotas geradas sem
  erro.
- **Validação visual real** (não só código): renderizado ao vivo em
  1440×900 e 390×844 — dashboard, empresa detail, cobrança detail.
  `DetailHeader` confirmado funcional nos dois breakpoints; grid ativo
  da sidebar já reflete o token novo (`--sidebar-accent` derivado de
  `brand-teal`).
- `npx playwright test e2e/rls-visibility.spec.ts e2e/regua-cobranca.spec.ts`
  — 9/9 passando (cobrem exatamente as duas páginas alteradas, staff e
  sindicato) — zero regressão funcional.

## Pendências

- `PageSection`, `RiskPanel`, `FinancialSummary`, `CriticalActionDialog`
  e `FormSection` existem mas ainda não têm um segundo consumidor —
  entram em uso real nos Stages 2–8, conforme o plano do baseline.
- `TableToolbar`/`FilterBar` são cascas sem busca/filtro funcional —
  Stage 4 liga a lógica.
- Auditoria completa do Codex (mandato em
  `GSBC_CODEX_REVIEW_MANDATE.md`) continua pendente de execução.

## Riscos residuais

| Risco | Observação |
|---|---|
| `.dark` reconectado mas nunca exercitado ao vivo (nenhum toggle no app) | Baixo — mudança aditiva, mesmo padrão dos tokens light já validados |
| `color-mix()` em CSS depende de browser moderno | Baixo — Next.js/Tailwind 4 já assume baseline moderno; sem fallback necessário para o público-alvo (backoffice interno) |

## Próximo stage

Stage 2 — Navigation & App Shell: resolver a navegação mobile perdida
(achado #01, severidade High no baseline) e consolidar `AppShell`.
