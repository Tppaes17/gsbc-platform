# Rodada 42 — Design Wave 4 Entity Workspaces

## Objetivo
Executar `CODEX_DESIGN_WAVE_4_ENTITY_WORKSPACES.md`, criando a fundação GSBC Entity Workspace sem iniciar Wave 5.

## Diagnóstico
As páginas de detalhe, especialmente Empresa, funcionavam como dossiês verticais longos. A Empresa reunia cadastro, inteligência, contatos, obrigações, cobranças, negociações, financeiro, documentos e timeline sem uma primeira dobra contextual e sem navegação local.

## Implementação
Foi criada a fundação `EntityWorkspace`, com navegação local por âncoras, overview, summary strip, seções ancoradas e relationship sections. Empresa foi migrada como referência principal e Cobrança como segunda entidade. Central Operacional recebeu refinamento limitado: status strip compacto, empty state menor e remoção de linguagem de infraestrutura.

## Banco, RLS e Auditoria
Nenhuma migration, tabela, policy, trigger, função SQL ou regra de autorização foi alterada. Permissões e isolamento entre tenants foram preservados e validados por E2E.

## Arquivos Principais
- `src/components/design-system/entity-workspace.tsx`
- `src/components/design-system/empty-state.tsx`
- `src/app/backoffice/empresas/[id]/page.tsx`
- `src/app/backoffice/cobrancas/[id]/page.tsx`
- `src/app/backoffice/operacoes/page.tsx`
- `src/app/backoffice/operacoes/work-item-row.tsx`
- `e2e/entity-workspaces.spec.ts`
- `docs/DESIGN_WAVE_4_ENTITY_WORKSPACES_REPORT.md`

## Testes
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed com warning conhecido do TanStack Table/React Compiler.
- Suíte focada: 24/24 passed.
- `npx playwright test e2e/entity-workspaces.spec.ts`: 4/4 passed.
- Reexecução de falhas isoladas: 4/4 passed.
- `npm run test:e2e`: 104/104 passed.
- Visual QA: 19/19 capturas válidas.

## Resultado
`WAVE 4 PASS`. Wave 5 não foi iniciada.

## Pendências
- Propagar workspace para Instrumento, Negociação, Sindicato e Prospecto.
- Introduzir progressive loading real para seções pesadas.
- Criar gate automatizado de acessibilidade.
- Refinar linguagem técnica residual em áreas financeiras fora do escopo direto.
