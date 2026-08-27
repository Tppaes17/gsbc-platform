# GSBC — Rodada 20 (STG-03 — Operations Center + Next Best Action)

## Objetivo
Transformar a plataforma de "system of record" em "system of action"
(`docs/roadmap-stagings.md`, STG-03): uma fila única do que a equipe
GSBC precisa fazer hoje, em vez de sinais espalhados dentro da timeline
de cada cobrança/negociação individual — a pergunta central do roadmap:
*"O que minha equipe precisa fazer hoje?"*

## Estado inicial
Régua de cobrança (Rodada 19) já criava tarefas humanas e pausava por
falha de automação — mas isso só aparecia na timeline da própria
cobrança. A própria Rodada 19 já registrou isso como pendência aberta
("Canal `tarefa_humana` não gera nada visível fora da timeline").

## Diagnóstico e escopo (antes de implementar)
O roadmap lista 8 blocos (Ações prioritárias, Aguardando resposta,
Follow-ups vencidos, Negociações paradas, Falhas de automação,
Pagamentos vencidos, Contestações pendentes, Escalonamentos). Nem todos
têm dado real por trás hoje:

- **Implementados** (5): tarefa da régua de cobrança, falha de
  automação, escalonamento, pagamento vencido, negociação parada.
- **Fora de escopo, deliberadamente** (3): "Contestações pendentes" — a
  entidade não existe (STG-04, Dispute Management, ainda não
  construído). "Aguardando resposta"/"Follow-ups vencidos" — não têm um
  sinal distinto dos outros 5 no schema atual; nada foi inventado só
  pra preencher a lista (regra 5.5 do AGENTS.md — nunca inventar dado).

## Decisões arquiteturais

### `work_items` é ponteiro, não cópia
Conforme o próprio roadmap ("WorkItem referencia entidades reais. Não
duplica domínio"): a tabela guarda `entity_type`/`entity_id` + estado de
workflow (status, prioridade, responsável, prazo) — nunca uma cópia dos
dados da cobrança/negociação.

### Dois mecanismos de geração, cada um com o comportamento certo pro seu tipo de sinal
- **Event-driven** (tarefa da régua, falha de automação, escalonamento):
  criados no exato momento em que o evento acontece, direto em
  `src/lib/collection/engine.ts` — são fatos pontuais ("aconteceu isso
  às 14h32"), não um estado contínuo. Só um humano marca como concluído.
- **State-derived** (pagamento vencido, negociação parada): computados
  por uma varredura periódica (`src/lib/operations/sync.ts`) a partir do
  estado atual de `cobrancas`/`negociacoes`. Diferente dos event-driven,
  **se fecham sozinhos** quando a condição deixa de valer — um pagamento
  vencido não é mais um pagamento vencido depois de pago, sem precisar
  de um humano pra descartar o item manualmente.

### Idempotência por dedupe, não por transação
Mesmo índice único parcial usado na Rodada 19
(`unique(tipo, entity_type, entity_id) where status in ('aberto','adiado')`)
— ressincronizar nunca duplica um item já aberto pra mesma condição.

### Bug real encontrado e corrigido durante a implementação (antes mesmo de testar)
Revisando o caminho de falha "sem retry" do e-mail da régua (template
ausente, empresa sem contato) — descobri que esses casos só marcavam a
**execução** como `failed`, sem pausar o **enrollment**. Como
`obterOuCriarExecucao()` só reprocessa execuções em status `scheduled`,
isso deixava o step travado pra sempre, sem nunca avançar nem aparecer
em lugar nenhum — silenciosamente. Corrigido: `marcarFalhaTerminal()`
agora sempre pausa o enrollment e cria um `work_item` de
`falha_automacao`, igual ao caminho de "esgotou as tentativas" que já
existia. Sem esse fix, STG-03 teria ficado cego pra exatamente o tipo de
falha que mais precisa de atenção humana.

### Um cron, não dois
`syncWorkItemsFromState()` roda dentro do mesmo `/api/cron/collection-engine`,
logo depois do `runCollectionSweep()` — o plano Hobby da Vercel já
limita frequência de cron (Rodada 19); rodar os dois juntos evita
esbarrar nesse limite de novo.

### Sem visibilidade pro sindicato
Diferente de `cobranca_eventos`/`notificacoes` (que são sobre
transparência do que já aconteceu — regra 6), `work_items` é uma
ferramenta de execução interna da GSBC ("o que **minha** equipe precisa
fazer"). RLS restrita a `is_platform_staff`.

## Implementações
- `work_items` (`0021_operations_center.sql`).
- `src/lib/operations/work-items.ts` — `criarWorkItemSeNaoExiste()`,
  usado tanto pelo caminho event-driven quanto pelo state-derived.
- `src/lib/operations/sync.ts` — `syncWorkItemsFromState()`: pagamento
  vencido e negociação parada (sem atividade há mais de 7 dias),
  fechando automaticamente os que não valem mais.
- `src/lib/collection/engine.ts` alterado: cria `work_items` nos 3
  pontos event-driven, e corrige o bug de enrollment travado (acima).
- `/backoffice/operacoes` — página com métricas (fila total, vencidos,
  concluídos hoje) e lista ordenada por prioridade → prazo, cada item
  com link pra entidade de origem, Atribuir/Adiar/Concluir.
- Nav item "Central Operacional" (staff GSBC apenas).

## Arquivos criados
`supabase/migrations/0021_operations_center.sql`,
`src/lib/operations/{work-items.ts, sync.ts}`,
`src/app/backoffice/operacoes/{page.tsx, actions.ts, work-item-row.tsx}`,
`e2e/operacoes.spec.ts`.

## Arquivos alterados
`src/types/database.types.ts`, `src/lib/collection/engine.ts`,
`src/app/api/cron/collection-engine/route.ts`,
`src/components/backoffice/nav-items.ts`.

## Banco de dados
`0021_operations_center.sql`: 1 tabela nova (`work_items`), RLS
restrita a staff GSBC (select/insert/update) — nenhuma mudança em
tabelas existentes.

## Segurança
- `work_items` não visível ao sindicato (RLS `is_platform_staff`).
- Escrita via cron usa service role (mesma justificativa já documentada
  em `src/lib/supabase/admin.ts` desde a Rodada 19); escrita via UI usa
  o cliente autenticado normal, RLS de ponta a ponta.
- Verificado ao vivo: usuário sindicato não vê o item de menu nem
  consegue acessar `/backoffice/operacoes` (redirecionado).

## Testes realizados
Verificação real, ao vivo, local **e** staging (regra 92):

- **Pipeline completo com uma cobrança real criada na hora**: cobrança
  com vencimento no passado (testando `pagamento_vencido`) + régua
  iniciada com `enrolled_at` adiantado artificialmente (testando o step
  `tarefa_humana` em D+10, sem esperar 10 dias de verdade) → rodei o
  cron 3x seguidas pra andar step 1 → 2 → 3 → **os dois work items
  apareceram exatamente como esperado** na Central Operacional: "Pagamento
  vencido — Estrela do Sul" (Alta, vencido, badge vermelho) e "Tarefa:
  contato telefônico com a empresa" (Média, Step 3/D+10).
- **Ação "Concluir" testada ao vivo**: cliquei, item desapareceu da
  fila, métricas atualizaram na hora (Fila total 2→1, Concluídos hoje
  0→1) — sem reload manual.
- **Auto-resolve testado ao vivo, a verificação mais importante**:
  registrei o pagamento completo da mesma cobrança e rodei o cron de
  novo — `pagamentosVencidosResolvidos: 1` na resposta, e a Central
  Operacional confirmou "Fila vazia" — o item de pagamento vencido
  sumiu sozinho, sem nenhuma ação humana de "descartar".
- **Gate staff-only verificado ao vivo**: logout, login como
  `dirigente.demo` (sindicato), sem o item "Central Operacional" no
  menu, acesso direto à URL redireciona pra `/backoffice`.
- **Endpoint do cron combinado (régua + work items) verificado no
  staging**: resposta com as duas chaves (`collection`, `workItems`),
  0 atividade (staging sem cobrança de teste — só confirma que os dois
  jobs rodam juntos sem erro no ambiente real).
- **e2e automatizado** (`e2e/operacoes.spec.ts`) rodado contra staging:
  2/2 passando.
- `npx tsc --noEmit`, `npx eslint .`, `npm run build` sem erros.
- Todos os artefatos de teste (cobrança, pagamento, enrollment,
  execuções, notificações, work items) apagados do banco local depois —
  os 322 prospectos reais do usuário permanecem intactos.

### O que não foi testado ao vivo
- **Negociação parada**: a lógica reaproveita a mesma função de
  auto-resolve já testada (pagamento vencido), só muda a origem do
  dado; não criei uma negociação real parada de propósito pra evitar
  mais um ciclo de setup/cleanup nesta rodada já longa.
- **Atribuir responsável**: o Select e a action existem e seguem o
  mesmo padrão de outras actions já testadas no projeto, mas não
  cliquei nele ao vivo.
- **Adiar**: mesma situação — código existe, não clicado ao vivo.

## Pendências
- **"Aguardando resposta" e "Follow-ups vencidos"** ficam de fora até
  existir um sinal real e distinto no schema (hoje se confundiriam com
  "pagamento vencido"/"negociação parada").
- **"Contestações pendentes"** depende de STG-04 (Dispute Management)
  existir primeiro.
- **Sem SLA/produtividade nas métricas** — só fila total, vencidos e
  concluídos hoje. Métricas mais elaboradas (tempo médio de resolução,
  produtividade por pessoa) ficam pra quando houver volume real de uso
  pra medir contra.
- **7 dias como limiar de "negociação parada" é um valor arbitrário**,
  não confirmado com o usuário — fácil de ajustar
  (`DIAS_NEGOCIACAO_PARADA` em `sync.ts`) se o volume real pedir outro
  número.

## Riscos residuais
| Risco | Classificação | Observação |
|---|---|---|
| Work items só atualizam na frequência do cron (1x/dia no Hobby, mesma limitação da Rodada 19) | Baixo | Aceitável para o volume atual; documentado, não escondido |
| "Atribuir"/"Adiar" não testados ao vivo | Baixo | Mesmo padrão de outras actions já testadas; risco estrutural baixo |
| Limiar de negociação parada (7 dias) não validado com o usuário | Baixo | Fácil de ajustar; não é uma decisão que trava nada |

## Regras de negócio pendentes
Nenhuma nova — os cortes de escopo desta rodada (3 blocos fora) já
estão justificados acima, não são decisões de negócio em aberto.

## Próximo staging recomendado
STG-04 (Dispute Management) destrava "Contestações pendentes" nesta
central e fecha uma lacuna que a Rodada 19 já tinha registrado
(elegibilidade da régua não considera contestação, porque a entidade
não existe). Alternativa: seguir a numeração pro STG-05 (Portal de
Regularização Empresarial) se o usuário priorizar a experiência da
empresa antes da parte interna de disputa.
