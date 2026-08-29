# GSBC — Rodada 31 (Reconciliação do ambiente de produção Supabase/Vercel)

## Objetivo

Item 1 de uma auditoria de prontidão para produção pedida pelo usuário
("o que falta pra plataforma rodar 100% em ambiente produtivo") — trazer
o banco de dados de produção para o mesmo nível de schema do
desenvolvimento local (30 migrations), e entender exatamente que
ambiente de nuvem já existia antes desta rodada.

## Diagnóstico — descoberta que mudou o escopo

O plano inicial era criar um projeto Supabase de produção do zero. No
processo, descobri que **já existia um projeto de nuvem** (`GBSC`,
`zjtuvsgigymgludplghd`, região `eu-west-1`), provisionado numa rodada
anterior (Rodada 17 — STG-00 Cloud Foundation) que não estava no
contexto desta sessão. Esse projeto já tinha um deploy Vercel real e
funcional (`gsbc-platform`, `https://gsbc-platform.vercel.app`),
ativo havia dias, respondendo corretamente a login (confirmado ao vivo
por um teste com credencial inválida, que retornou a mensagem de erro
correta em vez de qualquer erro de conexão).

Isso significava: a plataforma **já estava em produção antes desta
sessão**, só que travada em algum ponto entre a Rodada 17 (18
migrations documentadas) e a Rodada 30 (30 migrations locais) — sem
nenhuma rodada documentando quando/como o meio do caminho foi
percorrido.

### Decisão confirmada com o usuário

Duas opções apresentadas: (1) atualizar o GBSC existente (mantém
região Irlanda e dados de demo, aplica só o que falta) ou (2) migrar
tudo para um projeto novo em São Paulo (schema 100% em dia, mas
descartando o ambiente já validado). **Usuário escolheu (1)** — manter
o GBSC.

## O problema real: bookkeeping da CLI mentia sobre o estado do schema

`supabase migration list` contra o projeto linkado mostrava **zero**
migrations aplicadas remotamente — mas isso não refletia a realidade:
o schema real já tinha muito mais coisa. A causa (documentada também na
Rodada 17): pelo menos as primeiras migrations foram aplicadas por
`psql` direto (não pela CLI `supabase`), que nunca escreve na tabela de
histórico que a CLI usa (`supabase_migrations.schema_migrations`).
Aparentemente isso continuou acontecendo em algum momento não
documentado entre a Rodada 17 e agora — a lacuna real do schema (2
migrations) era muito menor que a lacuna do bookkeeping (30 migrations).

**Não confiei no bookkeeping nem tentei adivinhar pelo `db diff`**
(que tem uma semântica de direção ambígua o suficiente pra eu não usar
como fonte de verdade sem testar empiricamente primeiro — ver
raciocínio no histórico da sessão). Em vez disso, usei o próprio
Postgres como árbitro: tentar `db push` de verdade e deixar a mensagem
de erro (`relation "X" already exists`) dizer exatamente qual migration
já tinha rodado. Cada migration roda dentro de uma transação própria —
uma falha no meio nunca deixa efeito parcial.

Processo, iterativo, migration por migration, alternando entre mim
(`db push`, que não é bloqueado) e o usuário (`migration repair
--status applied`, que É bloqueado pelo classificador de permissões do
Claude Code — ação sensível o suficiente pra merecer isso, não tentei
contornar):

| Migration | Resultado real no GBSC |
|---|---|
| 0001–0018 | Já aplicadas (confirma a Rodada 17) |
| 0019–0028 | **Também já aplicadas** — nenhuma rodada documentou isso |
| 0029, 0030 | Genuinamente faltando (as duas desta sessão) — aplicadas agora de verdade |

Cheguei a escrever um script (`sync-gbsc-migrations.sh`) pra
automatizar esse loop (push → se "já existe", repara aquela versão →
tenta de novo; para imediatamente em qualquer erro que não seja "já
existe"), mas ele não avançou como esperado numa das tentativas do
usuário — voltei ao processo manual, migration por migration, pra não
arriscar deixar o schema real incompleto por causa de um bug no script.
Descartado depois de uso (não faz parte do repositório).

## Resultado

- `supabase migration list` contra o GBSC: **30 de 30**, local = remote
  em todas.
- `GET /api/health` em produção: `{"status":"ok","database":"reachable"}`.
- Nenhum dado de demo tocado (seed original da Rodada 17 preservado).

## Limpeza: projeto órfão

Antes de descobrir o GBSC, cheguei a criar um projeto Supabase novo do
zero (`gsbc-producao`, `fxytnkzmtqoblexoylms`, São Paulo — a região
certa, mas um projeto redundante). Com confirmação explícita do
usuário, deletado (`supabase projects delete`, bloqueado pra mim pelo
classificador — o usuário rodou). Confirmado via `projects list`: só
resta o GBSC (mais um projeto `INACTIVE` sem uso, herdado do cadastro
da conta, fora do escopo).

## Incidente de segurança durante a sessão — chave exposta, já mitigado

Ao tentar buscar só a `anon key` (pública por design) do projeto novo
via `supabase projects api-keys`, o comando também retornou a
`service_role key` legada **em texto puro, sem máscara** (diferente da
chave `sb_secret_...` mais nova, que a própria API mascara). Isso
expôs a chave num arquivo de output local e no contexto desta
conversa.

Mitigação imediata: arquivo local apagado na hora. Como o projeto
inteiro (`fxytnkzmtqoblexoylms`) foi deletado nesta mesma rodada, a
chave exposta **não existe mais** — não é necessário rotacionar nada,
o projeto ao qual ela pertencia não existe. Registrado aqui só para
histórico, e como lição: não voltar a chamar `projects api-keys` sem
necessidade — usar `vercel env pull` (que já mascara segredos como
`[SENSITIVE]` automaticamente) quando só a URL pública for necessária.

## Segurança

- `SUPABASE_SERVICE_ROLE_KEY` do GBSC nunca vista por mim — as
  variáveis já existiam na Vercel de uma rodada anterior, não precisei
  tocar nelas.
- Toda ação de escrita irreversível ou sensível (reset de senha,
  `migration repair`, deleção de projeto) ficou com o usuário, no
  terminal dele — nunca contornei os bloqueios do classificador de
  permissões.

## O que não foi testado ao vivo

- Login real contra o GBSC pós-sincronização (o health check confirma
  conectividade, mas não testei um fluxo de login completo — não tenho
  a senha da conta demo, e não pedi ao usuário por não ser
  estritamente necessário pra confirmar o objetivo desta rodada).
- Nenhuma verificação de que os 12 migrations "silenciosamente"
  aplicados entre a Rodada 17 e agora (0019–0028) correspondem
  exatamente ao código das rodadas 19–28 sem nenhuma migration manual
  ad-hoc misturada no meio — o teste via `db push`/erro só confirma que
  os OBJETOS esperados existem (tabelas, colunas), não audita byte a
  byte se é exatamente o schema das rodadas documentadas.

## Pendências

- **Nenhuma rodada documenta quando/quem aplicou as migrations
  0019–0028 no GBSC** — lacuna de histórico que esta rodada não
  resolve retroativamente, só constata.
- Item 1 da lista de prontidão para produção está fechado. Próximo item
  a decidir com o usuário (lista original): Payment Provider real,
  Split/Conciliação (STG-07), backup/PITR, observabilidade, CI/CD,
  SMTP real, CSP de produção, rate-limiting, LGPD/termos.

## Riscos residuais

| Risco | Classificação | Observação |
|---|---|---|
| Ainda no plano Free (sem PITR) | Alto | Decisão explícita do usuário nesta sessão — endereçar no item de backup/PITR da lista |
| Região `eu-west-1`, não `sa-east-1` | Baixo | Decisão explícita do usuário (manter GBSC); Supabase não permite migrar região de projeto existente |
| Gap de histórico documentado acima | Baixo | Não afeta funcionamento, só rastreabilidade |

## Próximo staging recomendado

Seguir a lista de prontidão para produção, item por item, conforme já
combinado com o usuário ("vamos rodar um a um").
