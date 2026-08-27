# GSBC — Rodada 22 (STG-05 — Portal de Regularização Empresarial)

## Objetivo
Criar o primeiro ambiente externo da plataforma: um contato de empresa
loga via magic link e vê só as pendências da própria empresa junto ao
Sindicato — consultar cobrança, entender a origem, ver evidências e
documentos, manifestar-se (contestar), acompanhar negociação, responder
proposta, ver comprovantes de pagamento (`docs/roadmap-stagings.md`,
STG-05). Não tratado como "portal do devedor" — nome e tom são
"Regularização".

## Estado inicial
Toda a plataforma até aqui tinha exatamente dois tipos de principal:
staff GSBC e membro de sindicato — ambos via `users` + `memberships`,
RLS escopada por `tenant_id`. `empresa_contatos` (Rodada 2) existia só
como dado informacional, sem nenhum vínculo de autenticação. O código
`empresa_representante` já estava reservado em `roles` desde a Rodada 2
("Reservado para o Portal da Empresa (não implementado em P0)") — mas é
um papel de `membership` (`tenant_type='sindicato'`), o que não teria
resolvido o problema real: uma membership no tenant do sindicato dá
visibilidade a **todas** as empresas daquele sindicato (é assim que
`user_tenant_ids()` funciona hoje, de propósito, pra dirigentes verem a
carteira inteira) — um contato de empresa precisa ver só a própria
empresa. O papel ficou como achado de pesquisa, não foi usado.

## Diagnóstico e decisões arquiteturais (confirmadas com o usuário antes de implementar)

### Terceiro principal via Supabase Auth nativo, não token bespoke
Decisão explicitamente confirmada: o contato de empresa vira um
`auth.users` real (via `inviteUserByEmail`/`signInWithOtp`, mesmo
mecanismo já usado no convite de membership desde a Rodada 2) — nunca um
sistema de token fora do Supabase Auth verificado em código de
aplicação. Motivo: a regra 2 do AGENTS.md ("RLS é a autoridade final;
frontend nunca é barreira de segurança") só se sustenta se **todo**
principal, incluindo este novo, for avaliado pelo mesmo mecanismo de
autorização do banco — um token bespoke moveria a fronteira de
segurança pro código da aplicação, exatamente o anti-padrão que a
constituição do projeto proíbe.

### `empresa_contatos.user_id` + RLS aditiva, nunca substituindo policies existentes
`empresa_contatos` ganhou `user_id`, `portal_access_status`
(`none`/`invited`/`active`), `portal_invited_at/by`. Uma nova função
`is_empresa_contato(p_empresa_id)` (security definer, mesmo padrão de
`is_platform_staff`/`user_can_access_empresa`) é a checagem central de
~18 policies **aditivas** — nenhuma policy existente foi removida ou
reescrita, Postgres combina policies permissivas com OR. `user_id ->
empresa_id` é 1:1 por construção (índice único parcial): um contato só
pertence a uma empresa.

### `abrir_contestacao()` virou security definer com checagem explícita — a decisão mais delicada da rodada
Design original (RLS aditiva + a função continuar `security invoker`,
como na Rodada 21) quebrou na primeira verificação ao vivo: a função
encadeia `change_cobranca_status()`, que escreve em
`cobrancas`/`cobranca_eventos` — tabelas que o portal **nunca** deve
poder escrever livremente (abrir uma policy de update ampla ali
permitiria a um contato chamar `change_cobranca_status()` direto via
RPC com **qualquer** status, não só `'contestada'` — ex.: forjar
`'paid'` sem pagar). A saída não é dar mais RLS pro portal — é a própria
função, que já sabe fazer só a transição específica e hardcoded
(`'contestada'`), assumir esse privilégio depois de validar
explicitamente a autorização (`is_platform_staff` OU
`is_empresa_contato` da empresa daquela cobrança) logo no início do
corpo. `auth.uid()` não muda dentro de uma `security definer` — ele lê o
JWT da requisição, não o role Postgres efetivo — então a checagem
continua sendo sobre quem de fato chamou. Mesmo raciocínio usado nas
próprias funções auxiliares (`is_platform_staff`, `user_can_access_empresa`)
desde as primeiras rodadas, aplicado agora a uma função que **também**
escreve, não só lê.

### `register_negociacao_evento()` não precisou do mesmo tratamento
Diferente de `abrir_contestacao()`, o caminho do portal pra negociação
nunca chama `change_cobranca_status()` — só grava o evento e atualiza a
própria `negociacoes` (decisão abaixo). Bastou RLS aditiva comum:
`negociacoes_update_portal` (a função já atualiza `negociacoes.status`/
`valor_atual` internamente — sem essa policy o evento seria gravado mas
o cabeçalho ficaria desatualizado, silenciosamente) e
`negociacao_eventos_insert_portal` **restrita por `tipo`**:
```sql
with check (tipo in ('contraproposta_empresa', 'aceite') and ...)
```
Nunca `'proposta_gsbc'` (spoofing de oferta da GSBC) nem
`'recusa'`/`'observacao'` (autoria ambígua). `'aceite'` é permitido
porque só vincula o próprio contato à proposta que a GSBC já fez —
nunca manipula dado alheio. Verificado ao vivo via SQL: tentativa de
`'proposta_gsbc'` rejeitada pela RLS.

### Aceite da empresa nunca muda o status da cobrança sozinho
Diferente do aceite feito por staff (que já dispara
`change_cobranca_status(..., 'agreement_reached', ...)`), o aceite via
portal só grava o evento e atualiza `negociacoes.status` — a cobrança
fica como está até um humano da GSBC revisar e confirmar via "Mudar
status". Mesmo princípio de "estado consequente fica com humano" da
Rodada 21 (resultado de contestação não muda `cobrancas.status`
sozinho), aqui ainda mais estrito porque é a própria contraparte, não a
GSBC, quem está afirmando o aceite.

### Acesso ao portal nunca é automático (decisão confirmada com o usuário)
Um contato cadastrado hoje continua sendo só dado informacional até um
staff GSBC clicar "Conceder acesso ao portal" — mesma lógica já usada
pro convite de membership (Rodada 2). `portal_access_status` vai
`none -> invited` no convite e `invited -> active` só quando o contato
efetivamente confirma o e-mail (clica no link) — trigger adicional em
`auth.users.email_confirmed_at` (Postgres aceita múltiplos triggers no
mesmo evento; optei por um trigger novo em vez de alterar
`handle_user_email_confirmed()` da Rodada 2 — aditivo, não invasivo).

### "Pagar" e "consultar parcelas" ficaram de fora (decisão confirmada com o usuário)
Sem gateway de pagamento real (isso é STG-06, ainda não construído) nem
conceito de parcelamento no schema (negociação só tem um `valor_atual`,
não um cronograma) — construir qualquer um dos dois agora exigiria
inventar dado ou fluxo falso, proibido pela regra 9 do AGENTS.md. O
portal mostra pendência, evidências, contestação, negociação e
comprovantes de pagamentos **já registrados** pela GSBC (dado real) —
"pagar" fica de fora até o STG-06 existir de verdade.

## Implementações
- `empresa_contatos`: colunas de acesso ao portal + trigger
  invited→active (`0023_portal_empresarial.sql`).
- `is_empresa_contato()`; `user_can_access_empresa()` estendida (Rodada
  10) pra também cobrir o portal — propaga leitura de documentos/storage
  sem tocar nas duas policies que já usam essa função.
- `abrir_contestacao()` redefinida como security definer com checagem
  explícita (ver acima).
- ~18 policies RLS aditivas cobrindo empresas, obrigações, cláusulas,
  instrumentos, cobranças, cobranca_eventos, contestações (+ eventos +
  evidências), negociações (+ eventos), pagamentos, documentos e
  storage.objects.
- `src/lib/auth/portal-session.ts` — `getCurrentPortalContato()`/
  `requireCurrentPortalContato()`, contexto de autorização
  completamente separado de `session.ts` (staff/sindicato).
- `src/proxy.ts` (via `lib/supabase/proxy.ts`) — gate de `/portal/*`.
- `/portal/login` — pede e-mail, sempre responde a mesma mensagem
  genérica (anti-enumeração), chama `signInWithOtp` só se o e-mail
  corresponder a um contato `invited`/`active` (checagem server-side
  antes de qualquer envio).
- `/auth/confirm` — callback compartilhado do Supabase Auth (convite e
  magic link), troca `code`/`token_hash` pelo cookie de sessão real.
- `/portal` (dashboard) e `/portal/cobrancas/[id]` — "Entenda esta
  cobrança" (Origem/Instrumento/Cláusula/Período/Base/Principal/
  Atualização/Total), Pagamentos (reaproveita `PagamentosList` da
  Rodada 12 tal qual), Negociação (responder proposta/aceitar) e
  Contestação (abrir/comentar/anexar — reaproveita quase tudo da Rodada
  21, sem "Registrar resultado", exclusivo de staff).
- `src/app/backoffice/empresas/[id]/contatos-section.tsx` — badge de
  status + botão "Conceder acesso ao portal" por contato.
- `e2e/portal-empresarial.spec.ts`.

## Arquivos criados
`supabase/migrations/0023_portal_empresarial.sql`,
`src/lib/auth/portal-session.ts`, `src/lib/validation/portal.ts`,
`src/app/auth/confirm/route.ts`,
`src/app/portal/login/{page.tsx, login-form.tsx, actions.ts}`,
`src/app/portal/(contato)/layout.tsx`,
`src/app/portal/(contato)/page.tsx`,
`src/app/portal/(contato)/cobrancas/[id]/{page.tsx, actions.ts, entenda-cobranca-section.tsx, documentos-portal-list.tsx, contestacao-portal-section.tsx, negociacao-portal-section.tsx}`,
`e2e/portal-empresarial.spec.ts`.

## Arquivos alterados
`src/types/{database.types.ts, domain.ts}`,
`src/lib/supabase/{admin.ts, proxy.ts}`,
`src/app/backoffice/empresas/actions.ts`,
`src/app/backoffice/empresas/[id]/{page.tsx, contatos-section.tsx}`,
`next.config.ts` (`allowedDevOrigins`, ver Testes),
`supabase/config.toml` (`site_url`/`additional_redirect_urls`, ver
Testes).

## Banco de dados
`0023_portal_empresarial.sql`: 4 colunas novas em `empresa_contatos` +
índice único parcial; 2 funções novas (`is_empresa_contato`,
`handle_portal_contato_email_confirmed`) + 1 trigger; 2 funções
redefinidas (`user_can_access_empresa` estendida, `abrir_contestacao`
convertida pra security definer); 18 policies RLS aditivas — nenhuma
tabela/policy existente foi removida ou reescrita.

## Segurança
Todas as quatro adversariais de segurança que o próprio roadmap do
STG-05 pede ("Testar: enumeração de IDs; acesso a outra empresa; link
expirado; link reutilizado indevidamente") foram verificadas ao vivo:

- **Enumeração de IDs**: `/portal/login` responde com a mesma frase
  genérica ("Se este e-mail tiver acesso ao portal, enviamos um link...")
  para um e-mail cadastrado e para um inexistente — a diferença nunca
  chega no cliente. Verificado ao vivo e coberto em e2e.
- **Acesso a outra empresa**: verificado em duas camadas.
  **Leitura** — um contato da Bom Preço consultando `select ... from
  cobrancas where id = <cobrança da Estrela do Sul>` sob RLS real (role
  `authenticated` + JWT simulado) recebe **0 linhas** — nem sabe que a
  linha existe. **Escrita** — o mesmo contato chamando
  `abrir_contestacao()` ou `register_negociacao_evento()` contra uma
  entidade de outra empresa é rejeitado explicitamente
  (`Sem permissão...` / violação de RLS), não silenciosamente ignorado.
  Testado tanto via SQL direto (`set role authenticated` +
  `request.jwt.claims`) quanto via UI real (URL de cobrança alheia ->
  404).
- **Link reutilizado indevidamente**: um magic link já usado com sucesso
  foi reaberto uma segunda vez — Supabase Auth rejeitou o token,
  `/auth/confirm` caiu no branch de falha e redirecionou pra
  `/portal/login` sem nenhuma sessão nova sendo criada (confirmado
  navegando pra `/portal` na sequência — voltou pro login).
- **Link expirado**: não testado ao vivo — exigiria esperar a expiração
  real do token ou manipular o relógio do servidor Auth, nenhum dos dois
  praticável nesta sessão. O mecanismo é o mesmo do Supabase Auth já
  usado desde a Rodada 2 (convite de membership), não uma implementação
  nova desta rodada.
- **Spoofing de proposta da GSBC**: um contato de portal tentando
  `register_negociacao_evento(..., 'proposta_gsbc', ...)` é rejeitado
  pela RLS (`negociacao_eventos_insert_portal` só permite
  `contraproposta_empresa`/`aceite`). Verificado ao vivo via SQL.
- RLS de todas as tabelas novas/estendidas é aditiva — nenhuma
  visibilidade de staff/sindicato foi alterada.

## Testes realizados
Verificação real, ao vivo, local **e** staging (regra 92) — a rodada com
mais superfície de segurança do projeto até agora, por criar um
principal de autenticação inteiramente novo:

- **Ciclo completo de convite → e-mail → clique → sessão → dashboard**,
  local, com um contato real (Carlos Mendes, Mercado Bom Preço): staff
  concede acesso -> e-mail de convite chega (Mailpit) -> clique no link
  -> sessão de portal criada -> dashboard mostra só a cobrança da própria
  empresa. Repetido com sucesso para o fluxo de **login recorrente**
  (magic link via `/portal/login`, e-mail diferente do de convite).
- **"Entenda esta cobrança" + Pagamentos + Negociação (seed, já aceita)
  renderizados com dado real** na ficha da cobrança do portal.
- **Abrir contestação pelo portal, ao vivo, via UI real**: cobrança
  mudou de "Paga" para "Contestada" na hora, evento de abertura
  registrado com o `user_id` correto do contato — depois desfeito e a
  cobrança restaurada ao estado original (regra de nunca deixar
  artefato de teste em dado real).
- **Responder negociação (contraproposta e aceite) verificado via SQL
  com RLS real** (fixture isolada, Estrela do Sul): contraproposta
  grava `valor_atual`/`status='em_negociacao'`; aceite grava
  `status='aceita'`; `cobrancas.status` nunca tocado, como desenhado.
- **Duas regressões reais encontradas e corrigidas durante a própria
  verificação ao vivo** (não em revisão de código):
  1. `src/lib/supabase/proxy.ts` redirecionava **qualquer** usuário
     autenticado (não só contato de portal) para longe de
     `/portal/login` — um staff/sindicato logado caindo em `/portal`
     era imediatamente rejeitado por `requireCurrentPortalContato()` e
     mandado de volta pra `/portal/login`, que o proxy redirecionava de
     novo pra `/portal` — loop infinito. Corrigido removendo esse
     redirect (autenticação ≠ ser contato de portal; a página de login
     trata sozinha o caso de sessão já existente).
  2. `src/app/auth/confirm/route.ts` só tratava o formato
     `token_hash`+`type` — mas o Supabase Auth local/desta versão usa
     PKCE e manda `code` no callback. Corrigido pra tratar os dois
     formatos (`exchangeCodeForSession` para `code`,
     `verifyOtp` para `token_hash`+`type`), descoberto só ao ver o
     redirect real na aba do navegador, não em código.
- **Config de ambiente local corrigida**: `supabase/config.toml` tinha
  `site_url`/`additional_redirect_urls` apontando só pra `127.0.0.1`,
  enquanto o app roda em `localhost:3000` (`.env.example`) —
  `redirectTo` do convite/magic link caía fora da allowlist e o
  Supabase Auth local descartava silenciosamente o destino, voltando
  pra URL raiz. Corrigido (`localhost:3000` como site_url +
  `127.0.0.1`/`localhost` na allowlist) — exigiu `supabase stop`/`start`
  pra recriar o container do Auth local com o novo env (dado real
  verificado intacto antes/depois via contagem). `next.config.ts` ganhou
  `allowedDevOrigins` pelo mesmo motivo (acessar via `127.0.0.1`
  também precisa ser permitido pelo Next dev server).
- **Deploy em staging + aplicação da migration** (Supabase Cloud, SQL
  Editor): schema, funções, trigger e as 18 policies aditivas
  confirmadas presentes via query direta. UI nova (`Conceder acesso ao
  portal`, `/portal/login`, `/backoffice/contestacoes` etc.) renderizada
  corretamente em `gsbc-platform.vercel.app`.
- **Achado em staging, não corrigido (infraestrutura, fora do escopo
  desta rodada)**: o projeto Supabase Cloud usado como staging não tem
  SMTP customizado configurado — usa o mailer padrão do Supabase Cloud,
  limitado a **2 e-mails/hora**. As duas tentativas de convite feitas
  durante a verificação em staging esgotaram esse limite (confirmado nos
  Auth Logs do próprio Supabase — `/invite` completou mas foi
  limitado). Isso explica também a falha pré-existente do e2e
  `financeiro-e-notificacoes` (Rodada 21 já registrava isso sem saber a
  causa raiz). Ciclo completo de e-mail só foi possível verificar em
  local (Mailpit, sem limite).
- `npx tsc --noEmit`, `npx eslint .`, `npm run build` sem erros.
- **e2e automatizado** (`e2e/portal-empresarial.spec.ts`, 4 testes,
  cobrindo só o que não depende de e-mail real): 4/4 passando em
  staging. Suíte completa rerrodada: 27/31 passando — as mesmas 3
  falhas pré-existentes da Rodada 21 (SMTP, dados de prospectos não
  resetados), nenhuma nova.
- Todos os artefatos de teste (cobranças, negociações, contatos de
  portal, usuários auth, audit logs) apagados/revertidos depois — os
  322 prospectos reais, 2 empresas e a cobrança seed permanecem
  intactos (reverificado por contagem após cada limpeza, local e
  staging).

### O que não foi testado ao vivo
- **Link expirado** (ver Segurança acima — mecanismo do Supabase Auth,
  não implementação nova).
- **Upload de documento como evidência a partir do portal** — mesma
  limitação de automação de navegador já registrada na Rodada 21 (input
  de arquivo não é scriptável); o código reaproveita
  `adicionarDocumentoEvidenciaPortalAction`, que segue o padrão já
  testado de `uploadDocumentoAction` (Rodada 10) e
  `adicionarDocumentoEvidenciaAction` (Rodada 21).
- **Ciclo completo de e-mail em staging** — bloqueado pelo limite de 2
  e-mails/hora do mailer padrão (ver Segurança/Testes acima),
  verificado plenamente em local.

## Pendências
- **SMTP customizado para o projeto de staging** — sem isso, qualquer
  fluxo de e-mail real (convite de portal, notificação de régua) fica
  limitado a 2/hora no Supabase Cloud. Requer um provedor de e-mail
  configurado pelo usuário (domínio, credenciais) — fora do escopo de
  uma rodada de implementação.
- **"Consultar parcelas" e "Pagar"** ficam fora até existir,
  respectivamente, um conceito de parcelamento no schema e o gateway de
  pagamento real (STG-06).
- **Reset de dados de prospectos/e2e em staging** — mesma pendência já
  registrada na Rodada 21, não relacionada a esta rodada.

## Riscos residuais
| Risco | Classificação | Observação |
|---|---|---|
| Sem SMTP customizado em staging — convite/magic link real limitado a 2/hora | Médio | Bloqueia teste de e-mail em staging e uso real de convites em volume; requer decisão do usuário (provedor, custo) |
| `abrir_contestacao()` como security definer concentra mais responsabilidade de autorização numa função só | Baixo | Mitigado por checagem explícita logo no início + verificação ao vivo de ambos os caminhos (staff e portal), incluindo rejeição cross-empresa |
| Link expirado não testado ao vivo | Baixo | Mecanismo herdado do Supabase Auth, já em uso desde a Rodada 2; não é lógica nova desta rodada |
| Upload de documento via portal não testado ao vivo (limitação de automação) | Baixo | Reaproveita fluxo já testado em produção real (Rodada 10) e ao vivo (Rodada 21) |

## Regras de negócio pendentes
Nenhuma nova — os dois cortes de escopo desta rodada ("pagar",
"parcelas") já estavam confirmados com o usuário antes de implementar,
não são decisões em aberto.

## Próximo staging recomendado
STG-06 (Payment Provider Integration) — destrava "pagar" no portal
(cortado nesta rodada por falta de gateway real) e é a próxima peça do
ciclo financeiro. Alternativa: STG-08 (Revenue Command Center do
Sindicato) se o usuário priorizar visibilidade agregada antes de
conectar um provider de pagamento real.
