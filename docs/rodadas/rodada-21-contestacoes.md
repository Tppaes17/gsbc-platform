# GSBC — Rodada 21 (STG-04 — Dispute Management)

## Objetivo
Tratar contestação como entidade própria (`docs/roadmap-stagings.md`,
STG-04) — não um campo de status solto na cobrança. Fluxo completo:
Contestação → Pausa da cobrança → Evidências → Análise → Resultado
(procedente / parcialmente procedente / improcedente / inconclusiva) →
Reprocessamento.

## Estado inicial
A Central Operacional (Rodada 20) já tinha reservado o bloco
"Contestações pendentes", mas explicitamente fora de escopo — "a
entidade não existe (STG-04, ainda não construído)". A régua de
cobrança (Rodada 19) também já registrava como pendência aberta que sua
`avaliarElegibilidade()` não considerava contestação nenhuma, porque não
havia contestação para considerar.

## Diagnóstico e decisões arquiteturais (antes de implementar)

### Mesmo padrão cabeçalho + eventos, décima vez validado
`contestacoes` (cabeçalho, status não-histórico) + `contestacao_eventos`
(log imutável de mudanças de status) — igual a cobrancas/negociacoes.
Uma tabela nova, `contestacao_evidencias`, guarda o que o roadmap pediu
literalmente: documento, comentário, valor alegado, fundamento, usuário,
data.

### Reaproveitamento em vez de infraestrutura paralela
- **Evidência do tipo documento** usa a tabela `documentos` (Rodada 10)
  já existente — só ganhou a categoria `'contestacao'`. Nenhum bucket ou
  fluxo de upload novo.
- **"Gerar evento: `charge.adjusted_due_to_dispute`"** (regra do
  roadmap) é satisfeito reaproveitando `change_cobranca_status()`
  (Rodada 5, já grava em `cobranca_eventos`) — a cobrança ganha um novo
  status `'contestada'` em vez de um evento de tipo novo e paralelo.
  `abrir_contestacao()` chama essa função na mesma transação que cria o
  cabeçalho e o evento de abertura — nunca modifica a cobrança
  silenciosamente.

### Pausa da régua sem duplicar lógica de elegibilidade
`abrir_contestacao()` sempre transiciona a cobrança para `'contestada'`.
Bastou adicionar esse status a `STATUS_PAUSAM_REGUA` em
`src/lib/collection/eligibility.ts` (mesmo grupo de `'suspended'`) —
fecha a pendência da Rodada 19/20 sem o motor de cobrança precisar saber
que contestações existem. "Reprocessamento" (último passo do fluxo do
roadmap) também sai de graça: assim que um humano tirar a cobrança do
status `'contestada'` (via "Mudar status", depois de revisar o
resultado), a próxima varredura do cron reavalia a elegibilidade
normalmente — nenhum código de "retomada" dedicado foi necessário.

### Resultado da análise nunca muda o status da cobrança sozinho
`register_contestacao_evento()` grava o resultado (procedente etc.) e
atualiza `contestacoes.status`/`resolvida_em`/`resolvida_por` — mas
**não** toca `cobrancas.status`. "Procedente" não implica uma única
transição correta (cancelar a cobrança? reduzir e retomar?) — fica com o
humano decidir via "Mudar status", já existente. Mesmo princípio já
usado no aceite de negociação (Rodada 7) e nas falhas de automação
(Rodada 20): estado ambíguo fica com humano, nunca com heurística.

### `'contestada'` não é selecionável no "Mudar status" manual
`cobrancaStatusOptions` (dropdown genérico de mudança de status)
deliberadamente não ganhou essa opção — só é alcançável via
`abrir_contestacao()`, garantindo que uma cobrança nunca fica
`'contestada'` sem uma contestação de verdade por trás. A saída do
status continua livre (qualquer status via o mesmo dropdown).

### Contestação é visível ao sindicato (transparência), diferente de work_items
`contestacoes`/`contestacao_eventos`/`contestacao_evidencias` seguem a
regra 6 ("a GSBC executa, o sindicato acompanha") — RLS de leitura
staff-ou-membro-do-tenant, igual a negociações. A seção na ficha da
cobrança usa uma prop `canManage` para esconder só os botões de escrita
do sindicato, não a seção inteira (diferente da régua de cobrança, que é
staff-only por completo).

### Métricas: agregação em memória, sem view nova
Volume, tempo médio de resolução, causas e valor contestado são
computados em `contestacoes/page.tsx` sobre as linhas já buscadas — sem
`GROUP BY`/view dedicada, mesmo nível de simplicidade da Central
Operacional (Rodada 20). Justificável para o volume atual; revisar se o
volume real crescer.

## Implementações
- `contestacoes` / `contestacao_eventos` / `contestacao_evidencias`
  (`0022_contestacoes.sql`).
- Novo status de cobrança `'contestada'`; nova categoria de documento
  `'contestacao'`; novo tipo de work item `'contestacao_pendente'`.
- RPCs `abrir_contestacao()` e `register_contestacao_evento()`.
- `src/lib/collection/eligibility.ts` — `'contestada'` em
  `STATUS_PAUSAM_REGUA`.
- `src/lib/operations/sync.ts` — `syncContestacoesPendentes()`,
  state-derived, mesmo padrão de auto-resolve de pagamento
  vencido/negociação parada.
- `/backoffice/cobrancas/[id]` — `ContestacaoSection` (abrir, comentário,
  documento, registrar resultado; leitura para sindicato, escrita só
  staff).
- `/backoffice/contestacoes` — métricas (volume, em aberto, tempo médio,
  valor contestado, causas, resultado) + tabela.
- Nav item "Contestações" (visível a todos, mesma regra da Auditoria).

## Arquivos criados
`supabase/migrations/0022_contestacoes.sql`,
`src/lib/validation/contestacao.ts`,
`src/app/backoffice/cobrancas/[id]/{contestacao-actions.ts, contestacao-section.tsx}`,
`src/app/backoffice/contestacoes/{page.tsx, contestacoes-table.tsx}`,
`e2e/contestacao.spec.ts`.

## Arquivos alterados
`src/types/database.types.ts`, `src/lib/collection/eligibility.ts`,
`src/lib/operations/sync.ts`, `src/lib/validation/documento.ts`,
`src/app/backoffice/cobrancas/[id]/page.tsx`,
`src/components/backoffice/nav-items.ts`.

## Banco de dados
`0022_contestacoes.sql`: 3 tabelas novas + 2 RPCs; altera constraints de
`cobrancas.status`, `documentos.categoria`, `work_items.tipo` (mesmo
padrão de `ALTER TABLE ... DROP/ADD CONSTRAINT` já usado na Rodada 15).
Índice único parcial em `contestacoes(cobranca_id)` para status em
`('aberta', 'em_analise')` — só uma contestação em aberto por cobrança
por vez, mesma lógica de `collection_enrollments` (Rodada 19).

### Bug real encontrado e corrigido durante a implementação
`contestacao_evidencias.documento_id` originalmente era
`on delete set null`. Mas `contestacao_evidencias_conteudo_check` exige
`documento_id` preenchido quando `tipo='documento'` — `set null`
deixaria a linha violando a própria constraint no exato momento em que
o documento fosse removido (`deleteDocumentoAction`, Rodada 10, é uma
ação real e alcançável). Corrigido para `on delete cascade`: remover o
arquivo remove a evidência que apontava pra ele, em vez de deixar uma
linha inválida. Encontrado durante a limpeza dos dados de teste local
(uma tentativa real de `delete from documentos` disparou a violação),
não em revisão de código — o tipo de bug que só aparece testando o
caminho de exclusão de verdade.

## Segurança
- RLS: leitura staff-ou-tenant nas 3 tabelas novas (transparência,
  regra 6); escrita exclusiva staff GSBC.
- `contestacao_eventos` sem policy de update/delete — histórico
  imutável por construção, mesmo padrão de `cobranca_eventos`/
  `negociacao_eventos`.
- Ambas as RPCs são `security invoker` — RLS do chamador vale, mesmo
  padrão de `register_negociacao_evento` (Rodada 7).
- Verificado ao vivo: sindicato vê a seção de contestação e a página de
  métricas (leitura), mas não tem os botões de escrita nem consegue
  chamar as actions (gate duplo: UI por `canManage` + RLS por
  `is_platform_staff`).

## Testes realizados
Verificação real, ao vivo, local **e** staging (regra 92):

- **Ciclo completo com uma cobrança real criada na hora**: régua
  iniciada → abrir contestação (tipo "Base de cálculo", valor alegado
  R$ 350) → cobrança mudou pra "Contestada" na hora, evento gravado em
  `cobranca_eventos` com a razão certa → adicionar comentário de
  evidência → registrar "Colocar em análise" → registrar resultado
  final "Parcialmente procedente" (com valor ajustado) → confirmado no
  banco: `contestacoes.status`, `resolvida_em`, `resolvida_por`
  preenchidos, **`cobrancas.status` permaneceu `'contestada'`** (não foi
  tocado pela resolução, como desenhado).
- **Pausa da régua verificada via cron real**: rodei
  `/api/cron/collection-engine` com o enrollment ativo e a cobrança
  contestada — resposta trouxe `puladosPorElegibilidade: 1` (a régua foi
  avaliada e pulada, não silenciosamente ignorada).
- **Work item "Contestação pendente" verificado via cron real**: uma
  segunda contestação de teste, ainda aberta, gerou
  `contestacoesPendentesAbertas: 1` e apareceu na Central Operacional
  ("Contestação pendente — Estrela do Sul", prioridade Alta). Registrei
  o resultado e rodei o cron de novo: `contestacoesPendentesResolvidas: 1`
  — auto-resolve confirmado, fila voltou a "vazia" sem ação manual.
- **Bug real encontrado e corrigido ao vivo**: a descrição do work item
  usava `formatDateBR()` (helper que espera coluna `date`, não
  `timestamptz`) para `contestacoes.aberta_em` — produzia "Aberta em
  Invalid Date." na Central Operacional. Corrigido para
  `new Date(...).toLocaleDateString("pt-BR")`; reverificado com um novo
  work item mostrando a data certa.
- **Evidência do tipo documento**: upload de arquivo via `<input
  type="file">` não é automatizável pela ferramenta de browser desta
  sessão (mesma limitação de segurança de qualquer automação de
  navegador contra inputs de arquivo) — verificado o caminho por SQL
  direto (insert em `documentos` com categoria `'contestacao'` +
  `contestacao_evidencias` com `tipo='documento'`), incluindo o teste
  negativo (comentário sem `comentario` preenchido rejeitado pela
  constraint) que revelou o bug do `on delete cascade` acima.
- **Métricas verificadas com dados reais**: 2 contestações de teste (1
  resolvida em 5 dias, 1 aberta) → "Volume total: 2", "Em aberto: 1",
  "Tempo médio de resolução: 5.0 dias", "Valor contestado: R$ 500,00",
  causas e resultado com as contagens certas.
- **Transparência do sindicato verificada ao vivo**: login como
  `dirigente.demo`, seção de contestação visível na ficha da cobrança
  (com o histórico e evidências), sem nenhum botão de ação; régua de
  cobrança (staff-only) corretamente ausente da mesma página.
- **e2e automatizado** (`e2e/contestacao.spec.ts`, 3 testes) rodado
  contra staging: 3/3 passando, mais os specs de régua/operações
  reverificados (7/7) para garantir que nada regrediu.
- **Regressão real encontrada e corrigida**: o texto do `EmptyState` da
  seção de contestação mencionava "régua de cobrança", que colidia
  (case-insensitive, substring) com a asserção
  `getByText("Régua de cobrança").toHaveCount(0)` do teste de
  transparência da Rodada 19 — o teste passou a falhar porque via 1
  elemento (o meu, não a seção de fato). Reescrito para "a cobrança é
  pausada automaticamente" — mesmo significado, sem a colisão textual.
- `npx tsc --noEmit`, `npx eslint .`, `npm run build` sem erros.
- Todos os artefatos de teste (cobranças, contestações, evidências,
  eventos, work items, documentos, audit logs) apagados do banco local
  depois — os 322 prospectos reais e 2 empresas do usuário permanecem
  intactos (reverificado por contagem após cada limpeza).

### O que não foi testado ao vivo
- **Upload real de arquivo** para evidência de documento (limitação de
  automação, não do código) — o código reaproveita
  `uploadDocumentoAction` (Rodada 10, já testado em produção real) quase
  linha a linha, e o caminho de dados (insert + constraint) foi
  verificado por SQL direto.
- **Tentar abrir uma segunda contestação enquanto uma já está aberta**
  (deveria ser rejeitada pelo índice único parcial + pela checagem
  explícita em `abrir_contestacao()`) — a lógica é idêntica ao padrão já
  testado ao vivo em `collection_enrollments` (Rodada 19); não repetido
  aqui por já estar coberto pelo mesmo mecanismo.

## Pendências
- **Nenhuma pendência nova de negócio** — os dois pontos deixados em
  aberto pela Rodada 19/20 (elegibilidade não considerar contestação;
  "Contestações pendentes" não existir na Central Operacional) foram
  fechados nesta rodada.
- **Duas falhas de e2e pré-existentes no staging, não relacionadas a
  esta rodada**: `financeiro-e-notificacoes` (SMTP do ambiente de
  staging retornando falha — visível também na timeline da cobrança
  seed, "Falha no envio do e-mail") e `prospectos`/`promocao-prospecto`
  (dados de importação de planilha já presentes de execuções anteriores
  do e2e, sem reset entre rodadas). Nenhuma delas toca código desta
  rodada; documentado aqui só para não confundir uma futura rodada que
  rode a suíte completa.

## Riscos residuais
| Risco | Classificação | Observação |
|---|---|---|
| Upload de documento como evidência não testado ao vivo (ferramenta de automação não sustenta input de arquivo) | Baixo | Reaproveita `uploadDocumentoAction` já testado na Rodada 10; caminho de dados verificado por SQL |
| Métricas por agregação em memória, sem índice/view dedicada | Baixo | Aceitável no volume atual; mesma decisão da Central Operacional (Rodada 20) |
| Suíte de e2e do staging tem 3 falhas pré-existentes não relacionadas (SMTP, dados de prospectos não resetados) | Baixo | Não introduzidas nesta rodada; sinalizado para não confundir a próxima |

## Regras de negócio pendentes
Nenhuma nova.

## Próximo staging recomendado
STG-05 (Portal de Regularização Empresarial) — primeira tela
voltada à empresa contestante, não mais só à equipe GSBC. Alternativa:
STG-06 (Payment Provider Integration) se o usuário priorizar fechar o
ciclo financeiro antes de abrir a plataforma pra fora.
