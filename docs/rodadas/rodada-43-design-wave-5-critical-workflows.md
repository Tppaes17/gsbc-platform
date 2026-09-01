# Rodada 43 — Design Wave 5 Critical Workflows

Data: 2026-09-01

## Objetivo
Aplicar a Wave 5 de design nos fluxos críticos com consequência antes da confirmação, fricção proporcional ao risco e preservação dos limites de domínio: oportunidade, obrigação, cobrança, acordo, pagamento, baixa, PSP, repasse e quitação continuam conceitos distintos.

## Escopo Executado
- Criado `ActionConsequencePanel` para padronizar consequência, reversibilidade, falha e auditoria antes de ações L2/L3.
- Notificação de cobrança passou a exibir efeito externo, ausência de baixa/pagamento, falha parcial e auditoria.
- Pagamento manual passou a explicitar que não representa confirmação de PSP, repasse ou quitação jurídica.
- Movimento de negociação passou a separar proposta, contraproposta, aceite, acordo e pagamento.
- Aprovação/rejeição de desconto passou a explicitar decisão humana, efeito na cobrança e ausência de pagamento.
- Escalonamento passou a ter revisão antes de iniciar, aprovar/rejeitar, gerar documento, enviar notificação extrajudicial, registrar envio físico e registrar resultado.
- Conciliação passou a explicitar retry/idempotência e evento compensatório posterior.

## Arquivos Modificados
- `src/components/design-system/action-consequence-panel.tsx`
- `src/app/backoffice/cobrancas/[id]/notificacao-action.tsx`
- `src/app/backoffice/financeiro/pagamento-action.tsx`
- `src/app/backoffice/negociacoes/[id]/evento-form.tsx`
- `src/app/backoffice/negociacoes/[id]/decidir-desconto-dialog.tsx`
- `src/app/backoffice/cobrancas/[id]/escalonamento-section.tsx`
- `src/app/backoffice/conciliacao/reconciliation-actions.tsx`
- `e2e/critical-workflows.spec.ts`
- `e2e/critical-workflows-visual.spec.ts`
- `e2e/financeiro-e-notificacoes.spec.ts`
- `e2e/escalonamento.spec.ts`
- `docs/DESIGN_WAVE_5_CRITICAL_WORKFLOWS_REPORT.md`
- `docs/DESIGN_DEBT_REGISTER.md`
- `docs/rodadas/rodada-43-design-wave-5-critical-workflows.md`

## Migrations / APIs / RLS
Nenhuma migration criada ou modificada. Nenhuma API, policy RLS ou Server Action de domínio foi alterada.

## Testes Executados
- `npx tsc --noEmit`: passed.
- `npx playwright test e2e/critical-workflows.spec.ts`: 4/4 passed.
- `npx playwright test e2e/critical-workflows-visual.spec.ts`: 4/4 passed.
- `npx playwright test e2e/critical-workflows.spec.ts e2e/critical-workflows-visual.spec.ts e2e/financeiro-e-notificacoes.spec.ts e2e/escalonamento.spec.ts e2e/reconciliation-center.spec.ts e2e/rls-visibility.spec.ts`: 29/29 passed.
- `npm run test:e2e`: 112/112 passed.
- `npm run lint`: passed com 1 warning conhecido em `src/components/design-system/data-table.tsx` sobre `useReactTable`.
- `git diff --check`: passed.

## Visual QA
Capturas geradas em `test-results/design-wave-5-critical-workflows/`:
- `desktop-payment-review.png`
- `mobile-375-notification-review.png`
- `mobile-320-negotiation-review.png`
- `mobile-375-forbidden-critical-actions.png`

## Bugs Encontrados e Corrigidos
- Modal de notificação ficou alto demais e o botão de confirmação saía do viewport; corrigido com `max-h-[90dvh] overflow-y-auto` nos diálogos críticos tocados.
- Botões diretos de documento/envio extrajudicial executavam ação no primeiro clique; convertidos em diálogos de revisão.
- Label visual de conciliação competia com campo `Evento`; renomeado para evitar ambiguidade de acessibilidade/teste.

## Pendências e Riscos Residuais
- UI de step-up/MFA ainda não foi implementada, embora o runtime de política já exija MFA em teste.
- Maker-checker genérico ainda não existe fora do fluxo jurídico de escalonamento.
- Régua pause/resume/cancel ainda usa confirmação genérica.
- Bulk actions críticas continuam sem padrão específico.
- Stale-state UX ainda depende de revalidação/servidor, sem aviso contextual no diálogo.

## Decisão
WAVE 5 PASS WITH CONDITIONS. Próximo staging recomendado: Wave 6, sem iniciar automaticamente.
