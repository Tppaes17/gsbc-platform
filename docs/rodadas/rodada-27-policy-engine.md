# GSBC — Rodada 27 (STG-11 — Policy Engine)

## Objetivo
Centralizar políticas de decisão/automação da plataforma — versionadas,
auditáveis, ativáveis/desativáveis, explicáveis, sem criar uma
linguagem de regra própria (proibição explícita do roadmap:
`docs/roadmap-stagings.md`, STG-11). Registro de decisão com o formato
literal do roadmap: `policy_id, version, inputs, result, reason,
timestamp`.

## Diagnóstico e decisão de escopo

Dos 5 exemplos do roadmap, 3 já eram comportamento real e testado em
rodadas anteriores (pagamento identificado pausa cobrança — Rodada 8;
contestação suspende automação — Rodada 21; régua avança por
agendamento — Rodada 19), e 2 nunca tinham sido implementados:

- **"Desconto > X → aprovação"**: pendência explícita desde as Rodadas
  5 e 7, citando "regra 27" do prompt-mestre — que pedia
  deliberadamente para NÃO travar uma regra rígida antes de existir uma
  arquitetura parametrizável. STG-11 é exatamente essa arquitetura.
- **"Acordo inadimplente → criar work item"**: não existia nenhum
  código para isso. `negociacao_parada` (Rodada 19) cobre um caso
  semanticamente diferente — estagnação ANTES de um acordo existir
  (dias sem proposta/contraproposta), não inadimplência DEPOIS do
  acordo firmado.

Decisão confirmada com o usuário: as 2 políticas novas viram
`enforcement='aplicada'` — o toggle `ativa` realmente muda
comportamento. As 3 já hardcoded viram `enforcement='registrada'` —
ganham nome, versão, descrição e um registro de decisão auditável a
cada vez que disparam, mas desligar o toggle ainda não muda o
comportamento de fato (isso exigiria retocar `register_pagamento`,
`STATUS_PAUSAM_REGUA` e o motor da régua, fora do escopo seguro desta
rodada). A UI (`policy-card.tsx`) deixa essa distinção explícita —
nunca finge que uma política "registrada" é controlável quando não é
(regra 9: não criar funcionalidade falsa).

### Limite de desconto: zero tolerância, decisão confirmada com o
### usuário
`parametros.limite_percentual = 0` — **qualquer** desconto (mesmo de
R$0,01) exige aprovação do Owner. O parâmetro vive em `policies.parametros`
(jsonb) justamente para poder ser ajustado numa rodada futura sem
reescrever a função — mas não há UI de edição de parâmetro nesta
rodada (só o toggle ativa/desativa).

### Aprovador: Owner, não um papel novo
Diferente da Rodada 25 (Escalonamentos, papel Jurídico), aqui a decisão
confirmada com o usuário foi manter no Owner (`gsbc_super_admin`) — o
mesmo papel já usado em Prospectos e no Opportunity Engine.

## A lição da Rodada 25 se repete — e por quê ela importa aqui de
## verdade

`register_negociacao_evento` (Rodada 7) era `security invoker`, com
policies de RLS amplas (`is_platform_staff` pro staff,
`is_empresa_contato` pro portal desde a Rodada 22) permitindo UPDATE
direto em `negociacoes`. Introduzir "desconto exige aprovação" só
dentro da função, sem mexer em mais nada, teria sido **inútil**: qualquer
staff (ou o próprio contato do portal) continuaria conseguindo fazer
`update negociacoes set status='aceita'` direto na tabela, contornando
a aprovação inteiramente — a política existiria só no caminho "feliz",
não como uma garantia real.

Solução: `register_negociacao_evento` virou `security definer`
(verificando staff OU portal, e restringindo o portal a
`contraproposta_empresa`/`aceite`, replicando o que a RLS fazia antes),
a lógica de desconto foi movida pra dentro dela, e as 4 policies que só
existiam para viabilizar o UPDATE/INSERT de uma função invoker foram
derrubadas (`negociacoes_update`, `negociacoes_update_portal`,
`negociacao_eventos_insert`, `negociacao_eventos_insert_portal`). Toda
escrita em `negociacoes`/`negociacao_eventos` agora passa
exclusivamente por `register_negociacao_evento()` ou
`decidir_aprovacao_desconto()` — ambas `security definer`.

**Verificado ao vivo, os dois níveis de defesa** (mesmo protocolo da
Rodada 25):
- `decidir_aprovacao_desconto()` chamado via RPC direto por um staff
  `gsbc_analista` real (não Owner) foi rejeitado com "Apenas o Owner
  pode aprovar ou rejeitar um desconto."
- Um `UPDATE negociacoes SET status='aceita'` direto na tabela, pelo
  mesmo usuário simulado, afetou **0 linhas** — confirmando que a
  ausência da policy de UPDATE é o que realmente bloqueia o bypass, não
  só a checagem dentro da função.
- Uma nova tentativa de registrar QUALQUER movimento
  (`register_negociacao_evento`) enquanto a negociação está
  `aguardando_aprovacao` também é rejeitada — evita confusão de dois
  movimentos concorrentes disputando a mesma decisão pendente.

## Cascata pra cobrança: no aceite (sem desconto) ou na aprovação (com
## desconto) — nunca duas vezes, nunca pelo portal sozinho

A cascata `change_cobranca_status(..., 'agreement_reached', ...)`
migrou de dentro da Server Action (TypeScript) pra dentro da própria
função SQL — mesmo racional já usado em Escalonamentos (Rodada 25) e
Contestações (Rodada 21/22): a função que decide o estado é quem
dispara o efeito colateral, atomicamente, na mesma transação. Duas
regras preservadas do desenho original (Rodada 7/22), verificadas ao
vivo:
- **Aceite via portal nunca cascata sozinho** — mesmo sem desconto, um
  aceite pelo contato da empresa não muda `cobrancas.status`; fica pra
  um humano da GSBC confirmar depois via "Mudar status".
- **Sem duplicação**: testado registrando dois envios de "aceite"
  distintos aprovados na sequência (um da própria fixture, um segundo
  simulando reenvio) — `cobranca_eventos` nunca ganhou uma segunda
  linha `agreement_reached` redundante.

## Implementações
- `supabase/migrations/0027_policy_engine.sql` — tabelas `policies`
  (registro, seed com as 5 políticas) e `policy_decisoes` (log
  imutável), função `alternar_policy_ativa()` (Owner, security
  definer), `register_negociacao_evento()` retrofit (security definer,
  gate de desconto, dual-auth staff/portal), `decidir_aprovacao_desconto()`
  (nova, Owner, security definer), `register_pagamento()` e
  `abrir_contestacao()` com logging adicionado (comportamento
  inalterado), `negociacoes.status` ganha `'aguardando_aprovacao'`,
  `work_items.tipo` ganha `'acordo_inadimplente'`.
- `src/lib/policies/log.ts` — `registrarDecisaoPolicy()`, usado pelos
  sweeps/motor em TypeScript (mesmo padrão SQL/TS já usado em outras
  rodadas: cálculo simples, sem linguagem de regra própria).
- `src/lib/operations/sync.ts` — `syncAcordosInadimplentes()`: cobrança
  `agreement_reached` há mais de `dias_limite` dias sem quitação total
  → cria `work_items` tipo `acordo_inadimplente`; auto-resolve quando
  pago. Desligar a política (`ativa=false`) pausa a varredura inteira,
  inclusive o fechamento de itens que já não valem mais — mesmo
  racional de "automação interrompível" (regra 6).
- `src/lib/collection/engine.ts` — log de `regua_avanca_por_agendamento`
  a cada avanço real de step.
- `src/app/backoffice/negociacoes/{actions.ts, [id]/page.tsx, [id]/decidir-desconto-dialog.tsx}`
  — banner "Aguardando aprovação de desconto" + ações de
  aprovar/rejeitar (Owner apenas).
- `src/app/backoffice/politicas/{page.tsx, policy-card.tsx, decisoes-list.tsx, actions.ts}`
  — Central de Políticas: lista as 5, badge Ativa/Inativa e
  Aplicada/Registrada, toggle (Owner), log de decisões recentes.
- Item de nav "Políticas", staff apenas.
- `e2e/politicas.spec.ts`.

## Arquivos criados
`supabase/migrations/0027_policy_engine.sql`, `src/lib/policies/log.ts`,
`src/app/backoffice/negociacoes/[id]/decidir-desconto-dialog.tsx`,
`src/app/backoffice/politicas/{page.tsx, policy-card.tsx, decisoes-list.tsx, actions.ts}`,
`e2e/politicas.spec.ts`.

## Arquivos alterados
`src/types/database.types.ts` (tabelas `policies`/`policy_decisoes`,
`NegociacaoStatus`/`WorkItemTipo` estendidos, `negociacoes.Update` →
`never`), `src/lib/operations/sync.ts`, `src/lib/collection/engine.ts`,
`src/lib/validation/negociacao.ts`,
`src/app/backoffice/negociacoes/{actions.ts, negociacoes-table.tsx, [id]/page.tsx}`,
`src/app/backoffice/empresas/[id]/negociacoes-list.tsx`,
`src/app/portal/(contato)/cobrancas/[id]/actions.ts`,
`src/components/backoffice/nav-items.ts`.

## Banco de dados
`0027_policy_engine.sql`: 2 tabelas novas (`policies`, `policy_decisoes`),
seed de 5 políticas. `negociacoes.status` ganha `aguardando_aprovacao`;
`work_items.tipo` ganha `acordo_inadimplente`. RLS: `policies`/
`policy_decisoes` restritas a staff (`is_platform_staff`) — sem policy
de UPDATE em `policies` (só via `alternar_policy_ativa`, Owner). Em
`negociacoes`/`negociacao_eventos`: **derrubadas** 4 policies de
escrita que existiam só pra viabilizar um RPC `security invoker` —
única escrita possível agora é via `register_negociacao_evento`/
`decidir_aprovacao_desconto` (ambas `security definer`).

## Segurança
- Aprovação de desconto restrita ao Owner — dois níveis de defesa
  verificados ao vivo (RPC rejeita chamada direta de um não-Owner;
  ausência de policy de UPDATE bloqueia bypass via escrita direta na
  tabela). Ver seção "A lição da Rodada 25 se repete" acima.
- Portal continua sem conseguir forjar `proposta_gsbc` nem cascatar
  `cobrancas.status` sozinho — ambas as restrições, antes garantidas só
  por RLS, agora são checadas explicitamente dentro da função (defesa
  em profundidade, RLS deixou de ser a única barreira desde que a
  função virou security definer).
- `policy_decisoes` é log imutável (sem policy de update/delete) —
  histórico de decisão nunca é reescrito, mesmo se uma política mudar
  de versão depois.

## Testes realizados
Verificação real, ao vivo, local **e** staging (regra 92):

- **Ciclo completo de desconto (staff)**: negociação criada via UI real
  → aceite de R$800 numa cobrança de R$1.000 (20% de desconto) →
  `aguardando_aprovacao` confirmado na UI e no banco → decisão log
  `aprovacao_necessaria` com o percentual exato (20.00%) → Owner aprova
  via UI → negociação `aceita`, cobrança cascata pra
  `agreement_reached`, segunda linha de decisão `aprovado` registrada.
- **Caminho de rejeição**: aceite com desconto → `decidir_aprovacao_desconto(false)`
  → negociação volta pra `em_negociacao` (não um beco sem saída),
  cobrança nunca muda de status.
- **Aceite sem desconto continua direto**: valor cheio → `aceita` +
  cascata imediata, sem gate — comportamento pré-existente preservado.
- **Portal**: contato tentando `proposta_gsbc` rejeitado (spoofing
  bloqueado); aceite com desconto pelo portal também vai pra
  `aguardando_aprovacao` e não cascata sozinho; aprovado pelo Owner,
  cascata acontece (o humano da GSBC é quem efetivamente causa o
  efeito, mesmo pra um aceite que começou no portal).
- **2 camadas de segurança do gate de aprovação**: RPC direto como
  staff não-Owner rejeitado; UPDATE direto na tabela como o mesmo
  usuário afetou 0 linhas.
- **Guarda contra movimento concorrente**: novo evento tentado enquanto
  `aguardando_aprovacao` rejeitado com mensagem clara.
- **Acordo inadimplente**: fixture com cobrança `agreement_reached` há
  20 dias sem pagamento → sweep via `/api/cron/collection-engine`
  criou o work item corretamente (com saldo pendente calculado certo)
  e logou a decisão; pagamento total registrado → segundo sweep
  auto-resolveu o item.
- **Toggle ativa/desativa, funcional de verdade**: desativado via UI
  (Owner) → sweep seguinte não criou item novo pra uma fixture
  genuinamente qualificada (`acordosInadimplentesAbertos: 0`, 0 work
  items no banco); reativado → sweep seguinte voltou a detectar a mesma
  fixture (`acordosInadimplentesAbertos: 1`).
- **Políticas "registradas"**: `register_pagamento` (pagamento total)
  logou `pagamento_pausa_regua` com `resultado='paid'`;
  `abrir_contestacao` logou `contestacao_suspende_regua` com
  `resultado='pausada'` — comportamento das duas funções (cascata de
  status) permaneceu idêntico ao de antes da rodada.
- **Central de Políticas** (`/backoffice/politicas`): lista as 5 com
  badges corretos (Ativa/Inativa, Aplicada/Registrada), toggle
  funcional, log de decisões recentes exibindo o resultado certo.
- `npx tsc --noEmit`, `npx eslint .` (0 erros — 1 warning pré-existente
  não relacionado), `npm run build` sem erros.
- **Deploy em staging** (Vercel + Supabase Cloud): migration 0027
  aplicada via SQL Editor (acentuação verificada antes de rodar — a
  migration incluiu DROP de constraint/policy, confirmado
  deliberadamente no diálogo "operação destrutiva" do Supabase após
  revisão completa), 2 tabelas novas confirmadas, policies de UPDATE
  derrubadas confirmadas por query direta em `pg_policies`.
- **e2e automatizado** (`e2e/politicas.spec.ts`, 3 testes: página lista
  as 5 políticas, nav item visível, sindicato não acessa) — 3/3
  passando em staging. Suíte completa: 43/44 (excluindo uma falha
  transiente de rede reproduzida como flaky — confirmada ao rodar o
  spec isolado, que passou limpo) — as mesmas 3 falhas pré-existentes
  já documentadas desde as Rodadas 21/22/23, nenhuma nova.
- Todos os artefatos de teste (obrigações, cobranças, negociações,
  eventos, work items, decisões de política, contestação, pagamento, e
  o usuário/vínculo de portal temporário — revertendo `empresa_contatos`
  ao estado original) apagados/revertidos depois — 322 prospectos
  reais, 2 empresas, 1 cobrança/pagamento real, 2 obrigações reais e 1
  negociação real (seed) reverificados intactos por contagem após a
  limpeza (local).

### O que não foi testado ao vivo
- **`regua_avanca_por_agendamento` disparando de verdade**: o log foi
  adicionado no ponto certo do código (revisado, não exercitado ao vivo
  — exigiria um enrollment real atingindo a data agendada de um step,
  fora do alcance prático de uma sessão de testes).

## Pendências
- **3 políticas "registradas" ainda não respeitam o toggle de
  verdade** — desligar `pagamento_pausa_regua`,
  `contestacao_suspende_regua` ou `regua_avanca_por_agendamento` na UI
  não muda comportamento algum ainda; isso está documentado
  explicitamente na própria UI (`enforcement='registrada'`), não é uma
  promessa quebrada, mas seguir esse retrofit é trabalho futuro se
  priorizado.
- **Sem UI de edição de parâmetro** (`limite_percentual`, `dias_limite`)
  — só o toggle ativa/desativa é editável via app nesta rodada; mudar
  um parâmetro hoje exige uma migration.
- **`regua_avanca_por_agendamento` não exercitada ao vivo** — ver acima.

## Riscos residuais
| Risco | Classificação | Observação |
|---|---|---|
| Políticas "registradas" com toggle não-funcional podem confundir quem não ler a distinção na UI | Baixo | UI já rotula explicitamente "Aplicada" vs. "Registrada" com texto explicando a diferença |
| `regua_avanca_por_agendamento` só revisada por código, não exercitada ao vivo | Baixo | Mudança aditiva (só um insert de log), mesmo padrão já provado em `pagamento_pausa_regua`/`contestacao_suspende_regua` |
| Limite de desconto (0%) sem UI de ajuste | Esperado | Decisão confirmada com o usuário; ajuste futuro é uma migration, não um retrofit de arquitetura |

## Regras de negócio pendentes
Nenhuma nova — as três decisões desta rodada (escopo v1 com 2 políticas
aplicadas + 3 registradas, limite de desconto zero, aprovador = Owner)
foram confirmadas com o usuário antes de implementar.

## Próximo staging recomendado
STG-12 (AI Copilot + Agentic Collections) é o último item do roadmap.
A Regra Estratégica Final do roadmap já estava satisfeita antes desta
rodada mesmo (Collection Strategy Engine, Dispute Management, Payment
Provider, Opportunity Engine — STG-02/04/06/10 — já entregues); com o
Policy Engine também no lugar, todas as camadas que o roadmap pede
antes de "IA/agentes" estão prontas.
