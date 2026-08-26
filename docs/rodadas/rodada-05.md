# GSBC — Rodada 5

## Objetivo
Cobranças: a ação operacional de buscar a regularização de uma obrigação
(regra 22), com status não-histórico (regra 24 — toda mudança gera um
evento) e timeline (regra 25). Fecha a cadeia completa do documento:
`Sindicato → Empresa → Instrumento → Cláusula → Obrigação → Cobrança`.

## Estado inicial
Rodadas 1-4 funcionando e testadas. A ficha 360º da empresa tinha um
placeholder honesto para "Cobranças" — substituído nesta rodada por dados
reais. Instrumentos/obrigações também ganharam link direto para gerar ou
ver a cobrança correspondente.

## Implementações

### Modelo de dados
- `cobrancas`: nasce de exatamente uma obrigação (relação 1:1 — mesma
  lógica de P0 documentada na Rodada 4: cada obrigação já é uma ocorrência
  específica, não um template recorrente). Campos batem com a regra 23:
  valor principal, atualização, valor em cobrança (coluna gerada,
  `principal + atualização`, nunca calculada em dois lugares), vencimento,
  prioridade, responsável, e os 14 status listados na regra 23
  (`draft` → ... → `closed`).
- `cobranca_eventos`: histórico imutável — toda mudança de status gera uma
  linha (regra 24). Sem policy de update/delete.
- **`public.change_cobranca_status()`**: único caminho para mudar o status
  de uma cobrança — atualiza a linha e registra o evento na mesma
  transação (`SECURITY INVOKER`, RLS do chamador continua valendo).
- Trigger de integridade: `tenant_id`/`empresa_id` da cobrança têm que
  bater com os da obrigação de origem — mesmo padrão de defesa em
  profundidade das rodadas anteriores.
- RLS/grants no mesmo padrão já validado (staff GSBC escreve, sindicato lê).

### Novo componente de design system
- **`Timeline`** (regra 43) — lista vertical com linha conectando os
  pontos, usada para o histórico de status da cobrança. Reutilizável para
  Negociações (Rodada 6) e Acordos.

### UI
- `/backoffice/cobrancas` — listagem com empresa, valor, vencimento,
  prioridade, status.
- `/backoffice/cobrancas/novo` — sem `obrigacaoId` na URL, lista obrigações
  ainda sem cobrança para escolher; com `obrigacaoId`, formulário
  pré-preenchido (valor sugerido = valor de referência da obrigação).
- `/backoffice/cobrancas/[id]` — edição de valores (atualização, vencimento,
  prioridade, responsável), ação "Mudar status" (dialog com motivo
  obrigatório, regra 69 — alteração crítica exige confirmação), e a
  Timeline completa.
- Links "Gerar cobrança" / "Ver cobrança" em cada obrigação, tanto na
  página do instrumento quanto na ficha da empresa.
- Ficha 360º da empresa: placeholder "Cobranças" substituído por lista real
  (somente leitura, linkando para a cobrança).
- Dashboard: card "Valor em cobrança" somando `valor_cobranca` das
  cobranças ainda não encerradas (`paid`/`cancelled`/`closed` excluídos) —
  responde diretamente à pergunta da regra 36 ("quanto está sendo
  trabalhado?").
- Menu lateral: item "Cobranças" entre Instrumentos e Usuários.

### Auditoria
`cobranca.created`, `cobranca.updated`, `cobranca.status_changed` — mesmo
padrão via `log_audit_event`, em paralelo ao `cobranca_eventos` (que é o
histórico de domínio para a timeline, não o log de auditoria do sistema —
os dois têm propósitos diferentes, não são redundantes).

## Arquivos criados
`src/app/backoffice/cobrancas/**`, `src/lib/validation/cobranca.ts`,
`src/components/design-system/timeline.tsx`,
`src/app/backoffice/empresas/[id]/cobrancas-list.tsx`,
`supabase/migrations/0008_cobrancas.sql`,
`supabase/migrations/0009_users_visibility_platform_staff.sql`.

## Arquivos alterados
`src/app/backoffice/empresas/[id]/page.tsx` (placeholder → dados reais),
`src/app/backoffice/instrumentos/[id]/{page.tsx,obrigacoes-section.tsx}`
(link para cobrança), `src/app/backoffice/page.tsx` (card de valor em
cobrança), `src/components/backoffice/nav-items.ts`,
`src/types/database.types.ts`, `supabase/seed.sql` (1 cobrança + 3 eventos
de demonstração).

## Banco de dados
`0008_cobrancas.sql`: duas tabelas, trigger de integridade, função
`change_cobranca_status`, RLS e grants. `0009_users_visibility_platform_staff.sql`:
correção de RLS encontrada testando esta rodada (ver Testes realizados).

## Segurança
`change_cobranca_status` é `SECURITY INVOKER` — não contorna RLS, só
garante que a atualização de status e o registro do evento aconteçam na
mesma transação (nunca um sem o outro).

## Testes realizados
Verificação real pelo navegador, com os dois usuários de demonstração,
antes de reportar como concluído (regra 92):

- Cobrança de demonstração (seed) exibida com timeline de 3 eventos.
- Mudei o status pela UI ("Notificada" → "Em contato") com motivo — o
  evento apareceu no topo da timeline imediatamente, com autor e horário
  corretos.
- Gerei uma cobrança nova a partir da segunda obrigação do seed (fluxo sem
  `obrigacaoId` pré-definido, escolhendo na lista) — formulário
  pré-preenchido corretamente, cobrança criada com o primeiro evento
  "Cobrança criada — Rascunho".
- Confirmei a integração cruzada: a página do instrumento agora mostra "Ver
  cobrança" (não mais "Gerar cobrança") para as duas obrigações que já têm
  cobrança; a ficha da empresa lista as cobranças reais.
- `npm run build`, `npx tsc --noEmit`, `npx eslint .` sem erros.

**Um bug real de transparência foi encontrado e corrigido**: testando como
a dirigente do sindicato, o campo "Responsável" e o autor de cada evento da
timeline apareciam em branco ("Sem responsável definido", sem "· por
Fulano") — não porque o dado estivesse ausente, mas porque a RLS de
`users` só libera ver o nome de alguém que compartilha uma membership no
*mesmo* tenant, e o responsável/autor é um analista GSBC (tenant
`platform`), tenant diferente do dela. Isso contradiz diretamente as
regras 6 e 25 (a timeline deve mostrar quem fez o quê, para o sindicato
"acompanhar"). Corrigido em `0009_users_visibility_platform_staff.sql`:
staff GSBC agora é visível a qualquer usuário autenticado (não expõe dados
de outros sindicatos — só o nome de quem trabalha para todos eles), e a
página da cobrança busca o nome do responsável diretamente via embed para
garantir que apareça no Select mesmo quando a listagem completa de staff
GSBC não está acessível ao usuário logado.

## Decisões arquiteturais
Nenhum ADR novo — refinamento da regra de visibilidade de `users` já
registrada no ADR-003, não uma mudança estrutural do modelo de
autorização.

## Pendências
- Aprovação para mudanças que alterem substancialmente valor/obrigação
  (regra 27) — deliberadamente não implementada ainda; a própria regra 27
  pede para não travar regras rígidas antes da hora ("não definir ainda
  regras rígidas universais... arquitetura parametrizável").
- Notificação automática (e-mail/WhatsApp) ao mudar status para "Notificada"
  — hoje é só uma mudança de status manual, sem disparo real de
  comunicação (módulo de Notificações ainda não existe).
- Reabertura de cobrança fechada/cancelada — hoje a UI permite mudar para
  qualquer status a qualquer momento (sem máquina de estados rígida,
  deliberado — regra 10).

## Riscos residuais
| Risco | Classificação | Observação |
|---|---|---|
| Sem máquina de estados para transições de status | Baixo | Deliberado (regra 10); se abusos aparecerem na prática, uma validação de transições válidas pode ser adicionada depois sem quebrar o modelo |
| Cobrança 1:1 com obrigação | Baixo | Documentado como assunção na Rodada 4/5; revisar se surgir necessidade real de múltiplas cobranças por obrigação |

## Regras de negócio pendentes
Nenhuma nova.

## Próxima rodada recomendada
Rodada 6 — Negociações: propostas, contrapropostas e acordos vinculados a
uma cobrança (regras 26-27), reaproveitando o componente `Timeline` e o
padrão de eventos imutáveis já validado nesta rodada.
