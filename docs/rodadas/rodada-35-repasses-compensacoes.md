# GSBC — Rodada 35 (Revenue Core — Repasses e Eventos Compensatórios)

## Objetivo

Fechar a próxima fatia de STG-07 com operação controlada de repasses e
registro append-only de eventos compensatórios, sem executar
transferência financeira real e sem iniciar STG-08.

## Diagnóstico

A Central de Conciliação já permitia resolver `manual_review`, mas os
repasses derivados do split ainda ficavam apenas como fila pendente. Além
disso, estorno, chargeback, crédito e reversão existiam como estados no
modelo, mas não havia um fluxo seguro para registrá-los sem apagar o
pagamento original.

## Decisões Arquiteturais

- Repasse é transicionado por RPC staff-only.
- Marcar repasse como pago exige referência externa de transferência.
- Repasse pago não pode ser alterado diretamente; qualquer correção
  posterior precisa virar evento compensatório.
- Evento compensatório é append-only em `payment_compensation_events`.
- Pagamento, conciliação e split originais não são apagados.
- Se houver evento compensatório após repasse não-pendente, a conciliação
  entra em `failed_review_required` e abre divergência.
- Repasses ainda `pending` são cancelados automaticamente quando um
  evento compensatório muda o estado financeiro da conciliação.

## Modelo de Dados

Migration criada:

- `supabase/migrations/0037_repasses_and_compensation_events.sql`

Tabela criada:

- `payment_compensation_events`

Funções criadas:

- `transition_financial_repasse(...)`
- `register_payment_compensation_event(...)`

Tipos atualizados:

- `payment_compensation_events`
- `transition_financial_repasse`
- `register_payment_compensation_event`

## RLS / Segurança

- `payment_compensation_events` tem leitura para staff GSBC e membros do
  tenant.
- Escrita de eventos compensatórios acontece apenas via RPC.
- Ambas as RPCs validam `auth.uid()` com `is_platform_staff`.
- Server actions registram auditoria em `audit_logs`.

## UI

Área atualizada:

- `/backoffice/conciliacao`

Funcionalidades adicionadas:

- agendar repasse;
- marcar repasse como pago com referência externa;
- marcar repasse como falho;
- cancelar repasse;
- registrar estorno, chargeback, crédito ou reversão;
- exibir eventos compensatórios associados à conciliação.

## Testes

Spec atualizada:

- `e2e/reconciliation-center.spec.ts`

Coberturas:

- reprocessamento de conciliação manual;
- geração de repasse pendente;
- agendamento de repasse;
- marcação de repasse como pago com referência externa;
- registro de estorno após repasse pago;
- conciliação passa para `failed_review_required`;
- divergência aberta é criada para revisão humana;
- usuário de sindicato não acessa a central.

## Resultados

- `npx tsc --noEmit`: passou.
- `npm run lint`: passou com warning preexistente do React Compiler em
  `src/components/design-system/data-table.tsx`.
- `npm run test:revenue-core`: 6/6 passou.
- `npm run check:revenue-core`: passou.
- `npx supabase db diff --local --schema public,storage --use-migra`:
  passou, sem drift.
- `npm run test:e2e`: 72/72 passou.

## Pendências

- PSP real continua fora de escopo.
- Execução bancária real de repasse continua fora de escopo.
- Webhook real de estorno/chargeback ainda precisa ser integrado quando
  houver provider contratado.
- A central ainda pode ganhar filtros, paginação e drill-down por
  cobrança/empresa.

## Próximo Staging Recomendado

Com STG-07 funcional em modelo, UI operacional e testes, o próximo passo
recomendado é revisar readiness objetiva para STG-08 e então iniciar o
Revenue Command Center do sindicato sem misturar isso com PSP real.
