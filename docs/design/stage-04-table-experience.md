# GSBC — Stage 4 (Table Experience)

## Objetivo

Transformar tabelas em instrumentos operacionais (achado #04 do
[GSBC Design Baseline](https://claude.ai/code/artifact/3c62b120-7889-4f59-a831-3966142d43c2)):
busca, ordenação, contagem e empty state diferenciado — client-side
sobre o conjunto já carregado, sem nenhuma API nova (regra 29: "se
dados atualmente estão client-side, realizar busca sobre conjunto
disponível; registrar necessidade de server-side search futura").
Aplicado nas 4 telas indicadas pelo master prompt: Empresas,
Cobranças, Negociações, Financeiro.

## O que mudou

- `src/components/design-system/data-table.tsx` — único ponto de
  mudança estrutural. Ganhou `enableSearch`/`searchPlaceholder`
  opcionais; quando ligado, usa `getFilteredRowModel`/`getSortedRowModel`
  do TanStack Table (já era a base da tabela) pra busca por texto livre
  (`globalFilter`) e ordenação por coluna (clique no cabeçalho, ícone
  de direção). Contagem de resultados e "Limpar filtros" vêm do
  `TableToolbar` do Stage 1. Todas as outras tabelas do produto que
  não passam `enableSearch` continuam exatamente como antes — mudança
  aditiva, zero-config por padrão.
- **Empty state diferenciado** (regra 32): "Nenhum registro" (dataset
  vazio, como já era) permanece distinto de "Nenhum resultado
  corresponde à busca" (novo — aparece só quando há dado mas o filtro
  não bate com nada), com CTA "Limpar busca".
- `empresas-table.tsx`, `cobrancas-table.tsx`, `negociacoes-table.tsx`,
  `financeiro-table.tsx` — `enableSearch` ligado, com `accessorFn`
  adicionado às colunas de identificação (empresa) que antes só tinham
  `cell` sem accessor — sem isso a busca/ordenação não teria valor pra
  comparar. Nenhuma coluna existente teve o `cell` alterado; só o
  accessor por trás foi adicionado.

## Escopo deliberadamente fora deste stage

- **Filtros facetados** (Status/Vencimento/Empresa pedidos na Seção 30
  para Financeiro) — `FilterBar` continua casca sem lógica; adicionar
  select-based filters é trabalho futuro, não bloqueado por nada deste
  stage.
- **Coluna "Sindicato"** nas 4 tabelas não é sortável/buscável (sem
  accessor) — é uma coluna de contexto (RLS já escopa por tenant),
  não um campo de busca esperado pelo usuário.
- **Busca server-side** — registrado como necessidade futura (regra
  29), não implementado; o volume atual (poucas dezenas de registros
  no ambiente real) não justifica ainda.

## Coexistência com o filtro de status existente

`/backoffice/cobrancas?status=paid,partially_paid` (drill-down do
Revenue Command Center, STG-08) já tinha um filtro server-side por
query param, com seu próprio indicador "Filtrado por status" e link
"Limpar filtro" (singular). Mecanismo diferente, rótulo diferente do
"Limpar filtros"/"Limpar busca" novos — confirmado sem colisão via
`e2e/receita.spec.ts`, que continua passando.

## Testes realizados

- `npx tsc --noEmit`, `npx eslint .` — 0 erros (1 warning pré-existente
  do TanStack Table, não relacionado).
- `npm run build` — build de produção limpo.
- **Validação visual real e interativa** (não só leitura de código):
  - Busca por "Estrela" na lista de Empresas → 1 registro, contagem
    atualizada.
  - Busca sem correspondência → empty state "Nenhum resultado
    corresponde à busca" com "Limpar busca" funcional, restaurando os
    2 registros.
  - Confirmado em Cobranças, Negociações e Financeiro — toolbar e
    contagem renderizando corretamente.
  - 390×844: toolbar empilha em coluna, tabela mantém scroll horizontal
    dentro do próprio container (Estratégia A da Seção 33 — adequada
    pro número de colunas dessas 4 tabelas; não foi necessário migrar
    pra cards).
- `npx playwright test e2e/rls-visibility.spec.ts e2e/mobile-navigation.spec.ts e2e/receita.spec.ts e2e/oportunidades.spec.ts`
  — 17/17 passando, incluindo o teste que exercita o filtro de status
  pré-existente na mesma página (Cobranças).

## Pendências

- Filtros facetados (Status/Vencimento/Empresa) — `FilterBar` segue
  sem lógica ligada.
- Busca/ordenação server-side quando o volume justificar.

## Riscos residuais

| Risco | Observação |
|---|---|
| `getFilteredRowModel`/`getSortedRowModel` ligados globalmente em `DataTable`, mesmo pras tabelas que não usam `enableSearch` | Baixo — TanStack só monta os *row models* sob demanda; nenhuma tabela existente muda de comportamento sem o prop novo |

## Próximo stage

Stage 5 — Dashboard: transformar a home do backoffice em cockpit
operacional (4 perguntas: tamanho da operação, quanto está
movimentado, o que exige atenção, o que aconteceu recentemente) e
remover o aviso desatualizado de Documentos (achado #03).
