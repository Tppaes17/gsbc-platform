# GSBC — Rodada 28 (STG-12 — AI Copilot + Agentic Collections)

## Objetivo
Primeira camada de IA da plataforma (`docs/roadmap-stagings.md`, STG-12)
— "adicionar IA apenas onde houver valor operacional mensurável, não
criar chatbot genérico". Human-in-the-loop obrigatório (`AI suggestion
-> Draft -> Approved -> Executed`), proveniência rastreável ("resposta
relevante deve indicar dados utilizados"), observabilidade no formato
literal do roadmap (`model, prompt_version, context_reference, output,
user, decision, accepted_rejected, timestamp`), e os guardrails
explícitos da regra 8 da constituição do projeto — IA nunca autoridade,
nunca Autonomy Level 4 ("não iniciar com Level 4").

Este é o último staging do roadmap formal (STG-00 → STG-12) — a Regra
Estratégica Final já estava satisfeita desde a Rodada 27 (Collection
Strategy Engine, Dispute Management, Payment Provider, Opportunity
Engine e Policy Engine todos entregues antes de qualquer IA/agente).

## Diagnóstico e decisões arquiteturais

Três decisões confirmadas com o usuário antes de implementar:

### Escopo: 2 dos 4 copilots do roadmap, completos — não os 4 rasos
O roadmap lista 4 copilots (Document, Negotiation, Collections,
Executive). Decisão: construir **Negotiation Copilot** e **Collections
Copilot** completos (persistência, UI, observabilidade, human-in-the-loop
real) nesta rodada; Document Copilot e Executive Copilot ficam
documentados como próximo passo (ver seção final) — evita a armadilha
de 4 integrações rasas que "só conversam" sem valor operacional
mensurável, o que o roadmap proíbe explicitamente.

- **Negotiation Copilot** (Autonomy Level 1 — Insight): resume a
  timeline de uma negociação já existente — pendências, comparação de
  valores. Só leitura, nenhuma escrita nova.
- **Collections Copilot** (Autonomy Level 2 — Draft): sugere a próxima
  ação pra uma cobrança e, quando aplicável, prepara um rascunho de
  notificação — sempre revisável/editável por um humano antes de
  enviar.

Nenhum dos dois é Level 4 (Policy-bound automation) nem escreve em
`cobrancas`/`negociacoes`/`pagamentos` — cumprindo a regra 8 letra por
letra ("nunca pode autonomamente conceder desconto, concluir
enquadramento, cancelar cobrança, alterar obrigação, transferir
dinheiro, emitir quitação, formalizar acordo ou produzir decisão
jurídica definitiva").

### Modelo: Claude Sonnet 5
Confirmado com o usuário — custo/latência adequados para resumo e
sugestão de texto (não é raciocínio multi-etapa complexo o suficiente
pra justificar Opus 5).

### Chave de API ausente: degradação graciosa, não bloqueio
`ANTHROPIC_API_KEY` não está configurada (nem localmente, nem em
staging) — decisão confirmada: construir a integração completa agora
(UI, persistência, plumbing) mas com um estado "IA não configurada"
explícito e claro sempre que a chave não existir, em vez de esconder a
funcionalidade ou simular uma resposta falsa (regra 9 — não criar
funcionalidade falsa; mesmo padrão já usado pra `LEADCNPJ_API_KEY`,
Rodada 14/Fase 2, e pro payment provider simulado, Rodada 23).

## "Preserve primeiro" aplicado ao rascunho do Collections Copilot
O primeiro desenho do prompt do Collections Copilot pedia uma carta de
notificação completa e independente (saudação + corpo + fechamento
próprios). Mas `sendNotificacaoAction` (Rodada 12) já monta um e-mail
completo (saudação, cabeçalho com valor/vencimento, fechamento) e só
aceita um parágrafo adicional opcional (`mensagem`) inserido no meio.
Enviar a carta completa da IA nesse campo produziria uma estrutura
duplicada e estranha. Corrigido antes de qualquer código depender disso:
o prompt agora pede explicitamente só o parágrafo adicional (2-4
frases, sem repetir saudação/valor/vencimento/fechamento) — o
Collections Copilot **reusa** `sendNotificacaoAction` sem modificá-la,
em vez de abrir um caminho de envio paralelo (menos superfície nova
pra testar, nada na infraestrutura já testada muda).

## Implementações
- `supabase/migrations/0028_ai_copilots.sql` — tabela `ai_interacoes`
  (log de observabilidade, spec literal do roadmap: `model,
  prompt_version, context_reference, output, status, user_id,
  decided_at, decided_by`), RLS restrita a `is_platform_staff` (select/
  insert/update), sem policy de delete (histórico de sugestão nunca
  desaparece — regra 4).
- `src/lib/ai/client.ts` — `isAiConfigured()`/`getAiClient()` via
  `@anthropic-ai/sdk` oficial (skill `claude-api`), `AI_MODEL =
  "claude-sonnet-5"`.
- `src/lib/ai/negotiation-copilot.ts` — `gerarResumoNegociacao()`:
  prompt restrito a usar só os dados fornecidos, nunca opinar sobre
  mérito de desconto, nunca sugerir ação/valor/conclusão jurídica,
  resposta em 3 seções fixas (Resumo da timeline / Pendências /
  Comparação de valores).
- `src/lib/ai/collections-copilot.ts` + `collections-copilot-options.ts`
  (constantes extraídas pra um módulo sem `server-only`, consumível
  pelo componente cliente) — `sugerirAcaoCobranca()`: resposta
  estruturada em JSON (`acao_sugerida` restrita a um enum de 5 valores,
  `justificativa`, `rascunho_notificacao` opcional), com
  `JSON.parse()` defensivo (`parseOk` sinaliza formato inesperado sem
  quebrar a UI).
- `src/app/backoffice/negociacoes/[id]/{negotiation-copilot-actions.ts, negotiation-copilot-section.tsx}`
  — gera resumo (Owner/staff), registra `ai_interacoes`, feedback
  útil/não útil (marca `aceito`/`rejeitado`).
- `src/app/backoffice/cobrancas/[id]/{collections-copilot-actions.ts, collections-copilot-section.tsx}`
  — gera sugestão, registra `ai_interacoes`; quando a ação sugerida é
  "enviar notificação", mostra o rascunho num textarea editável e um
  botão "Usar rascunho e enviar" que chama `sendNotificacaoAction`
  internamente e marca a interação como `aceito` (texto idêntico ao
  rascunho) ou `editado` (texto alterado pelo humano) — nunca envia
  nada sozinho.
- `.env.example` — `ANTHROPIC_API_KEY` documentada como opcional.
- Ambas as seções wireadas em `[id]/page.tsx` das duas rotas, gated a
  `user.isPlatformStaff` (mesmo padrão de toda ferramenta operacional
  interna da plataforma).
- `e2e/copilotos.spec.ts` — 4 testes.

## Arquivos criados
`supabase/migrations/0028_ai_copilots.sql`,
`src/lib/ai/{client.ts, negotiation-copilot.ts, collections-copilot.ts, collections-copilot-options.ts}`,
`src/app/backoffice/negociacoes/[id]/{negotiation-copilot-actions.ts, negotiation-copilot-section.tsx}`,
`src/app/backoffice/cobrancas/[id]/{collections-copilot-actions.ts, collections-copilot-section.tsx}`,
`e2e/copilotos.spec.ts`.

## Arquivos alterados
`.env.example`, `src/types/database.types.ts` (tipos `AiCopilot`/
`AiEntityType`/`AiInteracaoStatus` + tabela `ai_interacoes`),
`src/app/backoffice/negociacoes/[id]/page.tsx`,
`src/app/backoffice/cobrancas/[id]/page.tsx`, `package.json`/
`package-lock.json` (`@anthropic-ai/sdk`).

## Banco de dados
`0028_ai_copilots.sql`: 1 tabela nova (`ai_interacoes`), 2 índices
(`entity_type, entity_id` e `copilot, created_at`). RLS: select/insert/
update restritos a `is_platform_staff(auth.uid())` — sem policy de
delete. Nenhuma alteração em tabela existente; os dois copilots desta
rodada não escrevem em `cobrancas`/`negociacoes`/`pagamentos` (só leem,
e o Collections Copilot alimenta, como texto editável, o mesmo caminho
de envio que já exigia confirmação humana desde a Rodada 12).

## Segurança
- `ai_interacoes` é ferramenta operacional interna (mesmo nível de
  Central Operacional/Políticas) — rascunho de IA não é dado de
  transparência do sindicato; só o resultado FINAL de uma ação
  executada (se acontecer) fica visível nos lugares de sempre
  (`negociacao_eventos`, `notificacoes`).
- RLS verificada como autoridade real via simulação de JWT (não só
  redirecionamento de app): um usuário sindicato (`dirigente.demo`) —
  `count(*) from ai_interacoes` retorna 0 linhas visíveis, e uma
  tentativa de `insert` direto (forjando uma sugestão de IA) é
  rejeitada com "new row violates row-level security policy". Um
  usuário staff (`admin.demo`), no mesmo teste, insere e atualiza
  normalmente.
- Não há função nova `security definer` nesta rodada (diferente das
  Rodadas 25/27) — os dois copilots não introduzem nenhum gate de
  autorização mais estreito que o já existente (`is_platform_staff`),
  então a policy padrão já é suficiente; não há bypass a fechar.

## Testes realizados
- `npx tsc --noEmit`, `npx eslint .` — 0 erros. `npm run build` sem
  erros (achado intermediário: o componente cliente do Collections
  Copilot importava uma constante do módulo `server-only`
  `collections-copilot.ts`, quebrando o build com "'server-only'
  cannot be imported from a Client Component" — corrigido extraindo
  `ACAO_SUGERIDA_OPTIONS`/`ACAO_VALUES` pra um módulo neutro
  `collections-copilot-options.ts`, consumido tanto pelo módulo server
  quanto pelo componente cliente).
- **Verificação local ao vivo** (login real via UI, staff e sindicato):
  ambas as seções renderizam o estado "IA não configurada" corretamente
  (sem `ANTHROPIC_API_KEY` local) nas páginas de negociação e cobrança
  do seed; login como `dirigente.demo` confirma que nenhuma das duas
  seções aparece pra sindicato (nem no HTML da página).
- **RLS via simulação de JWT** — ver seção Segurança acima.
- Baseline de dado real reverificado intacto antes e depois dos testes:
  322 dossiês, 2 empresas, 1 cobrança, 1 pagamento, 5 políticas,
  `ai_interacoes` vazia (nenhum resíduo do teste de RLS, que rodou
  dentro de uma transação revertida com `rollback`).
- **Deploy em staging** (Vercel + Supabase Cloud): migration 0028
  aplicada via SQL Editor (acentuação verificada antes de rodar —
  comparação de tamanho da string original vs. decodificada,
  divergência esperada por causa de caracteres multibyte UTF-8),
  confirmada por query direta em `information_schema.columns` (15
  colunas). App deployado via `vercel --prod --scope gsbc` (primeira
  tentativa falhou com "Not authorized" por escopo de time ambíguo —
  resolvida especificando `--scope gsbc` explicitamente) →
  `https://gsbc-platform.vercel.app`.
- **e2e automatizado** (`e2e/copilotos.spec.ts`, 4 testes: seção
  aparece pra staff com aviso de IA não configurada em cada página,
  seção ausente pra sindicato em cada página) — 4/4 passando em
  staging, confirmando que `ANTHROPIC_API_KEY` também não está
  configurada lá. Suíte completa contra staging: 48/51 — as mesmas 3
  falhas pré-existentes já documentadas desde as Rodadas 21/22/23
  (SMTP/prospectos), nenhuma nova.

### O que não foi testado ao vivo
- **A chamada real à API da Anthropic** — sem `ANTHROPIC_API_KEY`
  configurada (localmente nem em staging), o caminho
  `client.messages.create()` nunca foi exercitado de fato; só o código
  em volta dele (persistência, UI, RLS, estado degradado) foi
  verificado. O parsing defensivo do JSON estruturado do Collections
  Copilot (`parseOk`) também não foi exercitado com uma resposta real
  — só revisado por leitura.
- **Fluxo de "usar rascunho e enviar" ponta a ponta** — depende de uma
  sugestão real da IA existir primeiro; não foi possível clicar o botão
  "Usar rascunho e enviar" sem uma chave configurada.
- **Feedback útil/não útil e edição de rascunho** (marcar `aceito`/
  `rejeitado`/`editado`) — os botões existem e chamam as actions
  corretas (revisado por leitura), mas não foram clicados ao vivo pela
  mesma razão.

## Pendências
- **Document Copilot e Executive Copilot** (2 dos 4 copilots do
  roadmap) — não construídos nesta rodada, decisão de escopo confirmada
  com o usuário.
- **Chave de API real** — quando o usuário configurar
  `ANTHROPIC_API_KEY` em produção, os fluxos ponta a ponta listados
  acima (chamada real, parsing de JSON, envio de rascunho, feedback)
  precisam de uma verificação ao vivo dedicada.
- **Roadmap de Agentes** (Research/Qualification/Collection/Negotiation/
  Payment Agents, citado no roadmap como próximo horizonte após os
  Copilots) — não iniciado, corretamente fora do escopo desta rodada
  (regra explícita: "não iniciar com Level 4").

## Riscos residuais
| Risco | Classificação | Observação |
|---|---|---|
| Caminho de chamada real à API nunca exercitado ao vivo | Médio | Sem chave configurada em nenhum ambiente; recomendado testar ponta a ponta assim que uma chave real for provisionada, antes de anunciar a funcionalidade pros usuários finais |
| `JSON.parse()` defensivo do Collections Copilot não testado contra uma resposta real do modelo | Baixo | `parseOk=false` já degrada pra uma mensagem de erro visível em vez de quebrar a UI — mas o formato real da resposta do Sonnet 5 pra este prompt específico só será confirmado no primeiro uso real |
| Document Copilot e Executive Copilot ausentes | Esperado | Decisão de escopo confirmada com o usuário — não é lacuna não intencional |

## Regras de negócio pendentes
Nenhuma nova — as três decisões desta rodada (escopo de 2 copilots,
modelo Sonnet 5, degradação graciosa sem chave) foram confirmadas com o
usuário antes de implementar.

## Próximo staging recomendado
STG-12 é o último item do roadmap formal (STG-00 → STG-12) — não há um
"STG-13" definido. Trabalho futuro natural, em ordem de valor
recomendada:

1. **Configurar `ANTHROPIC_API_KEY` em produção** e verificar os
   fluxos ponta a ponta listados em "O que não foi testado ao vivo"
   antes de divulgar a funcionalidade.
2. **Document Copilot e Executive Copilot** — os 2 copilots do roadmap
   ainda não construídos, seguindo o mesmo padrão desta rodada
   (completo, não raso).
3. **Retrofit das 3 políticas "registradas"** do Policy Engine (Rodada
   27) pra `enforcement='aplicada'` de verdade — pendência já
   documentada, independente de IA.
4. **Roadmap de Agentes** (fora do roadmap formal STG-00→12) — só depois
   dos itens acima, e só com todos os guardrails da regra 8 mantidos
   (nenhum agente decide/executa autonomamente ações financeiras ou
   jurídicas).
