# GSBC — Rodada 32 (Revenue Core — Split, Conciliação e Repasses)

## Objetivo

Iniciar Revenue Core pelo núcleo de STG-07, sem provider real e sem
movimentação financeira real: criar subledger de conciliação, contratos
financeiros, regras de split versionadas, itens de split e fila de
repasses.

## Diagnóstico

A Phase 0 deixou webhook, auditoria, service role, backup/restore e
testes de isolamento em estado verde. O risco financeiro principal ainda
era a lacuna entre `pagamentos`/`payment_charges` e a verdade de
liquidação/split/repasses. Antes desta rodada, o sistema registrava
pagamento recebido, mas não preservava:

- contrato financeiro validado;
- regra de split aplicada;
- taxas;
- valor líquido;
- beneficiários;
- repasse pendente;
- divergência de conciliação quando faltasse contrato/regra.

## Decisões Arquiteturais

- Provider real continua fora de escopo.
- Split não é hardcoded. Sem contrato validado e regra ativa, o pagamento
  de provider entra em `manual_review`.
- A versão da regra aplicada é copiada para a conciliação e para cada
  item de split.
- Repasses são uma fila operacional derivada do split conciliado, não
  custódia direta pela GSBC.
- Divergência financeira cria fila própria; nada é ajustado
  silenciosamente.

## Modelo de Dados

Migration criada:

- `supabase/migrations/0034_revenue_core_reconciliation.sql`

Novas tabelas:

- `financial_contracts`
- `financial_split_rules`
- `payment_reconciliations`
- `payment_split_items`
- `financial_repasses`
- `reconciliation_divergences`

Novas funções:

- `reconcile_provider_payment(...)`
- redefinição de `register_provider_pagamento(...)` para criar
  conciliação após pagamento confirmado.

## RLS / Segurança

- Contratos e regras: leitura para staff GSBC e membros do tenant; escrita
  apenas para staff GSBC.
- Conciliações, splits e repasses: leitura para staff GSBC e membros do
  tenant; escrita somente via service role/funções internas.
- Divergências: leitura/gestão restrita a staff GSBC.
- `reconcile_provider_payment` e `register_provider_pagamento` continuam
  restritas a `service_role`.

## UI

`PagamentosList` agora exibe, quando existir conciliação:

- status de conciliação;
- valor bruto;
- taxas;
- valor líquido;
- resumo de repasse.

A informação aparece nos pontos já existentes:

- ficha da cobrança no backoffice;
- ficha da cobrança no portal empresarial.

## Testes

Nova spec:

- `e2e/revenue-core.spec.ts`

Coberturas:

- pagamento de provider sem contrato validado gera conciliação em
  `manual_review` e divergência aberta;
- contrato validado com regra ativa gera conciliação `reconciled`,
  split versionado e repasse pendente;
- regras usam `numeric`, preservam versão, e somam líquido sem duplicar.

Comandos executados:

- `npx tsc --noEmit`
- `npm run test:revenue-core`
- `npm run check:revenue-core`
- `npx supabase db diff --local --schema public,storage --use-migra`
- `npm run test:e2e`

## Resultados

- `check:revenue-core`: passou, com warning preexistente do React
  Compiler/TanStack Table.
- Shadow DB diff: passou, sem drift.
- `test:revenue-core`: 2/2 passou.
- Primeira execução da suíte completa expôs fragilidade antiga em
  `e2e/politicas.spec.ts`: seletor `getByText` em modo estrito pegava
  decisões de policy além do card de política. Corrigido para mirar
  `[data-slot="card-title"]`.

## Pendências

- Provider real segue bloqueado até escolha/contrato/sandbox oficial.
- Não há UI de cadastro/validação de contratos financeiros; nesta rodada
  o núcleo é schema + engine + leitura.
- Não há execução real de repasse.
- Não há tratamento completo de estorno/chargeback/crédito; ficam como
  estados do modelo e próximo incremento.

## Próximo Staging Recomendado

Completar Revenue Core com uma UI operacional de contratos/regras de
split e uma central de conciliação/divergências antes de integrar PSP
real.
