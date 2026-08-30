# GSBC — Rodada 36 (STG-08 — Revenue Command Center Completion)

## Objetivo

Concluir as pendências conhecidas da STG-08 após a consolidação da
STG-07: ampliar o Revenue Command Center com segmentação por obrigação,
período e status, e melhorar os drill-downs para registros de origem.

## Diagnóstico

A primeira implementação do Revenue Command Center, registrada na
Rodada 24, já entregava KPIs, funil, tendência mensal e segmentação por
empresa. O próprio relatório da rodada apontava lacunas frente ao
roadmap: segmentação incompleta e ausência de drill-down operacional
para receita identificada/obrigações.

## Decisões Arquiteturais

- Nenhuma migration nova: a STG-08 continua sendo camada analítica sobre
  tabelas existentes.
- RLS segue como autoridade final; a página permanece acessível a staff
  e sindicato, com escopo definido pelo banco.
- Segmentações foram implementadas como funções puras em
  `src/lib/revenue/segments.ts`.
- `/backoffice/cobrancas` foi estendido para aceitar filtros por
  obrigação e período, além dos filtros já existentes por status e
  empresa.

## Implementações

- `src/lib/revenue/segments.ts`:
  - `segmentByEmpresa`;
  - `segmentByObrigacao`;
  - `segmentByPeriodo`;
  - `segmentByStatus`.
- `src/app/backoffice/receita/page.tsx`:
  - passa dados de obrigação, período e status para a seção de
    segmentação.
- `src/app/backoffice/receita/segmentacao-section.tsx`:
  - passou a exibir Empresa, Obrigação, Período e Status.
- `src/app/backoffice/receita/kpi-grid.tsx`:
  - KPI de receita identificada agora aponta para a segmentação de
    obrigações/origem.
- `src/app/backoffice/cobrancas/page.tsx`:
  - filtros por `obrigacaoId`, `vencimentoInicio` e `vencimentoFim`.
- `e2e/receita.spec.ts`:
  - fixture isolada para validar segmentações e drill-downs.

## Banco de Dados

Nenhuma migration criada ou alterada nesta rodada.

## Segurança

- Nenhuma escrita nova foi adicionada.
- RLS existente continua escopando `obrigacoes`, `cobrancas`,
  `cobranca_eventos`, `negociacoes` e `pagamentos`.
- Os novos filtros usam Supabase query builder parametrizado.

## Testes

Comandos executados:

- `npx tsc --noEmit`
- `npm run lint`
- `npx playwright test e2e/receita.spec.ts`
- `npm run test:e2e`
- `git diff --check`
- `git status --short --untracked-files=all`

Resultados:

- Typecheck: passou.
- Lint: passou com warning preexistente do React Compiler em
  `src/components/design-system/data-table.tsx`.
- `e2e/receita.spec.ts`: 5/5 passou.
- Suíte E2E completa: 73/73 passou.

## Pendências

- Filtros avançados de UI dentro do próprio Command Center ainda podem
  ser adicionados, mas o drill-down operacional já existe via links.
- O funil histórico continua tendo a limitação conhecida da Rodada 24:
  número cumulativo por histórico versus drill-down por status atual.

## Próximo Staging Recomendado

Iniciar STG-09 — Escalonamento e Notificação Extrajudicial — revisando
primeiro o que já existe para não duplicar a central de escalonamentos.
