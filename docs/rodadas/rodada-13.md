# GSBC — Rodada 13

## Objetivo
Resolver a regra de negócio pendente registrada desde a Rodada 8: quando
uma negociação é aceita com valor menor que o `valor_cobranca` original,
qual valor deve ser usado para considerar a cobrança "quitada"?

## Decisão do usuário
Perguntado diretamente (três opções: valor negociado, valor original
sempre, ou uma regra granular por tipo de desconto), o usuário escolheu
**valor negociado**: quando existe uma negociação aceita, a cobrança
passa a ser considerada "paga" quando o valor ACORDADO é quitado — não o
valor original. O valor original de `cobrancas.valor_cobranca` continua
intacto (histórico/auditoria); só o critério de quitação muda.

## Estado inicial
Rodadas 1–12 funcionando e testadas. O comportamento antigo — verificado
e documentado como teste real na Rodada 8 — fazia uma cobrança com
acordo cumprido integralmente aparecer permanentemente como
"parcialmente paga", porque `register_pagamento` só comparava o total
pago contra `valor_cobranca`.

## Implementações

### Banco de dados
- **`public.valor_referencia_cobranca(p_cobranca_id)`**: nova função SQL
  — retorna o `valor_atual` da negociação aceita vinculada à cobrança
  (se houver), senão o `valor_cobranca` original. Único lugar onde essa
  regra é definida no banco.
- **`register_pagamento`**: atualizado para usar
  `valor_referencia_cobranca()` em vez de `valor_cobranca` direto na
  decisão de status (`paid` vs `partially_paid`) — a mudança mínima
  necessária para a regra valer de verdade na quitação.

### Aplicação
- `src/lib/finance/referencia.ts`: espelho em TypeScript da mesma regra
  (`valorReferenciaCobranca()`), usado em toda tela que precisa mostrar
  saldo/quitação sem chamar o banco de novo — mesma lógica, uma função,
  sem duplicar em cada página.
- Página da cobrança: mostra "Valor original" e "Valor acordado
  (negociação)" lado a lado quando os dois divergem; o card de
  Pagamentos passou a calcular o saldo contra o valor de referência.
- `/backoffice/financeiro`: coluna "Valor total" ganhou uma segunda
  linha ("Acordado: R$ X") quando a cobrança tem negociação aceita com
  desconto; saldo e "cobranças vencidas" recalculados pela mesma regra.
- Ficha 360º da empresa: **bug real encontrado e corrigido na mesma
  rodada** — o resumo financeiro calculava o saldo internamente a partir
  de `totalCobrado` (soma dos valores originais), ignorando a regra nova
  por completo. Corrigido passando um `saldoEmAberto` já calculado
  corretamente pela página-mãe, em vez de deixar o componente recalcular
  sozinho.

### Seed
Atualizado para refletir o resultado correto da regra nova: a cobrança
de demonstração, com um único pagamento de R$1.150,00 contra um acordo
aceito no mesmo valor, agora nasce como "Paga" (antes nascia
"Parcialmente paga" — esse era exatamente o comportamento que a regra
existia para corrigir).

## Arquivos criados
`supabase/migrations/0015_reconciliacao_valor_negociado.sql`,
`src/lib/finance/referencia.ts`.

## Arquivos alterados
`src/app/backoffice/cobrancas/[id]/page.tsx`,
`src/app/backoffice/financeiro/{page.tsx,financeiro-table.tsx}`,
`src/app/backoffice/financeiro/pagamentos-list.tsx` (prop renomeada
`valorCobranca` → `valorReferencia`), `src/app/backoffice/empresas/[id]/
{page.tsx,financeiro-summary.tsx}`, `src/types/database.types.ts`,
`supabase/seed.sql`, `e2e/financeiro-e-notificacoes.spec.ts`,
`e2e/README.md`.

## Banco de dados
`0015_reconciliacao_valor_negociado.sql`: função
`valor_referencia_cobranca`, `register_pagamento` atualizado para
usá-la. Nenhuma mudança de schema (nenhuma coluna nova) — é só uma
mudança de critério de cálculo.

## Segurança
`valor_referencia_cobranca` é `SECURITY INVOKER` — não contorna RLS, só
lê `negociacoes`/`cobrancas` com os privilégios de quem chama.

## Testes realizados
Verificação real pelo navegador, com o banco resetado, antes de
reportar como concluído (regra 92):

- Página da cobrança: status "Paga", "Valor original: R$ 1.285,00" e
  "Valor acordado (negociação): R$ 1.150,00" lado a lado, "Saldo
  devedor: R$ 0,00" — confirmando a regra nova com o mesmo pagamento que
  antes deixava a cobrança "parcialmente paga" para sempre.
- `/backoffice/financeiro`: linha da cobrança mostrando "R$ 1.285,00 /
  Acordado: R$ 1.150,00", saldo R$ 0,00.
- **Bug pego ao vivo, não em teste automatizado**: a ficha 360º da
  empresa ainda mostrava "Saldo em aberto: R$ 135,00" depois de tudo o
  mais já estar correto — corrigido na mesma verificação, antes de
  reportar como concluído.
- Suíte Playwright completa: 13/13 passando após o fix, incluindo um
  teste novo (`resumo financeiro da empresa também reconcilia pelo valor
  acordado`) escrito especificamente para travar essa regressão.
- `npm run build`, `npx tsc --noEmit`, `npx eslint .` sem erros.

## Decisões arquiteturais
Nenhum ADR novo — refinamento de uma regra de cálculo já modelada
(RPC + tabelas existentes), não uma mudança estrutural.

## Pendências
Nenhuma nova além das já registradas (estorno de pagamento, templates de
e-mail reutilizáveis — ver Rodada 11).

## Riscos residuais
| Risco | Classificação | Observação |
|---|---|---|
| Lógica de referência duplicada em SQL e TypeScript | Baixo | Mantidas propositalmente em paralelo (uma para a decisão autoritativa no banco, outra para exibição sem round-trip) — mas exige lembrar de atualizar as duas se a regra mudar de novo |

## Regras de negócio pendentes
Nenhuma — a única pendência registrada no projeto foi resolvida nesta
rodada.

## Próxima rodada recomendada
Deploy em produção (Supabase Cloud + Vercel, já confirmado como stack no
início do projeto) — o MVP está funcionalmente completo e sem regras de
negócio pendentes; o próximo passo de maior alavancagem é sair do
ambiente local.
