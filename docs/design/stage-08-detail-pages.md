# GSBC — Stage 8 (Detail Pages)

## Objetivo

Melhorar as páginas 360º — prioridade Empresas, Cobranças, Negociações
(achado #09 do
[GSBC Design Baseline](https://claude.ai/code/artifact/3c62b120-7889-4f59-a831-3966142d43c2):
`cobrancas/[id]/page.tsx` com 564 linhas, `empresas/[id]/page.tsx` com
396). "Não alterar consulta ou regra de negócio apenas para reduzir
número de linhas" — o objetivo é manutenção e legibilidade, não um
número menor por si só.

## Diagnóstico — o que já estava certo antes de tocar em qualquer coisa

Reler as duas páginas por completo mostrou que o achado #09 já estava
parcialmente resolvido por decomposição de rodadas anteriores:

- `empresas/[id]/page.tsx`: a árvore JSX final já é 100% componentes
  nomeados (`EditEmpresaForm`, `DossieCadastralSection`,
  `ContatosSection`, `EmpresaObrigacoesList`, `EmpresaCobrancasList`,
  `EmpresaNegociacoesList`, `EmpresaFinanceiroSummary`,
  `DocumentosSection`, `TimelineConsolidada`). Nenhuma seção solta.
  **Nenhuma mudança nesta página** — não havia nada de estrutura pra
  melhorar sem violar a restrição de não tocar em consulta.
- `cobrancas/[id]/page.tsx`: quase toda seção já era um componente
  nomeado (`PaymentChargesSection`, `ReguaCobrancaSection`,
  `ContestacaoSection`, `EscalonamentoSection`,
  `CollectionsCopilotSection`, `NotificacoesList`) — só a seção
  **Financeiro** ainda usava um `<h2>` solto ao invés do `PageSection`
  do Stage 1, um resquício de antes desse componente existir.

O peso real das duas páginas está na orquestração de dados (queries
paralelas, `Promise.all`, geração de URL assinada de storage,
montagem de `TimelineItem[]`) — exatamente o que a Seção 48 do master
prompt pede pra **não** mexer.

## O que mudou

- `src/app/backoffice/cobrancas/[id]/labels.ts` (novo) — `STATUS_LABEL`,
  `STATUS_TONE`, `CONTESTACAO_EVENTO_LABEL`, `ESCALONAMENTO_EVENTO_LABEL`
  e `statusLabel()` extraídos de dentro de `page.tsx` — são tabelas de
  apresentação, não regra de negócio nem consulta, e reduzem `page.tsx`
  em ~47 linhas de forma genuinamente segura.
- `src/app/backoffice/cobrancas/[id]/status-action.tsx` — passou a
  importar `STATUS_LABEL` de `./labels` no lugar de manter sua própria
  cópia local (que nem cobria o status `contestada`) — elimina uma
  duplicação que o próprio Stage 7 tinha introduzido.
- `src/app/backoffice/cobrancas/[id]/page.tsx` — seção **Financeiro**
  convertida pro `PageSection` (Stage 1), consistente com todas as
  outras seções da mesma página.

## Testes realizados

- `npx tsc --noEmit`, `npx eslint .` — 0 erros.
- `npm run build` — build de produção limpo.
- **Validação visual real**: texto renderizado da página de cobrança
  conferido idêntico, palavra por palavra, ao estado anterior ao Stage
  8 — a mudança é estrutural (organização de arquivo), não visual.
  Diálogo "Mudar status" reconferido mostrando "Paga" corretamente via
  o novo import compartilhado.
- `npx playwright test e2e/rls-visibility.spec.ts e2e/contestacao.spec.ts e2e/escalonamento.spec.ts`
  — 14/14 passando (cobrem exatamente as seções tocadas nesta página).

## Pendências

Nenhuma — a decisão deste stage foi reconhecer que a maior parte do
trabalho de decomposição já tinha sido feita em rodadas anteriores, e
extrair só o que era seguro extrair sem violar a restrição de não
tocar consulta/regra de negócio.

## Riscos residuais

Nenhum novo — extração mecânica de constantes, sem mudança de
comportamento.

## Próximo stage

Stage 9 — Login & Public Transition: elevar a percepção de confiança
institucional da tela de login (achado #08), hoje um card pequeno
sobre um fundo quase vazio em telas largas.
