# GSBC — Rodada 8

## Objetivo
Financeiro: pagamentos, vencimentos e inadimplência sobre uma cobrança —
o módulo já sinalizado como placeholder desde a Rodada 5. Documentos
(instrumentos, notificações, acordos, comprovantes) foi deliberadamente
**deixado fora** desta rodada — ver Escopo abaixo.

## Escopo — por que Documentos não entrou nesta rodada
O armazenamento de arquivos (Supabase Storage) está desabilitado no
ambiente local deste projeto desde a Rodada 1, por restrição de memória
do Docker (ver `docs/rodadas/rodada-01.md`). Construir uma tela de
"Documentos" sem upload/download real seria exatamente o tipo de UI
mockada que as regras do projeto proíbem (regra 62). Optei por entregar
Financeiro — que não depende de storage e é totalmente funcional — e
deixar Documentos explicitamente para quando o Storage puder ser
reativado (ou para produção, onde a restrição de memória local não se
aplica).

## Estado inicial
Rodadas 1–7 funcionando e testadas (fundação, sindicatos, empresas,
instrumentos/obrigações, cobranças, site institucional, negociações). A
ficha 360º da empresa tinha um placeholder honesto para "Financeiro" —
substituído nesta rodada por dados reais.

## Implementações

### Modelo de dados
- `pagamentos`: ledger imutável (sem policy de update/delete) de
  pagamentos contra uma cobrança — **não** é 1:1 como cobrança/negociação:
  uma cobrança pode ter várias linhas de pagamento até quitar
  `valor_cobranca` (pagamento parcial é o caso comum, não a exceção).
  Campos: valor, data do pagamento, forma (pix/boleto/transferência/
  outro), observação, quem registrou.
- **`public.register_pagamento()`**: único caminho para registrar um
  pagamento — grava a linha e recalcula o status da cobrança
  (`partially_paid` ou `paid`, comparando a soma de todos os pagamentos
  contra `valor_cobranca`) na mesma transação, reaproveitando
  `change_cobranca_status` (Rodada 5) para que a mudança também gere o
  evento correspondente na timeline da cobrança — terceira rodada
  seguida reaproveitando esse mesmo RPC central.
- Trigger de integridade: `tenant_id`/`empresa_id` do pagamento têm que
  bater com os da cobrança de origem.
- RLS/grants no mesmo padrão já validado (staff GSBC insere, sindicato
  lê; sem policy de update/delete — correção de um pagamento errado
  entra como um novo registro, não editando o histórico).

### UI
- `/backoffice/financeiro` — visão consolidada de todas as cobranças:
  valor total, pago, saldo, vencimento e um indicador "vencida" (calculado
  na consulta, não armazenado — vencimento passado + saldo > 0 + status
  não encerrado), com métricas de total cobrado, total pago e contagem de
  cobranças vencidas.
- Página da cobrança: card "Pagamentos" com o ledger completo e a ação
  "Registrar pagamento" (dialog com valor, data e forma).
- Ficha 360º da empresa: placeholder "Financeiro" substituído por um
  resumo real (total cobrado, pago, saldo, cobranças vencidas); o
  placeholder restante (Documentos) e "Timeline consolidada" renumerados
  para Rodada 9.
- Dashboard: card "Total pago" somando todos os pagamentos visíveis pelo
  usuário logado.
- Menu lateral: item "Financeiro" entre Negociações e Usuários.

### Auditoria
`pagamento.registrado` via `log_audit_event`, em paralelo ao evento que
`change_cobranca_status` já gera na timeline da cobrança quando o status
muda — mesmo padrão de "dois registros, dois propósitos" das rodadas
anteriores.

## Arquivos criados
`src/app/backoffice/financeiro/**`, `src/lib/validation/pagamento.ts`,
`src/app/backoffice/empresas/[id]/financeiro-summary.tsx`,
`supabase/migrations/0012_pagamentos.sql`.

## Arquivos alterados
`src/app/backoffice/cobrancas/[id]/page.tsx` (card de pagamentos + ação),
`src/app/backoffice/empresas/[id]/page.tsx` (placeholder → resumo real),
`src/app/backoffice/page.tsx` (card de total pago),
`src/components/backoffice/nav-items.ts`, `src/types/database.types.ts`,
`supabase/seed.sql` (negociação de demonstração avançada para "aceita",
2 pagamentos de demonstração).

## Banco de dados
`0012_pagamentos.sql`: tabela `pagamentos`, trigger de integridade,
função `register_pagamento`, RLS e grants.

## Segurança
`register_pagamento` é `SECURITY INVOKER` — não contorna RLS, só garante
que o registro do pagamento e a atualização de status aconteçam na mesma
transação.

## Testes realizados
Verificação real pelo navegador antes de reportar como concluído (regra
92), incluindo um caso deliberadamente desalinhado para provar a
limitação documentada abaixo:

- Ajustei o seed para que a negociação de demonstração fosse aceita a
  R$ 1.150,00 (desconto sobre o valor original de R$ 1.285,00) e
  registrei um primeiro pagamento de R$ 1.150,00 — a cobrança ficou
  **"Parcialmente paga"** com saldo de R$ 135,00, mesmo o acordo tendo
  sido cumprido integralmente. Confirmei isso na tela `/backoffice/
  financeiro` antes de qualquer ajuste — é o comportamento real do
  sistema hoje, não um bug corrigido às pressas.
- Abri a cobrança pela UI e registrei o pagamento dos R$ 135,00
  restantes — o status mudou sozinho para **"Paga"**, saldo devedor
  zerado, toast de confirmação, os dois pagamentos listados no ledger
  com autor e forma de pagamento.
- Ficha 360º da empresa: seção "Financeiro" refletindo os mesmos
  números (R$ 1.285,00 cobrado, R$ 1.285,00 pago, R$ 0,00 em aberto, 0
  vencidas) — consistente entre as duas telas.
- `npm run build`, `npx tsc --noEmit`, `npx eslint .` sem erros.
- Sem erros no console do navegador em nenhuma das telas testadas.

## Decisões arquiteturais
Nenhum ADR novo — reaproveita o padrão de ledger imutável + RPC
transacional já validado nas Rodadas 5/7.

## Pendências
- **Reconciliação entre valor negociado e `valor_cobranca`**: `pagamentos`
  compara o total pago contra `valor_cobranca` (principal + atualização,
  fixo desde a criação), não contra `valor_atual` da negociação aceita.
  Na prática, um acordo com desconto legítimo aparece como
  "parcialmente pago" mesmo cumprido — comportamento real, verificado
  no teste acima, não corrigido nesta rodada porque ajustar
  `valor_cobranca` por negociação é uma decisão de regra de negócio
  (não confirmada) sobre se o desconto deveria alterar o valor de
  referência ou ficar só registrado como histórico da negociação.
  **PENDING BUSINESS RULE.**
- Estorno/correção de pagamento lançado errado — hoje não há um
  caminho formal (a única correção possível é um novo registro
  compensatório, sem um "tipo: estorno" dedicado).
- Documentos (instrumentos, notificações, acordos, comprovantes) —
  bloqueado por Storage desabilitado localmente (ver Escopo acima).
- "Cobrança vencida" é um indicador calculado na consulta, não um status
  automático — nenhuma cobrança muda de status sozinha por passar do
  vencimento (mesma postura de "sem máquina de estados rígida" das
  rodadas anteriores).

## Riscos residuais
| Risco | Classificação | Observação |
|---|---|---|
| `valor_cobranca` não reconciliado com desconto negociado | Médio | Documentado acima como PENDING BUSINESS RULE; visível na UI (saldo > 0 mesmo com acordo cumprido), não escondido |
| Sem tipo de estorno em `pagamentos` | Baixo | Correção manual via novo registro ainda é auditável e visível no ledger |

## Regras de negócio pendentes
- Quando um acordo de negociação tem valor menor que `valor_cobranca`,
  o valor de referência para "quitação" deveria ser `valor_cobranca`
  original ou o `valor_atual` negociado? Hoje o sistema usa o original.

## Próxima rodada recomendada
Rodada 9 — Timeline consolidada da empresa (unificando cobrança,
negociação e pagamento em uma única linha do tempo por empresa) e/ou
Documentos, assim que o Storage local puder ser reativado.
