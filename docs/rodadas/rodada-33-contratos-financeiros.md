# GSBC — Rodada 33 (Revenue Core — Contratos Financeiros Operacionais)

## Objetivo

Completar o próximo incremento de STG-07 expondo um fluxo operacional
para contratos financeiros validados e regras de split versionadas, sem
iniciar Phase 2/Revenue Command Center e sem integrar PSP real.

## Diagnóstico

A Rodada 32 criou o núcleo de conciliação, split e repasses, mas ainda
deixava contratos e regras dependentes de criação técnica direta no
banco. Isso mantinha o Revenue Core funcional para testes, porém sem
operação segura por staff GSBC.

## Decisões Arquiteturais

- Contratos financeiros só podem ser criados como validados por staff
  GSBC.
- Regra de split ativa só nasce via RPC transacional.
- Ao criar nova regra ativa, a regra ativa anterior do tenant é
  arquivada na mesma transação.
- Percentuais continuam parametrizados e versionados, vinculados a
  contrato financeiro; nenhum split foi hardcoded.
- A UI não cria provider real, não agenda transferência real e não
  inicia a próxima fase.

## Modelo de Dados

Migration criada:

- `supabase/migrations/0035_financial_contracts_ui_workflow.sql`

Funções criadas/alteradas:

- `create_financial_split_rule_version(...)`
- redefinição de `audit_entity_tenant_id(...)` para cobrir entidades do
  Revenue Core.

## RLS / Segurança

- Escrita segue restrita a staff GSBC.
- A RPC valida `auth.uid()` com `is_platform_staff`.
- Contrato validado exige `validado_por` e `validado_em`.
- Ação de contrato e ação de split registram eventos em `audit_logs`.
- Usuário de sindicato não vê a navegação de contratos financeiros e é
  redirecionado ao tentar acessar a rota.

## UI

Nova área:

- `/backoffice/contratos-financeiros`

Funcionalidades:

- métricas de contratos validados, regras ativas, sindicatos elegíveis e
  conciliações em revisão manual;
- formulário para validar contrato financeiro;
- formulário para criar versão de split;
- tabela de contratos e regra ativa vigente.

## Testes

Nova spec:

- `e2e/financial-contracts.spec.ts`

Coberturas:

- staff GSBC valida contrato financeiro via UI;
- staff GSBC cria versão ativa de split via UI;
- persistência confirma contrato validado, regra ativa, versão e
  `fee_policy`;
- usuário de sindicato não acessa a tela nem vê a navegação.

Scripts atualizados:

- `test:revenue-core` agora executa `e2e/revenue-core.spec.ts` e
  `e2e/financial-contracts.spec.ts`.

Comandos executados:

- `npx tsc --noEmit`
- `npm run lint`
- `npx supabase migration list --local`
- `npm run test:revenue-core`
- `npm run check:revenue-core`
- `npx supabase db diff --local --schema public,storage --use-migra`
- `npm run test:e2e`
- `git diff --check`
- `git status --short`

## Resultados

- Typecheck: passou.
- Lint: passou com warning preexistente do React Compiler em
  `src/components/design-system/data-table.tsx`.
- Migrations locais: `0035` aplicada.
- `test:revenue-core`: 4/4 passou.
- `check:revenue-core`: passou.
- Shadow DB diff: passou, sem drift.
- Suíte E2E completa: 70/70 passou.
- `git diff --check`: passou.

## Pendências

- Provider real continua fora de escopo.
- Central de divergências/conciliação manual ainda precisa de UI própria.
- Execução real de repasse continua fora de escopo.
- Estorno, chargeback e crédito compensatório ainda exigem fluxo
  operacional específico.

## Próximo Staging Recomendado

Ainda dentro de STG-07, criar uma central de conciliação/divergências e
somente depois avaliar readiness para PSP real ou avanço para STG-08.
