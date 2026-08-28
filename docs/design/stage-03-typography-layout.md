# GSBC — Stage 3 (Typography & Layout)

## Objetivo

Eliminar a aparência de admin genérico (achado #07 do
[GSBC Design Baseline](https://claude.ai/code/artifact/3c62b120-7889-4f59-a831-3966142d43c2))
— confirmado visualmente em 1440px: grid de métricas ocupando menos da
metade da largura disponível, com uma faixa vazia enorme à direita.
Revisão de page width, hierarquia de título e spacing — sem redesign
extravagante (o token/cor já foi endereçado no Stage 1).

## Diagnóstico

Reconfirmado antes de codificar: em 1440×900, o grid de métricas do
dashboard (`sm:grid-cols-2 lg:grid-cols-3`) parava aos 3 cards por
linha e nunca crescia além disso — a área útil restante ficava vazia.
Não era um problema de token de cor (já resolvido no Stage 1); era um
grid que não usava o breakpoint `xl` disponível.

A hierarquia de título já era adequada e não precisou de mudança: Page
Title (`text-2xl font-semibold`, 24px) vs. Section Title
(`text-sm font-medium`, 14px, consistente entre `CardTitle` e o
`PageSection` do Stage 1) — proporção ~1.7×, suficiente pra não
confundir os dois níveis (critério da Seção 75: "se eu olhar por 3
segundos, sei onde estou?"). Inflar o Page Title pra 36–44px, como um
hero de landing page, contrariaria a Seção 11 ("não transformar o
sistema em landing page") e a Seção 78 ("premium não significa...
título gigante") — decisão deliberada de não mexer.

## O que mudou

- `src/app/backoffice/page.tsx` — grid do dashboard ganhou
  `xl:grid-cols-4` (era `sm:grid-cols-2 lg:grid-cols-3`), usando a
  largura disponível em telas ≥1280px sem comprometer 2/3 colunas em
  telas menores.
- `src/app/backoffice/layout.tsx` — `<main>` ganhou um wrapper interno
  `mx-auto w-full max-w-[1440px]`, prevenindo linhas de texto/formulário
  absurdamente longas em monitores ultra-wide (>1700px de área útil)
  sem afetar nenhum viewport comum (o limite só entra em jogo acima
  disso).

Nenhuma outra tela foi tocada neste stage — tabelas de lista
(Empresas, Cobranças) continuam com largura de conteúdo natural; dar a
elas mais presença visual é trabalho do Stage 4 (toolbar/filtros), não
deste.

## Testes realizados

- `npx tsc --noEmit`, `npx eslint .` — 0 erros.
- `npm run build` — build de produção limpo.
- **Validação visual real**: dashboard em 1440×900 confirmado com 4
  colunas de métricas preenchendo a largura, gutter vazio drasticamente
  reduzido; página de cobrança e lista de empresas conferidas sem
  regressão de layout; 390×844 conferido sem efeito colateral (o
  `max-w-[1440px]` é inerte abaixo desse breakpoint).
- `npx playwright test e2e/rls-visibility.spec.ts e2e/mobile-navigation.spec.ts`
  — 11/11 passando.

## Pendências

- Nenhuma para este stage.

## Riscos residuais

| Risco | Observação |
|---|---|
| `xl:grid-cols-4` deixa cards mais estreitos em telas 1280–1440px | Baixo — `MetricCard` já é flexível (label/valor/hint em coluna), testado visualmente sem quebra |

## Próximo stage

Stage 4 — Table Experience: transformar as tabelas em instrumentos
operacionais (toolbar, busca, filtros, ordenação, empty state
diferenciado) — aplicado primeiro em Empresas, Cobranças, Negociações
e Financeiro.
