# GSBC — Rodada 25 (STG-09 — Escalonamento e Notificação Extrajudicial)

## Objetivo
Criar o estágio formal de escalonamento pra notificação extrajudicial —
Cobrança → Critérios → Revisão → Aprovação → Documento → Envio →
Evidência → Resultado (`docs/roadmap-stagings.md`, STG-09). O roadmap é
explícito: "notificação extrajudicial não é mero e-mail mais forte" —
esta rodada trata o processo como um caso jurídico formal, com
aprovação humana obrigatória antes de qualquer documento sair.

## Diagnóstico

### O ponto de entrada já existia — só não estava conectado
`legal_escalation` é status de `cobrancas` desde a Rodada 5
(0008_cobrancas.sql), nunca usado até agora. A Central Operacional
(STG-03/Rodada 19) já cria um `work_items` tipo `escalonamento` quando a
régua de cobrança se esgota (`src/lib/collection/engine.ts`), com
descrição citando literalmente "STG-09 (ainda não construída, continua
exigindo aprovação humana)". Esta rodada consome esse ponto de entrada
— não inventou um novo gatilho nem duplicou a lógica de elegibilidade já
existente em `src/lib/collection/eligibility.ts`.

### Decisão arquitetural central: Aprovação precisa de um papel mais
### estreito que "staff qualquer" — e isso muda a estratégia de RLS
Diferente de contestações (Rodada 21, onde qualquer staff GSBC pode
escrever — não existe papel "mais restrito" ali), aqui o roadmap pede
uma etapa de Aprovação formalmente distinta da Revisão. Uma policy de
UPDATE genérica pra `is_platform_staff()` (o padrão usado em
`contestacoes`) permitiria que qualquer analista se autoaprovasse direto
na tabela — a checagem de papel só existiria no app, e um staff mal-
intencionado (ou só um bug futuro) poderia contornar isso chamando o RPC
ou fazendo update direto.

Solução: nenhuma das 4 tabelas novas (`escalonamentos`,
`escalonamento_eventos`, `escalonamento_documentos`,
`escalonamento_envios`) recebe grant de insert/update/delete pra
`authenticated` — toda escrita passa exclusivamente por 6 funções
`security definer`, cada uma com sua própria checagem de autorização no
corpo (mesmo racional já usado em `log_audit_event`/`audit_logs`, e em
`abrir_contestacao` — Rodada 22). `decidir_aprovacao()` checa
`is_escalation_approver()` (papel `gsbc_juridico` ou `gsbc_super_admin`
— mais restrito que `is_platform_staff`); as outras 5 checam
`is_platform_staff()`.

**Verificado ao vivo, os dois níveis de defesa:**
- Chamar `decidir_aprovacao()` via RPC como um usuário `gsbc_analista`
  simulado (`set local request.jwt.claims`) foi rejeitado com "Apenas o
  papel Jurídico pode aprovar ou rejeitar um escalonamento." —
  `is_escalation_approver()` retornou `false` corretamente.
- Tentar um `UPDATE escalonamentos SET status = 'aprovada'` **direto na
  tabela**, como o mesmo usuário, afetou 0 linhas — confirmado que
  `authenticated` tem privilégio de tabela amplo por padrão nesta
  configuração Supabase (`\dp escalonamentos` mostrou
  `authenticated=arwdDxtm`), então a **ausência de uma policy de UPDATE**
  é o que realmente bloqueia a escrita direta — sem ela, um staff
  qualquer conseguiria burlar `decidir_aprovacao()` inteiramente. Achado
  que confirma empiricamente por que este desenho (zero policy de
  escrita, funil só via RPC) é necessário aqui — diferente de
  contestações, onde não havia essa lacuna de papel a proteger.

### `iniciar_escalonamento` é um gate de verdade, não só convenção de UI
"Critérios de escalonamento" (primeira caixa do Fluxo) virou uma
checagem real na função: bloqueia cobrança já `paid`, `cancelled`,
`closed`, `legal_escalation` ou `contestada`. Verificado ao vivo:
depois que uma cobrança já foi notificada e o resultado registrado
(`concluida`), tentar iniciar um segundo escalonamento na mesma
cobrança foi rejeitado com "Cobrança em status 'legal_escalation' não é
elegível" — porque `registrar_envio()` já tinha transicionado a
cobrança e nada (nem `registrar_resultado`) muda esse status de volta
automaticamente. Comportamento correto e esperado: um staff que queira
reabrir o caso primeiro usa "Mudar status" (ação já existente) pra
tirar a cobrança de `legal_escalation`.

### Cobrança só transiciona pra `legal_escalation` no Envio, não na
### Aprovação
Deliberado: até o documento sair de fato, o processo ainda é interno.
Só o envio de verdade é o ato irreversível que deve aparecer no
histórico da cobrança e parar a régua definitivamente (já em
`STATUS_ENCERRAM_REGUA`). `registrar_envio()` só chama
`change_cobranca_status()` no **primeiro** envio bem-sucedido — um
segundo envio (ex.: reenvio por cartório depois do e-mail) não gera um
segundo evento redundante. Verificado ao vivo por contagem:
`cobranca_eventos` teve exatamente 1 linha `legal_escalation` mesmo
depois de 2 envios registrados na mesma cobrança.

### Documento: PDF real, gerado em Node puro (sem chromium headless)
Decisão confirmada com o usuário: `@react-pdf/renderer` em vez de
puppeteer — renderiza em Node.js puro, sem binário de browser, sem
complicação extra de cold start/memória em serverless (Vercel). Nenhuma
infraestrutura nova precisou ser adicionada além da dependência npm.
Template é código (`src/lib/escalonamento/documento-template.tsx`,
`TEMPLATE_VERSAO = 1`), não editável via UI — o roadmap pede o
**registro** de qual versão foi usada em cada emissão
(`escalonamento_documentos.template_versao` +
`dados_geracao` jsonb, snapshot imutável dos dados no momento da
emissão), não uma tela de edição de texto jurídico.

### Reaproveitamento de infra existente em vez de bucket/tabela nova
O PDF gerado é armazenado no bucket `documentos-empresas` já existente
(Rodada 10), como uma linha `documentos` com `categoria='notificacao'`
(categoria que já existia, nunca usada de verdade até agora) — mesma
RLS de storage já auditada. `escalonamento_documentos` só linka a essa
linha + registra versão/dados/emissor. O mesmo vale pro comprovante de
envio físico: `categoria='comprovante'`, já existente.

### Envio: decisão confirmada com o usuário — e-mail automatizado +
### evidência manual de canal físico
Notificação extrajudicial por e-mail isolado tem valor jurídico fraco
no Brasil — por isso `escalonamento_envios` suporta múltiplos envios
por escalonamento (não um só): e-mail (`sendEmail()` já existente,
Rodada 12, estendido aqui pra suportar anexo — `attachments` no
nodemailer) E canal físico (correio com AR, cartório) como **evidência
manual sempre com comprovante anexado obrigatório** — sem comprovante,
não é evidência de verdade (regra 9: não criar funcionalidade falsa).

### Resultado nunca muda o status da cobrança automaticamente
Mesmo racional de `register_contestacao_evento` (Rodada 21):
"regularizou"/"sem resposta"/"ação judicial" não implica uma única
transição correta de status — fica com "Mudar status", já existente.

## Implementações
- `supabase/migrations/0025_escalonamento_extrajudicial.sql` — 4
  tabelas (`escalonamentos`, `escalonamento_eventos`,
  `escalonamento_documentos`, `escalonamento_envios`), função
  `is_escalation_approver()`, 6 RPCs `security definer`
  (`iniciar_escalonamento`, `submeter_para_aprovacao`,
  `decidir_aprovacao`, `registrar_documento_emitido`,
  `registrar_envio`, `registrar_resultado`), RLS só-leitura (sem grant
  de escrita pra `authenticated`).
- `src/lib/escalonamento/documento-template.tsx` — template PDF
  versionado (`@react-pdf/renderer`) + `gerarNotificacaoExtrajudicialPdf()`.
- `src/lib/auth/permissions.ts` — `isEscalationApprover()`.
- `src/lib/email/send.ts` — `sendEmail()` estendido com `attachments`.
- `src/lib/validation/escalonamento.ts` — schemas Zod.
- `src/app/backoffice/cobrancas/[id]/escalonamento-actions.ts` — 7
  Server Actions (iniciar, submeter, decidir aprovação, gerar
  documento, registrar envio por e-mail, registrar envio físico,
  registrar resultado).
- `src/app/backoffice/cobrancas/[id]/escalonamento-section.tsx` — UI na
  ficha da cobrança, um bloco de ação por estágio do Fluxo.
- `src/app/backoffice/escalonamentos/{page.tsx, escalonamentos-table.tsx}`
  — Central de Escalonamentos (mirror de `/backoffice/contestacoes`),
  visível a staff e sindicato (regra 6), com contador "aguardando
  aprovação" contextual ao papel de quem está vendo.
- Item de nav "Escalonamentos", visível aos dois papéis (aprovação em
  si é restrita via RPC/RLS, não navegação).
- `e2e/escalonamento.spec.ts`.

## Arquivos criados
`supabase/migrations/0025_escalonamento_extrajudicial.sql`,
`src/lib/escalonamento/documento-template.tsx`,
`src/lib/validation/escalonamento.ts`,
`src/app/backoffice/cobrancas/[id]/{escalonamento-actions.ts, escalonamento-section.tsx}`,
`src/app/backoffice/escalonamentos/{page.tsx, escalonamentos-table.tsx}`,
`e2e/escalonamento.spec.ts`.

## Arquivos alterados
`src/types/database.types.ts` (4 tabelas + 6 funções, editado à mão —
convenção já estabelecida deste arquivo), `src/lib/auth/permissions.ts`,
`src/lib/email/send.ts`, `src/app/backoffice/cobrancas/[id]/page.tsx`,
`src/components/backoffice/nav-items.ts`, `package.json`/`package-lock.json`
(`@react-pdf/renderer`).

## Banco de dados
`0025_escalonamento_extrajudicial.sql`: 4 tabelas novas. RLS: só
`select` (staff full + tenant members via `escalonamentos.tenant_id`)
— **zero policy de insert/update/delete** em qualquer uma das 4
tabelas; toda mutação passa pelas 6 funções `security definer`, cada
uma verificando autorização no corpo antes de escrever. Índice único
parcial (`escalonamentos_cobranca_ativo_idx`) garante só um
escalonamento em andamento por cobrança. Trigger de integridade
(`enforce_escalonamento_matches_cobranca`) garante tenant_id/empresa_id
batendo com a cobrança de origem, mesmo padrão de contestações.

## Segurança
- Aprovação restrita ao papel Jurídico (`gsbc_juridico`) ou Super Admin
  — dois níveis de defesa verificados ao vivo (RPC rejeita chamada
  direta de um não-aprovador; ausência de policy de UPDATE bloqueia
  bypass via escrita direta na tabela). Ver Diagnóstico acima pro
  detalhe do porquê isso era necessário aqui e não em contestações.
- `MOCK_PROVIDER_WEBHOOK_SECRET`-style: nenhum segredo novo introduzido
  nesta rodada — `sendEmail()` reaproveita SMTP já configurado.
- PDF/comprovantes armazenados no bucket privado já existente
  (`documentos-empresas`), RLS de storage já auditada (Rodada 10) —
  nenhuma superfície nova.
- `dados_geracao` (snapshot jsonb) garante que o conteúdo de um
  documento já emitido nunca muda retroativamente mesmo se o cadastro
  da empresa for editado depois (regra 5).
- `on delete restrict` em `escalonamento_documentos.documento_id` e
  `escalonamento_envios.comprovante_documento_id`: um documento/
  comprovante já vinculado a um escalonamento não pode ser apagado
  silenciosamente (regra 4).

## Testes realizados
Verificação real, ao vivo, local **e** staging (regra 92) — ciclo
completo do Fluxo, com fixture construída especificamente pra isso
(obrigação + cobrança `overdue` de teste, vinculada à empresa real
Mercado Bom Preço):

- **Fluxo feliz completo**: iniciar escalonamento → submeter para
  aprovação → aprovar (como Super Admin) → gerar documento (PDF real
  de 1 página, baixado e conferido — dados corretos, acentuação
  preservada) → enviar por e-mail (anexo PDF confirmado no Mailpit
  local, ícone de clipe) → registrar envio físico adicional (via RPC
  direto, simulando o upload de comprovante que a ferramenta de
  automação de browser não consegue disparar) → registrar resultado.
  Timeline da cobrança mostrou a transição real:
  "Vencida → Escalada jurídica" com a razão citando o escalonamento.
- **Gate de aprovação — 2 camadas** (ver Diagnóstico): RPC direto como
  analista simulado rejeitado; UPDATE direto na tabela como analista
  simulado afetou 0 linhas.
- **UI esconde a ação certa por papel**: analista (não-Jurídico) viu
  "Aguardando decisão do papel Jurídico" em vez do botão; Super Admin
  viu o botão normalmente.
- **Sindicato (transparência)**: viu a ficha completa (histórico,
  documento, evidências de envio) sem nenhum botão de ação — mesmo
  padrão de contestações/negociações.
- **Re-escalonamento bloqueado corretamente**: tentar iniciar um novo
  escalonamento numa cobrança já `legal_escalation` foi rejeitado com
  mensagem clara — comportamento correto, não um bug (ver Diagnóstico).
- **Central de Escalonamentos** (`/backoffice/escalonamentos`):
  carregou pros dois papéis, contadores corretos ("Aguardando sua
  aprovação" pro Jurídico vs. "Aguardando aprovação do Jurídico" pra
  quem não aprova), linha da tabela linkando pra cobrança certa.
- **Regressão encontrada e corrigida ao vivo, via e2e em staging**: o
  texto do `EmptyState` da nova seção ("régua de cobrança se esgota")
  colidiu (substring case-insensitive) com uma asserção já existente
  (`regua-cobranca.spec.ts`, Rodada 19) que verifica que o sindicato
  não vê a seção "Régua de cobrança" (ferramenta staff-only) — mesma
  classe de bug já documentada na Rodada 21. Corrigido reescrevendo a
  cópia (aqui e no `EscalonamentosTable`, por consistência) sem tocar
  no arquivo de teste; redeploy confirmou 39/42 passando (as 3 falhas
  pré-existentes de sempre, nenhuma nova).
- `npx tsc --noEmit`, `npx eslint .` (0 erros — 1 warning pré-existente
  não relacionado), `npm run build` sem erros.
- **Deploy em staging** (Vercel + Supabase Cloud): migration aplicada
  via SQL Editor (acentuação verificada antes de rodar — mesmo cuidado
  desde a Rodada 22), 4 tabelas confirmadas por query direta.
- **e2e automatizado** (`e2e/escalonamento.spec.ts`, 4 testes: seção
  aparece na ficha, Central carrega pros dois papéis, nav item visível)
  — 4/4 passando em staging, suíte completa 39/42 (3 falhas
  pré-existentes documentadas desde Rodada 21/22/23, nenhuma nova).
- Fixtures de teste (obrigação, cobrança, escalonamento, eventos,
  documento gerado, envios, comprovante stand-in, PDF real no Storage)
  totalmente apagados depois — 322 prospectos reais, 2 empresas, 1
  cobrança/pagamento real, 2 obrigações reais reverificados intactos
  por contagem após a limpeza (local).

### O que não foi testado ao vivo
- **Upload de arquivo via UI** (dialog "Registrar envio físico"): a
  ferramenta de automação de browser não consegue interagir com o
  seletor nativo de arquivo do SO. O caminho de código é idêntico ao já
  testado em `adicionarDocumentoEvidenciaAction` (contestação, Rodada
  21) pro upload em si — a parte nova (`registrar_envio` com canal
  físico + `comprovante_documento_id`) foi verificada via RPC direto
  (ver Testes acima), incluindo o segundo-envio-não-duplica-evento.
- **Rejeição pelo Jurídico** (branch `p_aprovado = false` de
  `decidir_aprovacao`): código simétrico ao de aprovação, mesmo teste
  de autorização já cobre o gate; a branch em si (campos que
  permanecem null) não foi exercitada ao vivo por tempo.
- **Papel `gsbc_juridico` real**: testado via simulação de JWT
  (`gsbc_analista` negado) e via Super Admin (aprovador legítimo) — não
  há usuário seed com o papel `gsbc_juridico` especificamente; o
  comportamento é idêntico pro código (`is_escalation_approver` não
  distingue os dois papéis), mas fica como nota.

## Pendências
- **Nenhum usuário seed com papel `gsbc_juridico`** — só Super Admin e
  Dirigente existem em `supabase/seed.sql`. Não bloqueia nada (Super
  Admin já cobre o caso de aprovador), mas um seed de demonstração mais
  completo se beneficiaria de um usuário Jurídico dedicado.
- **Branch de rejeição não exercitada ao vivo** — ver acima.
- **Sem botão de reenvio de e-mail com retry automático** — se o SMTP
  falhar, staff precisa clicar "Enviar por e-mail" de novo manualmente;
  aceitável nesta rodada (mesmo padrão de `sendNotificacaoAction`,
  Rodada 12).

## Riscos residuais
| Risco | Classificação | Observação |
|---|---|---|
| Papel Jurídico nunca testado com um usuário real (só via simulação/Super Admin) | Baixo | Mecanismo é o mesmo pros dois papéis; falta só o dado de demonstração |
| Rejeição pelo Jurídico não exercitada ao vivo | Baixo | Código simétrico à aprovação, mesmo gate de autorização |
| Documento gerado é uma minuta formal, não substitui revisão jurídica humana de verdade antes do envio real a uma empresa | Esperado (regra 8: IA/automação não é autoridade jurídica) | A aprovação humana do Jurídico é exatamente o controle que existe pra isso |

## Regras de negócio pendentes
Nenhuma nova — as três decisões arquiteturais desta rodada (PDF real
via `@react-pdf/renderer`, e-mail + evidência manual de canal físico,
aprovador = papel Jurídico) foram confirmadas com o usuário antes de
implementar.

## Próximo staging recomendado
STG-10 (Revenue Opportunity Engine) é o próximo item do roadmap.
