# GSBC — Rodada 30 (Descarte automático de prospectos por situação cadastral)

## Objetivo

Três mudanças pedidas pelo usuário no módulo de prospecção — as duas
primeiras no início da rodada, a terceira depois de testar o resultado
das duas primeiras ao vivo:

1. Renomear "Prospectos" para **"Empresas Prospectadas"** — o rótulo
   "Prospectos" era ambíguo com o módulo "Empresas" (empresas já
   vinculadas a um sindicato); o usuário queria um nome que deixasse
   claro que são empresas identificadas via pesquisa de mercado, ainda
   sem vínculo, candidatas a entrar na base de cobrança do sindicato.
2. **Assim que uma planilha sobe** no módulo, o sistema deve
   automaticamente consultar a Receita Federal para cada empresa nova
   e **descartar** (sem apagar) as que estiverem baixadas, suspensas,
   inaptas, nulas, ou que não forem localizadas.
3. **Complemento, mesma rodada**: depois de implementar e testar (1) e
   (2), o usuário reportou "as empresas precisam aparecer aqui" —
   diagnóstico confirmou que a consulta automática só cobre linhas
   NOVAS inseridas durante uma importação; os ~290 prospectos da base
   real, importados antes dessa automação existir, nunca tinham sido
   consultados e ficavam presos em `pesquisa_iniciada` para sempre. Ver
   seção própria abaixo ("Varredura periódica").

## Diagnóstico e decisões arquiteturais

Diagnóstico prévio (Explore agent) confirmou: o pipeline de consulta
oficial de CNPJ já existia (`avaliarCnpj` / BrasilAPI, Rodadas 14-16),
usado hoje só sob clique manual ("Consultar CNPJ oficial") tanto em
`Empresas` quanto em `Empresas Prospectadas`. A importação de planilha
(`importarProspectosAction`) inseria os prospectos como `status='novo'`
sem consultar nada — a consulta era 100% opt-in.

Quatro decisões arquiteturais genuínas, confirmadas com o usuário via
AskUserQuestion antes de implementar:

1. **Execução: direto na importação, sequencial** (não background/cron).
   Essa foi a única decisão em que o usuário foi contra minha
   recomendação — eu tinha sugerido replicar o único precedente de
   automação assíncrona da plataforma (`collection-engine`, rodado via
   cron) para evitar risco de timeout de função serverless em
   planilhas grandes (a referência real tem ~1257 linhas, e o cliente
   BrasilAPI não tem retry/rate-limit). O usuário preferiu simplicidade
   síncrona. Mitigado com `maxDuration = 300` na página (só tem efeito
   real em plano Vercel Pro+) e `try/catch` por item — uma falha
   isolada de rede não derruba a importação inteira. Risco residual
   documentado abaixo.
2. **Critério de descarte**: Baixada + Suspensa + Inapta + Nula —
   qualquer situação cadastral diferente de `ATIVA` (recomendado, e o
   que o código já checava implicitamente no fluxo manual).
3. **Mecanismo**: novo status (`descartado_receita`), sem apagar nada —
   segue o precedente já estabelecido em `oportunidades.status`
   (Rodada 26, `'descartada'` com `descartado_em`/`descartado_por`/
   `motivo_decisao`) e a regra não-negociável "Histórico não pode
   desaparecer".
4. **CNPJ não encontrado (404 na Receita)**: também descarta — mesmo
   tratamento que "baixada", já que um CNPJ inexistente na Receita não
   é uma empresa cobrável.

Essas decisões deliberadamente **não** tratam erro de rede/validação
(ex.: CNPJ malformado, BrasilAPI fora do ar) como descarte — esses
casos retornam `status: "erro"` de `avaliarCnpj`/`consultarCnpjOficial`
e o dossiê permanece `pesquisa_iniciada` para revisão manual. Isso
segue a regra "Nunca inventar dados": a ausência de uma resposta válida
da Receita não é evidência de que a empresa está baixada.

## Implementações

### Regra de negócio compartilhada

`decidirStatusDossie()` em `src/lib/cnpj/avaliacao.ts` — função pura,
única fonte de verdade para a decisão "descarta ou valida", usada tanto
pelo fluxo manual (`consultarProspectoAction`) quanto pelo automático
(dentro de `importarProspectosAction`). Tipada para excluir
deliberadamente a variante `"erro"` de `AvaliacaoResultado` — quem
chama tem que tratar falha de rede/validação separadamente, nunca opera
uma decisão de negócio sobre um resultado indeterminado.

### Importação — consulta automática sequencial

`importarProspectosAction` (`src/app/backoffice/prospectos/actions.ts`):
depois de inserir os prospectos novos, itera sobre eles chamando
`avaliarCnpj()` + `decidirStatusDossie()` um a um, grava
evidências (`dossie_evidencias`) e atualiza o dossiê. Contadores novos
no resumo: `consultadas` e `descartadas`. Uma falha isolada (`catch`
por item) não interrompe o loop.

### UI

- `/backoffice/prospectos` renomeado para "Empresas Prospectadas" (nav
  e título da página), filtra `status != 'descartado_receita'` da
  listagem padrão.
- Ficha do prospecto mostra um aviso quando descartado automaticamente,
  com o motivo exato, deixando claro que o registro não foi apagado.
- Diálogo de importação avisa que a consulta é automática, pode levar
  minutos em planilhas grandes, e mostra os contadores de consulta e
  descarte no resumo pós-importação.

### Refatoração: um único ponto de escrita da consulta

Antes do complemento, a lógica "chama `avaliarCnpj`, decide o status,
grava o dossiê e as evidências" estava duplicada em 2 lugares
(`consultarProspectoAction` e o loop de importação) — um terceiro
gatilho (cron) duplicaria de novo. Extraída para
`consultarEAtualizarDossie()` em `src/lib/cnpj/avaliacao.ts`, que
recebe o cliente Supabase (funciona tanto com o cliente autenticado
quanto com o admin) e `consultadoPor` (`null` quando quem chama é uma
automação sem usuário humano — `dossie_evidencias.consultado_por` já
aceitava null). Os 3 gatilhos (botão manual, importação, cron) chamam
essa mesma função — nunca podem decidir diferente dependendo de quem
disparou.

### Varredura periódica (cron) — cobre o backlog

`src/lib/cnpj/consulta-sweep.ts` (`runConsultaProspectosSweep`) +
`src/app/api/cron/prospectos-consulta/route.ts` — mesmo padrão do
`collection-engine` (STG-02): Vercel Cron, `Authorization: Bearer
$CRON_SECRET` injetado pela própria Vercel, `createAdminClient()`
(sem sessão de usuário, RLS contornado por design — mesma justificativa
já documentada em `src/lib/supabase/admin.ts`). Endpoint próprio,
**não** empilhado no cron do collection-engine — aqui cada item é uma
chamada de rede real à BrasilAPI, bem mais lento que uma varredura só
de banco.

Decisão confirmada com o usuário (AskUserQuestion, 3 opções: botão
manual em background, botão síncrono, cron recorrente) — **cron
recorrente**, cobrindo tanto o backlog atual quanto qualquer gap
futuro (linha inserida por outro caminho que não seja a importação ou
o botão manual).

Diferenças de design em relação ao `collection-engine`:

- **`BATCH_SIZE = 50`** por execução, ao contrário do
  collection-engine que processa tudo de uma vez — lá cada item é
  operação de banco; aqui é chamada de rede real, sem retry/rate-limit
  no cliente da BrasilAPI, então um lote sem limite arriscaria estourar
  o timeout da function bem mais facilmente. Convergência natural: o
  que não coube fica com `ultima_consulta_em` mais antigo (ou nulo),
  então é priorizado na próxima execução (`order by ultima_consulta_em
  asc nulls first, created_at asc`).
- **`vercel.json`** ganhou uma segunda entrada de cron
  (`/api/cron/prospectos-consulta`, `0 13 * * *`) — não verificado ao
  vivo contra o plano Vercel real do projeto (rodando só localmente
  nesta rodada); ver Riscos residuais.

`maxDuration = 120` na rota (mesma ressalva já documentada: só tem
efeito real em Vercel Pro+).

## Banco de dados

`supabase/migrations/0030_descarte_automatico_prospectos.sql` (aplicada
localmente via `docker exec ... psql`):

- `dossies_cadastrais.status` — novo valor de CHECK constraint:
  `'descartado_receita'`.
- Duas colunas novas: `descartado_em timestamptz`, `descartado_motivo
  text`.

Nenhuma coluna removida, nenhum dado migrado — puramente aditivo.

## Segurança

Nenhuma superfície nova de RLS: a automação roda dentro da mesma
Server Action já protegida por `requireCurrentUser()` +
`user.isOwner`, e grava nas mesmas tabelas (`dossies_cadastrais`,
`dossie_evidencias`) já cobertas pelas policies existentes (Rodada 16).
Não há novo endpoint, não há novo papel.

## Testes realizados

Ao vivo, contra a BrasilAPI real (não mockado):

1. **Fluxo manual, CNPJ real baixado**: "A R TELECOM LTDA"
   (57890254000140) — BrasilAPI retornou situação "INAPTA".
   `decidirStatusDossie` corretamente setou `descartado_receita` com o
   motivo `CNPJ com situação cadastral "INAPTA" na Receita Federal
   (diferente de ATIVA).`. Confirmado no banco: linha preservada,
   `descartado_em`/`descartado_motivo` populados, excluída da listagem
   padrão.
2. **Fluxo automático de importação, CNPJ real ativo**: planilha de
   teste com CNPJ real da Petrobras (33000167000101). Resultado:
   `cadastro_validado`, razão social e score reais vindos da Receita,
   **não** descartado. Resumo da importação mostrou `2 consultado(s)
   na Receita Federal`.
3. **Fluxo automático de importação, CNPJ com formato inválido**
   (dígito verificador incorreto): retornou `status: "erro"` do
   cliente BrasilAPI (HTTP 400) — como esperado, **não** foi
   descartado automaticamente (ficou `pesquisa_iniciada` para revisão
   manual). Esse resultado expôs que meu CNPJ de teste original não
   testava o caminho "não encontrado" (404) — só confirmou que CNPJ
   malformado corretamente não é tratado como "baixada".
4. **Fluxo manual, CNPJ sintaticamente válido mas inexistente na
   Receita** (dígito verificador calculado corretamente, confirmado
   404 via `curl` direto à BrasilAPI antes do teste): usado o mesmo
   dossiê de teste, reconsultado via botão manual. Resultado:
   `descartado_receita`, motivo `CNPJ não localizado na Receita
   Federal.`, evidência de timeline gravada com a fonte correta,
   registro preservado, excluído da listagem padrão. Cobre a decisão
   arquitetural #4.
5. **Regressão e2e**: `prospectos.spec.ts`, `mobile-navigation.spec.ts`,
   `rls-visibility.spec.ts`, `inteligencia-cadastral.spec.ts`,
   `oportunidades.spec.ts`, `promocao-prospecto.spec.ts` — 18/18
   passando. O rename para "Empresas Prospectadas" quebrou 3 asserções
   pré-existentes que localizavam o link "Empresas" por substring
   (`getByRole` sem `exact: true` casava também com "Empresas
   Prospectadas") — corrigidas com `exact: true` nos 3 pontos afetados
   (`mobile-navigation.spec.ts` x2, `rls-visibility.spec.ts` x1).
6. `npx tsc --noEmit` limpo após as correções de teste.

Dados de teste (dois dossiês criados durante os testes 2-4) removidos
do banco local por `id` exato ao final, não por padrão de nome — dada
a lição da Rodada 29 (ver Riscos residuais).

### Varredura periódica — testes ao vivo (complemento)

7. **Backfill real do backlog de ~290 dossiês**, contra a BrasilAPI de
   verdade, chamando a rota do cron localmente (`curl` com o
   `CRON_SECRET` do `.env.local`), várias execuções seguidas: resultado
   final — 251 `cadastro_validado`, 32 `descartado_receita` (28 novos +
   os que já existiam), 8 `pesquisa_iniciada` (CNPJ com dígito
   verificador inválido — dado ruim da planilha original, corretamente
   NUNCA descartado automaticamente, fica para revisão manual), 1
   `revisao_cadastral` (de teste manual anterior, fora do escopo desta
   rodada). Confirmado visualmente no módulo que as empresas passaram a
   "aparecer aqui" com status real, resolvendo o relato original do
   usuário.
8. **Achado ao vivo, corrigido na mesma rodada — fome de fila
   (starvation)**: depois de ~70 chamadas sequenciais sem pausa, a
   BrasilAPI começou a responder 429 (rate limit). Como
   `consultarEAtualizarDossie` não escrevia nada em `dossies_cadastrais`
   quando o resultado era `"erro"`, os mesmos dossiês malsucedidos
   voltavam para o topo da fila (`ultima_consulta_em is null` sempre
   primeiro) em toda execução seguinte — uma execução chegou a consumir
   o lote inteiro (50/50) só repetindo os mesmos 24 erros, sem
   progredir no backlog. Corrigido registrando `ultima_consulta_em`
   também quando a consulta falha (o status continua `pesquisa_iniciada`
   — só sai da frente da fila) e adicionando um intervalo de 300ms entre
   consultas dentro do sweep, para reduzir a chance de bater no rate
   limit em primeiro lugar. Reexecutado depois da correção: 0 repetição
   de erro, progresso real em cada execução.
9. Autenticação da rota testada ao vivo: sem header → 401; header
   errado → 401; `CRON_SECRET` correto → 200 com o resultado da
   varredura.
10. `npx tsc --noEmit` e `eslint` limpos após a refatoração e a
    correção de starvation.
11. Regressão e2e (`prospectos.spec.ts`,
    `promocao-prospecto.spec.ts`, `inteligencia-cadastral.spec.ts`)
    reexecutada depois da extração de `consultarEAtualizarDossie()` —
    5/5 passando, sem regressão pelo refactor.

### O que não foi testado ao vivo

- Comportamento com uma planilha grande (~1257 linhas) e o tempo real
  de execução / risco de timeout serverless em produção — só testado
  com 2 linhas.
- Rate-limiting real da BrasilAPI sob volume (o cliente não tem
  retry/backoff; não testado sob carga).
- Duas empresas novas com o mesmo CNPJ dentro da mesma planilha
  (comportamento de deduplicação já existia antes desta rodada, não
  foi alterado, não foi retestado aqui).
- **O cron real no ambiente Vercel** — só testado localmente via `curl`
  direto na rota, imitando o header que a Vercel injeta. O agendamento
  em si (`vercel.json`), se o plano atual do projeto comporta 2 cron
  jobs, e se `CRON_SECRET` está configurado no ambiente de produção,
  não foram verificados.
- Comportamento do intervalo de 300ms + `BATCH_SIZE = 50` sob rate
  limit mais agressivo da BrasilAPI do que o observado (só um episódio
  de 429 foi visto, e desapareceu sozinho depois de uma pausa breve
  entre execuções — não foi estressado further).

## Pendências

- Nenhuma pendência de código conhecida para esta rodada.

## Riscos residuais

- **Timeout serverless em produção**: decisão explícita do usuário
  (execução síncrona) contra minha recomendação. `maxDuration = 300`
  mitiga só em Vercel Pro+; no plano Hobby uma planilha grande pode
  estourar o limite da plataforma no meio da consulta, deixando parte
  dos prospectos em `pesquisa_iniciada` sem erro visível ao usuário
  além de um resumo incompleto. Se isso se confirmar em uso real, a
  alternativa é migrar para o modelo background/cron que eu tinha
  recomendado originalmente.
- **Cliente BrasilAPI sem retry/rate-limit**: consultas sequenciais
  rápidas em planilha grande podem esbarrar em rate-limit da BrasilAPI
  e gerar uma sequência de `status: "erro"` — degradação segura (não
  descarta por engano), mas silenciosamente deixa prospectos
  `pesquisa_iniciada` sem indicar ao usuário que foi rate-limit e não
  falta de dado. Isso ainda é verdade para a importação síncrona
  (decisão do usuário, item 1); o sweep periódico mitiga o mesmo
  problema pra si mesmo com um intervalo entre chamadas e reprocessando
  o que falhou no próximo dia, mas não tem backoff exponencial nem
  limite de tentativas — um CNPJ permanentemente malformado é
  reconsultado (e falha de novo) indefinidamente, consumindo uma fração
  pequena e limitada de cada lote futuro. Aceitável, não bloqueante.
- **Plano Vercel não verificado**: a suposição de que o plano atual
  comporta 2 cron jobs (Hobby costuma limitar tanto a quantidade quanto
  a frequência) não foi confirmada contra o dashboard real do projeto —
  só testado localmente. Verificar antes do deploy.
- **Incidente de dados não resolvido de uma rodada anterior**: durante
  a rodada anterior a esta (limpeza de dados de teste antes da
  verificação do rename), um `DELETE ... WHERE razao_social ilike
  '%PROVEDOR%'` removeu 61 dossiês em vez dos ~23 fixtures de teste
  pretendidos — a diferença (~38 registros) é provavelmente prospectos
  reais (o sindicato atua no setor de telecom/provedores). Já
  commitado, sem backup/WAL disponível neste ambiente local para
  recuperação. Reportado ao usuário na ocasião; ainda sem resposta
  sobre como proceder. **Não resolvido nesta rodada** — permanece
  aberto.

## Regras de negócio pendentes

Nenhuma nova.

## Próximo staging recomendado

Nenhum staging novo do roadmap foi desbloqueado por esta rodada — é um
refinamento de UX + regra de negócio dentro do Collection Strategy
Engine/Opportunity Engine já existentes. Recomendo, antes de qualquer
staging novo, resolver o incidente de dados residual acima (confirmar
com o usuário se os prospectos de telecom apagados precisam ser
reimportados de alguma fonte).
