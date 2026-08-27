# GSBC — Rodada 24 (STG-08 — Revenue Command Center)

## Objetivo
Dashboard de receita do sindicato — do identificado ao recebido — com
os 8 KPIs, funil de 5 estágios com conversões reais, tendência mensal
(prevista x realizada, com acumulado) e segmentação, todo KPI com
drill-down pros registros de origem (`docs/roadmap-stagings.md`,
STG-08). STG-07 (Split/Conciliação/Repasses) foi explicitamente pulado
por decisão do usuário — já recomendado no fechamento da Rodada 23
(rodada-23-payment-provider.md), já que ainda não há pagamentos reais
fluindo por um provider de verdade, o que tornaria split/conciliação
sobre simulação de valor limitado.

## Diagnóstico e decisões arquiteturais

### O funil não pode ser um snapshot de status atual
A tentação óbvia é agrupar `cobrancas` pelo `status` de hoje. Isso
mente: uma cobrança que chegou a "negociando" e foi cancelada depois
sumiria inteiramente de "Negociado" — como se a negociação nunca
tivesse existido. Resolvido calculando, por cobrança, o **maior rank
histórico já alcançado** (`STATUS_RANK`, via `cobranca_eventos.to_status`)
em vez do status atual — `src/lib/revenue/funnel.ts`. Verificado com
fixture construída especificamente pra isso: uma cobrança de R$500 que
percorreu draft→approved→notified→negotiating→cancelled apareceu
corretamente no numerador/denominador de "Negociado" e não em
"Recebido", produzindo 72,0% de conversão Negociado→Recebido — o
número matematicamente correto pro cenário montado.

### `obrigacoes.status` é campo morto — funil não pode se apoiar nele
Antes de desenhar o funil, grep exaustivo em todo o código por
`'validated'` e `'fulfilled'` (os dois status "avançados" de
`obrigacoes.status`) não encontrou nenhum caminho que os escreva —
nenhuma tela, nenhuma RPC, nenhum trigger jamais promove uma obrigação
além de `pending_validation`. Construir o funil em cima desse campo
mostraria eternamente R$0 nos estágios intermediários, iludindo o
sindicato. Por isso o funil usa `cobrancas.status` (ativamente
exercitado em todo o app) do estágio "Validado" em diante — só
"Identificado" usa `obrigacoes.valor_referencia`, que é o único dado
real disponível antes de uma cobrança existir.

### Drill-down: aproximação conhecida, documentada em código
O funil (cumulativo, histórico) e o link de drill-down pra
`/backoffice/cobrancas?status=...` (que só pode filtrar pelo status
**atual**, já que é isso que a tabela mostra) não são exatamente a
mesma coisa — uma cobrança negociada-depois-cancelada conta em
"Negociado" no funil mas não aparece no drill-down de "Negociado"
(status atual já não é mais um dos listados). Isso está documentado em
comentário de código (`funnel-section.tsx`, `STAGE_STATUS_FILTER`) e
abaixo em Pendências — não é um bug, é um limite inerente de expor
"todo estado que já foi tocado" via uma tela que só sabe filtrar por
estado atual.

### KPI "Receita identificada" não tem drill-down
É o único dos 8 KPIs sem link de origem: é baseado em `obrigacoes`, não
em `cobrancas`, e `/backoffice/cobrancas` (o único drill-down existente
no sistema pra dado financeiro) não tem uma visão de obrigações pra
apontar. O roadmap pede drill-down pra "todo KPI" — ver Pendências.

### Nenhuma migration nova
STG-08 é inteiramente leitura/computação sobre tabelas já existentes
(`obrigacoes`, `cobrancas`, `cobranca_eventos`, `negociacoes`,
`pagamentos`) — nenhuma tabela ou coluna nova, nenhuma RLS nova. A
segurança já vem de graça das políticas existentes: a página não tem
nenhum gate de `isPlatformStaff` (nem na página nem em nenhum
componente filho) — RLS escopa cada query automaticamente por tenant,
exatamente como Auditoria (Rodada 20) já fazia. Verificado ao vivo (ver
Testes): staff vê os dois tenants de teste, sindicato vê exatamente o
mesmo total porque as duas empresas de teste pertencem ao único tenant
demo do sindicato — não um caso especial no código, só RLS funcionando.

## Implementações
- `src/lib/revenue/funnel.ts` — `computeFunnel()` (rank histórico via
  `cobranca_eventos`), `computeConversions()`.
- `src/lib/revenue/kpis.ts` — `computeKpis()`, os 8 KPIs do roadmap.
- `src/lib/revenue/trend.ts` — `computeMonthlyTrend()` (previsto por
  vencimento, realizado por pagamento, acumulado).
- `src/app/backoffice/receita/page.tsx` — Server Component, visível a
  staff e sindicato (regra 6 — "o sindicato acompanha").
- `src/app/backoffice/receita/{kpi-grid,funnel-section,trend-chart,segmentacao-section}.tsx`.
- `/backoffice/cobrancas` estendido: `?status=a,b,c` (multi-valor,
  drill-down dos KPIs/funil/segmentação) e `?empresaId=X`, com
  indicador "Filtrado por..." e link "Limpar filtro".
- Item de nav "Receita" (`nav-items.ts`), visível aos dois papéis, logo
  após "Visão Geral".
- `e2e/receita.spec.ts`.

## Arquivos criados
`src/lib/revenue/{funnel.ts, kpis.ts, trend.ts}`,
`src/app/backoffice/receita/{page.tsx, kpi-grid.tsx, funnel-section.tsx, trend-chart.tsx, segmentacao-section.tsx}`,
`e2e/receita.spec.ts`.

## Arquivos alterados
`src/app/backoffice/cobrancas/page.tsx` (filtro multi-status +
empresaId + indicador de filtro), `src/components/backoffice/nav-items.ts`.

## Banco de dados
Nenhuma migration nova — só leitura sobre tabelas e RLS já existentes.

## Segurança
- Página sem gate de papel — RLS de `obrigacoes`/`cobrancas`/
  `cobranca_eventos`/`negociacoes`/`pagamentos` (já auditadas em
  rodadas anteriores) é a única barreira, e já escopa por tenant.
  Verificado ao vivo que sindicato não vê nada fora do seu tenant (não
  havia outro tenant com dado de teste pra comparar além do demo, mas o
  mecanismo é o mesmo já verificado em Auditoria/Rodada 20).
- `statusList` em `cobrancas/page.tsx` vem de query string e é usada
  direto em `.in("status", statusList)` — cast `as CobrancaStatus[]`
  documentado em comentário: valor vem só de links internos nossos,
  nunca de input livre de usuário; um valor inválido só resulta em 0
  linhas (Postgres rejeita silenciosamente um enum inválido no filtro),
  nenhum risco de injeção (Supabase client parametriza).

## Testes realizados
Verificação real, ao vivo, local **e** staging (regra 92):

- **Funil não-linear**: fixture com cobrança draft→approved→notified→
  negotiating→cancelled (R$500) apareceu em "Negociado" e não em
  "Recebido" — conversão Negociado→Recebido calculada em 72,0%,
  conferida manualmente por aritmética.
- **KPI "Receita vencida"**: fixture com cobrança `overdue` e
  vencimento passado apareceu corretamente separada de "Receita em
  cobrança".
- **"Receita validada" exclui rascunho**: fixture com cobrança `draft`
  não contou em "Validada" (só em "Identificado").
- **Bug real encontrado e corrigido ao vivo**: label de unidade do
  estágio "Identificado" estava hardcoded como "cobrança(s)" pros 5
  estágios — só "Identificado" conta obrigações. Corrigido pra label
  condicional (`funnel-section.tsx`).
- **Papel staff** (`admin.demo@gsbc.com.br`): página completa
  renderizou — 8 KPIs, funil de 5 estágios com conversões, gráfico de
  tendência (recharts), segmentação por empresa, todos os links de
  drill-down testados manualmente levando a `/backoffice/cobrancas`
  com o filtro certo aplicado e o indicador "Filtrado por..." visível.
- **Papel sindicato** (`dirigente.demo@sindicatodemonstracao.org.br`):
  mesma página, mesmos números que staff — esperado, já que as duas
  empresas de teste pertencem ao único tenant demo do sindicato; RLS
  escopando corretamente sem nenhum código condicional por papel.
- **Limpeza de fixtures e reverificação**: as 3 cobranças de teste
  (`99000000-...-070/067/066`), 2 obrigações (`...069/068`) e os 9
  `cobranca_eventos` associados foram apagados após os testes; contagem
  reverificada — 322 `dossies_cadastrais`, 2 `empresas`, 1 `cobrancas`
  real, 1 `pagamentos` real, 2 `obrigacoes` reais intactos, local. Tela
  re-verificada com dado limpo: "Receita identificada" R$3.350,00 (2
  obrigações reais), "Receita validada"/"Receita recebida" R$1.285,00 /
  R$1.150,00 batendo com o único par cobrança/pagamento real.
- `npx tsc --noEmit`, `npx eslint .` (0 erros — 1 warning pré-existente
  não relacionado, `data-table.tsx`/React Compiler), `npm run build`
  sem erros.
- **Deploy em staging** (Vercel + Supabase Cloud,
  `gsbc-platform.vercel.app`): página renderizou com os dados reais do
  seed de staging, números idênticos em forma ao ambiente local
  (2 obrigações reais, 1 cobrança/pagamento real).
- **e2e automatizado** (`e2e/receita.spec.ts`, 4 testes, cobrindo o que
  não muda dado em staging: página carrega pros dois papéis, nav item
  visível, drill-down de status mostra indicador de filtro): 4/4
  passando em staging. Suíte completa: 35/38 passando — as mesmas 3
  falhas pré-existentes já documentadas nas Rodadas 21/22/23 (SMTP sem
  provider customizado, dados de prospectos não resetados entre runs),
  nenhuma nova.

## Pendências
- **Segmentação incompleta frente ao roadmap** — implementada só "por
  empresa"; o roadmap pede também por obrigação, período e status.
  Adiado por escopo/tempo desta rodada — extensão direta da mesma
  seção (`segmentacao-section.tsx`) quando priorizado.
- **KPI "Receita identificada" sem drill-down** — é o único dos 8 sem
  link de origem, porque é baseado em `obrigacoes` e
  `/backoffice/cobrancas` (único drill-down existente) não tem visão de
  obrigações. Fica pendente até existir uma tela de obrigações (ou até
  o drill-down apontar pra ficha da empresa/instrumento de origem).
- **Drill-down do funil é aproximado** (ver Diagnóstico) — reflete
  status atual, não o histórico cumulativo que o funil mostra. Diferença
  visível só em cenários de cancelamento pós-avanço, documentada em
  comentário de código.

## Riscos residuais
| Risco | Classificação | Observação |
|---|---|---|
| Drill-down do funil não é 100% fiel ao número mostrado (histórico vs. status atual) | Baixo | Documentado em código e aqui; diferença só aparece em cancelamento pós-avanço |
| Segmentação parcial (só empresa) frente ao pedido do roadmap | Baixo | Extensão direta quando priorizado, mesma estrutura já existe |
| Dado de poucos registros reais (1 cobrança) limita o quanto o dashboard "prova" visualmente | Esperado nesta fase | Mesma limitação de todas as rodadas anteriores — cresce com uso real |

## Regras de negócio pendentes
Nenhuma nova.

## Próximo staging recomendado
STG-09 (Escalonamento + Notificação Extrajudicial) é o próximo item
não pulado do roadmap. Alternativa: revisitar STG-07 quando/se um
provider de pagamento real for conectado (STG-06 ficou como
abstração pura) — split/conciliação sobre simulação continua de valor
limitado até lá.
