# GSBC — Rodada 34 (Revenue Core — Central de Conciliação)

## Objetivo

Completar mais uma fatia de STG-07 criando a central operacional de
conciliação/divergências para staff GSBC, permitindo triagem e
reprocessamento seguro de conciliações em revisão manual.

## Diagnóstico

A Rodada 33 criou contratos financeiros e regras de split pela UI, mas
pagamentos já recebidos sem regra ativa continuavam presos em
`manual_review`. Era necessário um fluxo explícito para decisão humana:
visualizar divergência, marcar análise e reprocessar quando a causa
operacional fosse resolvida.

## Decisões Arquiteturais

- Reprocessamento de conciliação ocorre por RPC transacional, não por
  recomposição no frontend.
- Apenas staff GSBC pode triar divergências ou reprocessar conciliação.
- A RPC bloqueia recálculo quando já existe repasse fora de `pending`.
- Divergências relacionadas são marcadas como `resolved` quando o
  reprocessamento aplica uma regra de split válida.
- A central não executa repasse real e não escolhe PSP.

## Modelo de Dados

Migration criada:

- `supabase/migrations/0036_reconciliation_operations_center.sql`

Função criada:

- `retry_manual_payment_reconciliation(p_reconciliation_id uuid)`

Tipos atualizados:

- `retry_manual_payment_reconciliation` em `src/types/database.types.ts`.

## RLS / Segurança

- A RPC valida `auth.uid()` e `is_platform_staff`.
- A tela `/backoffice/conciliacao` redireciona usuário não-staff para
  `/backoffice`.
- Ações server-side registram auditoria para triagem de divergência e
  reprocessamento de conciliação.

## UI

Nova área:

- `/backoffice/conciliacao`

Funcionalidades:

- métricas de revisão manual, divergências abertas, conciliações
  resolvidas e repasses pendentes;
- tabela de conciliações recentes com valores bruto/taxa/líquido;
- resumo de split e repasse por beneficiário;
- ação de reprocessar conciliação em estado manual;
- tabela de divergências com ações de triagem.

## Testes

Nova spec:

- `e2e/reconciliation-center.spec.ts`

Coberturas:

- webhook pago sem contrato/regra gera `manual_review`;
- criação posterior de contrato/regra permite reprocessar pela central;
- conciliação vira `reconciled`, recebe split v1 e taxa;
- divergência relacionada vira `resolved` com `resolved_by` e
  `resolved_at`;
- usuário de sindicato não vê nem acessa a central.

Scripts atualizados:

- `test:revenue-core` agora executa `e2e/revenue-core.spec.ts`,
  `e2e/financial-contracts.spec.ts` e
  `e2e/reconciliation-center.spec.ts`.

## Resultados

- `npx tsc --noEmit`: passou.
- `npm run lint`: passou com warning preexistente do React Compiler em
  `src/components/design-system/data-table.tsx`.
- `npm run test:revenue-core`: 6/6 passou.
- `npm run check:revenue-core`: passou.
- `npx supabase db diff --local --schema public,storage --use-migra`:
  passou, sem drift.
- `npm run test:e2e`: 72/72 passou.
- `git diff --check`: passou.

## Pendências

- Execução real de repasse continua fora de escopo.
- PSP real continua fora de escopo.
- Fluxos de estorno, chargeback e crédito compensatório ainda precisam
  de implementação operacional.
- A central ainda não possui filtros avançados ou paginação dedicada.

## Próximo Staging Recomendado

Fechar STG-07 com fluxo operacional de repasses pendentes e estados de
estorno/chargeback/crédito compensatório antes de iniciar STG-08.
