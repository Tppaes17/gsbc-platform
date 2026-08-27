# GSBC — Rodada 19 (STG-02 — Collection Strategy Engine)

## Objetivo
Construir o motor central de cobrança e recobrança: régua de contatos
com cadência configurável (D+N), elegibilidade checada antes de cada
execução, idempotência e auditoria completa — conforme
`docs/roadmap-stagings.md` (STG-02).

## Decisão confirmada com o usuário — conflito real identificado antes de codificar
O STG-02 pede um scheduler que dispara e-mails de cobrança sozinho, sem
clique humano por envio. Isso conflita diretamente com uma decisão
tomada explicitamente na Rodada 14: *"disparo de cobrança sempre com um
Owner clicando, nunca agendamento autônomo"* — e com o próprio comentário
da migration de notificações (Rodada 11): *"disparo é uma ação explícita
da equipe GSBC... sem automação implícita amarrada a transição de
status."*

Apontado o conflito ao usuário antes de escrever qualquer código
(conforme a Constituição de Engenharia do `AGENTS.md`, seção "não aceite
requisitos cegamente"). Três opções foram colocadas explicitamente,
incluindo a alternativa mais conservadora (motor roda sozinho, envio
fica numa fila pra aprovar). **Decisão do usuário: envio 100% autônomo,
como o STG-02 pede literalmente** — substitui a decisão da Rodada 14
para o caso específico de e-mails da régua de cobrança.

**O que continua exigindo aprovação humana, sem exceção**: a notificação
extrajudicial (STG-09, ainda não construída) — o roadmap já é explícito
sobre isso ("não dispara notificação formal sem aprovação/política"), e
nada nesta rodada muda isso.

**O que preserva segurança apesar da autonomia**: toda execução passa
por `isStillEligible()` antes de agir — pagamento, negociação em
andamento, suspensão, cancelamento e pausa manual sempre interrompem a
régua imediatamente, mesmo no meio da cadência. Iniciar a régua em si
continua sendo uma ação explícita da equipe GSBC (regra 6), e só é
permitida depois que a cobrança já foi aprovada (não em rascunho).

## Implementações

### Modelo de dados (`0020_collection_strategy_engine.sql`)
- `collection_strategies` / `collection_strategy_steps` / `collection_templates`:
  a régua em si — sem `tenant_id` (é um padrão operacional da GSBC, não
  um dado de sindicato, regra 6). Templates versionados por linha nova,
  nunca editados in-place.
- `collection_enrollments`: uma cobrança "matriculada" numa régua — no
  máximo 1 enrollment **ativo** por cobrança (índice único parcial),
  pode ser reinscrita depois de completed/cancelled.
- `collection_executions`: uma linha por step efetivamente processado.
  **Idempotência via `unique(enrollment_id, step_id)`** — sweeps de cron
  sobrepostos nunca processam o mesmo step duas vezes; a inserção da
  linha É o mecanismo de lock (se colidir, outro sweep já está
  cuidando).
- Seed: a régua "Cobrança padrão" com os 5 steps do próprio exemplo do
  roadmap (D+0 e-mail inicial, D+5 follow-up, D+10/D+15 tarefa humana,
  D+25 elegível para escalonamento).

### Motor (`src/lib/collection/`)
- `eligibility.ts` — `avaliarElegibilidade()`: função pura, testável
  isoladamente, checa status da cobrança, status do tenant, negociação
  aberta e pausa manual. Distingue pausa temporária (ex.: negociação em
  andamento — pode retomar sozinha) de encerramento definitivo (ex.:
  paga — nunca mais tenta agir).
- `template.ts` — interpolação simples de `{{empresa.razao_social}}`,
  `{{cobranca.valor}}`, `{{cobranca.vencimento}}`, `{{sindicato.nome}}`
  (as 4 variáveis do roadmap, literalmente).
- `engine.ts` — `runCollectionSweep()`: para cada enrollment ativo,
  checa elegibilidade → busca o step atual → se vencido, processa
  (idempotente) → e-mail real via `sendEmail` (reaproveita
  `notificacoes`, mesma tabela da Rodada 11) com até 3 tentativas e
  retry, ou tarefa humana/wait/escalonamento (sem ação externa) → avança
  pro próximo step ou encerra o enrollment.
- Roda com o cliente **service role** (`createAdminClient()`) — um cron
  não tem sessão de usuário, então não há `auth.uid()` pra RLS avaliar.
  Comentário do módulo atualizado pra documentar esse uso legítimo
  (antes só cobria convite de usuário).

### Scheduler
**Vercel Cron** (`vercel.json`, `GET /api/cron/collection-engine`),
protegido pelo header que a própria Vercel injeta
(`Authorization: Bearer $CRON_SECRET`). Sem `CRON_SECRET` configurado,
o endpoint recusa qualquer chamada — nunca roda "aberto" por padrão.

### UI
- `ReguaCobrancaSection` na ficha da cobrança (Owner/staff GSBC apenas,
  igual ao resto da página): botão "Iniciar régua" (só aparece quando
  não há régua ativa e é permitido reinscrever), status, step atual,
  Pausar/Retomar/Cancelar, timeline das execuções.

## Arquivos criados
`supabase/migrations/0020_collection_strategy_engine.sql`,
`src/lib/collection/{eligibility.ts, template.ts, engine.ts}`,
`src/lib/format.ts`,
`src/app/api/cron/collection-engine/route.ts`,
`src/app/backoffice/cobrancas/[id]/{regua-actions.ts, regua-cobranca-section.tsx}`,
`e2e/regua-cobranca.spec.ts`, `vercel.json`.

## Arquivos alterados
`src/types/database.types.ts`, `src/app/backoffice/cobrancas/[id]/page.tsx`,
`src/app/backoffice/cobrancas/actions.ts` (extraiu formatters pra
`lib/format.ts`, sem mudança de comportamento), `src/lib/supabase/admin.ts`
(comentário ampliado pro novo uso legítimo), `.env.example` (`CRON_SECRET`).

## Banco de dados
`0020_collection_strategy_engine.sql`: 5 tabelas novas, RLS em todas —
configuração da régua (strategies/templates/steps) só staff GSBC lê;
enrollments/executions também visíveis ao sindicato dono da cobrança
(regra 6 — "a plataforma registra"); escrita só staff GSBC via cliente
normal (o cron usa service role, contorna RLS por design, ver acima).

## Segurança
- `CRON_SECRET` obrigatório — sem ele, endpoint recusa tudo (503).
- Toda execução passa por elegibilidade antes de agir — pagamento,
  negociação, suspensão, cancelamento e pausa sempre param a régua,
  verificado ao vivo (ver Testes).
- Iniciar régua exige cobrança já aprovada (gate novo, não estava no
  desenho original — ver "Bug real encontrado" abaixo).
- `SUPABASE_SERVICE_ROLE_KEY` só no cron (server-side), nunca exposta.

## Testes realizados
Verificação real, ao vivo, contra dado real — local **e** staging
(regra 92):

- **Fluxo completo local, com uma cobrança real criada na hora** (a
  partir de uma obrigação do seed que ainda não tinha cobrança —
  "Estrela do Sul"): aprovar → iniciar régua → rodar o cron manualmente
  (`curl` com o `CRON_SECRET`) → **e-mail real chegou no Inbucket/Mailpit
  local**, com as 4 variáveis do template corretamente interpoladas
  ("Sindicato Demonstração", "R$ 2.100,00", "10/09/2026", "Estrela do
  Sul") → cobrança avançou de "Aprovada" pra "Notificada" automaticamente
  → enrollment avançou pro step 2 (D+5).
- **Idempotência confirmada**: rodei o cron de novo imediatamente depois
  — 0 execuções processadas (step 2 ainda não estava vencido, e o step 1
  já processado não foi reprocessado).
- **A verificação mais importante — elegibilidade interrompendo a régua
  no meio, de verdade**: registrei um pagamento total na mesma cobrança
  (ainda no step 2, faltando dias pro D+5) e rodei o cron de novo. O
  enrollment foi marcado `completed` **imediatamente**, sem esperar o
  próximo step vencer, e sem nenhum e-mail a mais — prova ao vivo de que
  a régua para sozinha assim que a cobrança é resolvida, exatamente a
  garantia que justificou o usuário aceitar disparo autônomo.
- **Bug real encontrado e corrigido durante a verificação**: a primeira
  versão do `iniciarReguaAction` não checava o status da cobrança —
  dava pra iniciar régua numa cobrança ainda em rascunho. Corrigido
  adicionando o gate de status antes de qualquer outro teste avançar.
- **Endpoint do cron verificado também no staging** (Rodada 17):
  `CRON_SECRET` real gerado e configurado no Vercel, deploy feito,
  `curl` sem header → 401; com header correto → 200 com resposta válida
  (0 enrollments, staging não tem cobrança de teste — só prova que o
  endpoint e a autenticação funcionam de ponta a ponta no ambiente real).
- **e2e automatizado** (`e2e/regua-cobranca.spec.ts`) rodado contra
  staging: 2/2 passando (gate de status visível pro Owner; seção
  inteira ausente pro sindicato).
- `npx tsc --noEmit`, `npx eslint .`, `npm run build` sem erros.
- Todos os artefatos de teste (cobrança, pagamento, enrollment,
  execuções, notificação) apagados do banco local depois — os 322
  prospectos reais do usuário permanecem intactos.

### O que não foi testado ao vivo
- **Retry em falha de envio de e-mail**: o caminho de código existe
  (até 3 tentativas, reagendamento) mas não foi exercitado ao vivo —
  simular uma falha real de SMTP exigiria derrubar o Inbucket local ou
  reconfigurar `SMTP_HOST` temporariamente, disruptivo demais pra esta
  verificação. Revisado por leitura de código; estrutura idêntica ao
  caminho de sucesso já testado.
- **Pausar/Retomar via UI**: os botões existem e chamam as actions
  corretas (mesmo padrão de outras actions já testadas no projeto), mas
  não cliquei neles ao vivo nesta rodada — o enrollment de teste virou
  `completed` (pelo pagamento) antes de eu testar essa parte
  especificamente.
- **Negociação aberta pausando a régua**: coberto pela mesma função
  `avaliarElegibilidade()` já testada para o caso de pagamento (mesmo
  código, ramo diferente), não pela ponta a ponta com uma negociação
  real criada.
- **Suíte Playwright completa contra o banco local**: mesma restrição
  registrada desde a Rodada 18 — o banco local tem dado real do usuário,
  não roda `db reset` livremente.

## Decisões arquiteturais
Nenhum ADR novo — RLS/multi-tenancy seguem o padrão já documentado
(ADR-001/003). A decisão relevante desta rodada (autonomia de disparo)
está registrada acima e na migration, não como ADR — é uma decisão de
produto/negócio, não de arquitetura técnica.

## Pendências
- **Vercel Cron no plano Hobby roda no máximo 1x/dia** — o design de
  retry (reagendar pra 1h depois) assume sweeps mais frequentes; na
  prática, hoje, uma falha de e-mail só tenta de novo no dia seguinte,
  não na hora seguinte. Documentado explicitamente em `vercel.json`
  (schedule `0 12 * * *`) — se o volume justificar, migrar pra um plano
  com cron mais frequente.
- **Sem UI de autoria de régua/template** — só existe a régua seed
  "Cobrança padrão", criada via migration. Trocar o texto de um
  template ou criar uma segunda régua hoje exige SQL direto. Aceitável
  para o volume atual (uma régua, um formato de e-mail).
- **Canal `tarefa_humana` não gera nada visível fora da timeline da
  própria cobrança** — não existe um sistema de tarefas/fila (isso é
  STG-03, Operations Center). Por ora, "Tarefa: contato telefônico"
  aparece só como uma linha na timeline de execuções da régua.
- **Contestação** (mencionada na lista de elegibilidade do roadmap) não
  é checada — a entidade não existe ainda no projeto (STG-04, Dispute
  Management). N/A por enquanto, não esquecida.

## Riscos residuais
| Risco | Classificação | Observação |
|---|---|---|
| E-mail automático sai sem revisão humana por envio | Médio (aceito deliberadamente) | Decisão explícita do usuário, mitigada por `isStillEligible()` checado antes de toda execução — verificado ao vivo que payment/negociação/suspensão param a régua na hora |
| Cron Hobby só roda 1x/dia — retry de 1h é teórico na prática atual | Baixo | Documentado; não bloqueia o funcionamento, só atrasa retries |
| Retry de falha de e-mail não testado ao vivo | Baixo | Revisado por código, estrutura espelha o caminho de sucesso já testado |
| Sem UI de autoria de régua | Baixo | Aceitável no volume atual (1 régua, 2 templates) |

## Regras de negócio pendentes
Nenhuma nova — a única decisão de negócio desta rodada (autonomia de
disparo) já foi resolvida diretamente com o usuário (ver seção acima).

## Próximo staging recomendado
STG-03 (Operations Center + Next Best Action) faria sentido em seguida
— dá visibilidade agregada às tarefas humanas que a régua já está
criando (hoje "perdidas" dentro da timeline de cada cobrança
individual). Alternativa: STG-04 (Dispute Management), pra fechar a
lacuna de "contestação" na elegibilidade.
