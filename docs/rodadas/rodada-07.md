# GSBC — Rodada 7

## Objetivo
Negociações: propostas, contrapropostas e o desfecho (aceite/recusa) de
uma cobrança em negociação (regras 26–27). Fecha mais um elo da cadeia:
`Sindicato → Empresa → Instrumento → Cláusula → Obrigação → Cobrança →
Negociação`.

## Estado inicial
Rodadas 1–6 funcionando e testadas (fundação, sindicatos, empresas,
instrumentos/obrigações, cobranças, site institucional). A ficha 360º da
empresa tinha um placeholder honesto para "Negociações" — substituído
nesta rodada por dados reais. A cobrança em negociação (status
`negotiating`, já existente desde a Rodada 5) não tinha nenhuma tela por
trás — esta rodada implementa o que esse status representa de fato.

## Implementações

### Modelo de dados
- `negociacoes`: nasce de exatamente uma cobrança (relação 1:1 — mesma
  lógica de P0 documentada nas Rodadas 4/5). Cabeçalho com `status`
  (`aberta` → `em_negociacao` → `aceita`/`recusada`/`encerrada`) e
  `valor_atual` (o valor da proposta mais recente — nunca editado direto,
  só via RPC).
- `negociacao_eventos`: histórico imutável, mas diferente de
  `cobranca_eventos` — aqui os eventos carregam o próprio conteúdo da
  negociação (`tipo`: proposta da GSBC, contraproposta da empresa,
  aceite, recusa, observação; `valor`; `condicoes`), não só a transição
  de status. A timeline e o conteúdo são a mesma coisa nesta entidade.
- **`public.register_negociacao_evento()`**: único caminho para
  registrar um movimento — grava o evento e atualiza o cabeçalho
  (`status`, `valor_atual`) na mesma transação (`SECURITY INVOKER`, RLS
  do chamador continua valendo — mesmo padrão de `change_cobranca_status`
  da Rodada 5).
- Trigger de integridade: `tenant_id`/`empresa_id` da negociação têm que
  bater com os da cobrança de origem.
- RLS/grants no mesmo padrão já validado (staff GSBC escreve, sindicato lê).

### Integração entre Cobrança e Negociação
- Iniciar uma negociação move a cobrança automaticamente para o status
  `negotiating` (reaproveitando `change_cobranca_status` da Rodada 5).
- Registrar um evento do tipo "aceite" move a cobrança automaticamente
  para `agreement_reached` — testado ponta a ponta (ver Testes).
- Nenhuma regra rígida de aprovação para mudanças de valor foi
  implementada — mesma postura documentada como pendência na Rodada 5
  (regra 27 pede explicitamente para não travar isso antes da hora).

### UI
- `/backoffice/negociacoes` — listagem com empresa, valor original da
  cobrança, valor negociado atual e status.
- `/backoffice/negociacoes/[id]` — valores, responsável, links para a
  cobrança de origem e a ficha da empresa, timeline completa e ação
  "Registrar movimento" (dialog com tipo, valor e condições).
- Cobrança `[id]`: botão "Iniciar negociação" (dialog com seleção de
  responsável) quando não existe negociação; "Ver negociação" quando já
  existe.
- Ficha 360º da empresa: placeholder "Negociações" substituído por lista
  real (somente leitura, linkando para a negociação); os dois
  placeholders restantes (Financeiro, Documentos) renumerados para
  Rodada 8.
- Dashboard: card "Negociações em andamento" (`aberta` + `em_negociacao`).
- Menu lateral: item "Negociações" entre Cobranças e Usuários.

### Auditoria
`negociacao.created`, `negociacao.evento_registrado` — mesmo padrão via
`log_audit_event`, em paralelo a `negociacao_eventos` (histórico de
domínio da timeline, não o log de auditoria do sistema).

## Arquivos criados
`src/app/backoffice/negociacoes/**`, `src/lib/validation/negociacao.ts`,
`src/app/backoffice/cobrancas/[id]/negociacao-action.tsx`,
`src/app/backoffice/empresas/[id]/negociacoes-list.tsx`,
`supabase/migrations/0011_negociacoes.sql`.

## Arquivos alterados
`src/app/backoffice/cobrancas/[id]/page.tsx` (link/ação de negociação),
`src/app/backoffice/empresas/[id]/page.tsx` (placeholder → dados reais),
`src/app/backoffice/page.tsx` (card de negociações em andamento),
`src/components/backoffice/nav-items.ts`, `src/types/database.types.ts`,
`supabase/seed.sql` (1 negociação + 2 eventos de demonstração, cobrança
demo avançada para `negotiating`).

## Banco de dados
`0011_negociacoes.sql`: duas tabelas, trigger de integridade, função
`register_negociacao_evento`, RLS e grants.

## Segurança
`register_negociacao_evento` é `SECURITY INVOKER` — não contorna RLS, só
garante que a atualização do cabeçalho e o registro do evento aconteçam
na mesma transação.

## Testes realizados
Verificação real pelo navegador, com os dois usuários de demonstração,
antes de reportar como concluído (regra 92):

- Login como Admin GSBC: listagem de negociações mostrou a negociação de
  demonstração (seed) com o valor negociado correto.
- Abri a negociação: timeline com as 2 propostas do seed renderizada
  corretamente, com autor e horário.
- Registrei um novo movimento do tipo "Aceite" pela UI — o status mudou
  para "Aceita" imediatamente, o evento apareceu no topo da timeline, e
  **a cobrança de origem mudou sozinha para "Acordo firmado"**, com a
  transição registrada na timeline dela também — confirma que a
  integração entre as duas entidades funciona de ponta a ponta, não só
  no design.
- Login como Dirigente do Sindicato Demonstração: acessei a mesma
  negociação — timeline completa visível, nome do responsável (staff
  GSBC) resolvido corretamente, e **sem** o botão "Registrar movimento"
  (RLS + UI corretamente restringem escrita à equipe GSBC).
- Ficha 360º da empresa (como Dirigente): seções "Cobranças" e
  "Negociações" mostrando dados reais e consistentes com o que foi
  testado acima.
- `npm run build`, `npx tsc --noEmit`, `npx eslint .` sem erros.
- Sem erros no console do navegador em nenhuma das telas testadas.

## Decisões arquiteturais
Nenhum ADR novo — reaproveita o padrão de tabela de cabeçalho + eventos
imutáveis + RPC transacional já validado e documentado nas Rodadas 4/5.

## Pendências
- Aprovação para mudanças que alterem substancialmente o valor negociado
  (regra 27) — deliberadamente não implementada, mesma razão já
  registrada na Rodada 5.
- Edição do responsável após a criação da negociação — hoje só é
  definido ao iniciar; sem tela de edição posterior.
- Registro de contraproposta pela própria empresa (hoje só a equipe GSBC
  registra movimentos em nome de ambos os lados — a empresa não é
  usuária da plataforma neste estágio).

## Riscos residuais
| Risco | Classificação | Observação |
|---|---|---|
| Sem máquina de estados para transições de status da negociação | Baixo | Deliberado (regra 10, mesmo padrão de Cobranças) |
| Negociação 1:1 com cobrança | Baixo | Documentado como assunção nas Rodadas 4/5; revisar se surgir necessidade real de múltiplas negociações por cobrança |

## Regras de negócio pendentes
Nenhuma nova.

## Próxima rodada recomendada
Rodada 8 — Financeiro e Documentos: pagamentos, vencimentos e
inadimplência vinculados a um acordo firmado, mais o repositório de
documentos (instrumentos, notificações, acordos, comprovantes) já
sinalizado como placeholder na ficha 360º da empresa.
