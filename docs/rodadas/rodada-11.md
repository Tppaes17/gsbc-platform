# GSBC — Rodada 11

## Objetivo
Notificações por e-mail: a pendência mais antiga do projeto, registrada
desde a Rodada 5 ("notificação automática... hoje é só uma mudança de
status manual, sem disparo real de comunicação") e repetida nas Rodadas
6, 8 e 10. Desbloqueada pela descoberta da Rodada 10 de que o único
obstáculo de memória local eram `analytics`/`vector` — o Inbucket/Mailpit
(SMTP local) sobe junto com o resto do stack sem custo adicional.

## Habilitando o SMTP local
`supabase/config.toml` já tinha `[local_smtp]` configurado, mas a porta
SMTP usada por aplicações (não só pelo Auth do Supabase) vinha comentada.
Descomentei `smtp_port = 54325` e reiniciei o stack — a primeira
tentativa de `supabase start` excedeu o timeout de healthcheck do CLI
(realtime/storage/pg_meta/studio ainda inicializando), mas os containers
já estavam de pé; a segunda tentativa, com as imagens já em cache, subiu
tudo saudável em menos de um minuto. Confirmei a porta exposta com
`nc -zv 127.0.0.1 54325` antes de escrever qualquer código.

## Estado inicial
Rodadas 1–10 funcionando e testadas — cadeia completa (Sindicato →
Empresa → Instrumento → Cláusula → Obrigação → Cobrança → Negociação →
Financeiro → Documentos) e site institucional no ar.

## Implementações

### Envio de e-mail
- `src/lib/email/send.ts`: wrapper fino sobre `nodemailer`, configurado
  via `SMTP_HOST`/`SMTP_PORT`/`SMTP_FROM` (env vars — em dev local
  apontam para o Mailpit do `supabase start`; em produção, apontam para
  um provedor SMTP real, nunca hardcoded). `.env.example` documenta as
  três variáveis; `.env.local` tem os valores reais deste ambiente.
- Disparo é uma **ação explícita da equipe GSBC** (botão "Enviar
  notificação" na página da cobrança), não automática amarrada a uma
  transição de status — mesma postura de "sem automação implícita" já
  registrada nas pendências de Cobranças (regra 10). O destinatário é o
  contato principal cadastrado na empresa; se não houver nenhum contato
  com e-mail, o botão fica desabilitado (não inventa um destinatário).

### `notificacoes` — log imutável
Cada tentativa de envio (sucesso **ou falha**) vira uma linha, com
motivo do erro quando aplicável — regra 6 ("a plataforma registra"),
mesmo quando o envio não funciona. Sem policy de update/delete, mesmo
padrão de ledger das rodadas anteriores. Reaproveita
`user_can_access_empresa` (criada na Rodada 10) para a RLS de leitura.

### UI
- Botão "Enviar notificação" na página da cobrança (dialog com mensagem
  adicional opcional).
- Card "Notificações enviadas" com o histórico (destinatário, status,
  motivo do erro se houver) — visível também para o sindicato, só sem o
  botão de disparo.

### Auditoria
`notificacao.enviada` / `notificacao.falha` via `log_audit_event`, em
paralelo ao registro em `notificacoes` (mesmo padrão de "dois registros,
dois propósitos" já estabelecido).

## Arquivos criados
`src/lib/email/send.ts`, `src/lib/validation/notificacao.ts`,
`src/app/backoffice/cobrancas/[id]/{notificacao-action.tsx,
notificacoes-list.tsx}`, `supabase/migrations/0014_notificacoes.sql`.

## Arquivos alterados
`src/app/backoffice/cobrancas/actions.ts` (`sendNotificacaoAction`),
`src/app/backoffice/cobrancas/[id]/page.tsx` (botão + card + queries),
`src/types/database.types.ts`, `supabase/config.toml` (`smtp_port`),
`.env.example`, `.env.local`, `package.json` (`nodemailer`).

## Banco de dados
`0014_notificacoes.sql`: tabela `notificacoes`, trigger de integridade
(valida `tenant_id`/`empresa_id`, e que `cobranca_id` — quando presente —
pertence à mesma empresa), RLS e grants.

## Segurança
Nenhuma credencial de SMTP real está no repositório — `.env.local` (não
versionado) tem os valores do Mailpit local; produção usa variáveis de
ambiente próprias. `sendNotificacaoAction` verifica `isPlatformStaff`
antes de qualquer coisa, igual a toda ação de escrita do sistema.

## Testes realizados
Verificação real de ponta a ponta — não apenas na UI — antes de reportar
como concluído (regra 92):

- Enviei uma notificação pela UI como Admin GSBC, com mensagem
  adicional. Toast "Notificação enviada."
- **Abri o Mailpit (`http://127.0.0.1:54324`) e o e-mail estava lá de
  verdade**: remetente `GSBC <notificacoes@gsbc.com.br>`, destinatário
  `carlos.mendes@bompreco.example.com.br` (o contato cadastrado),
  assunto e corpo com os valores certos interpolados (valor, vencimento,
  mensagem adicional), **100% no HTML Check do próprio Mailpit**.
- Confirmei via `psql` que a linha em `notificacoes` foi gravada com
  `status = 'enviada'` e `erro` nulo.
- Login como Dirigente do Sindicato Demonstração: o card "Notificações
  enviadas" aparece com o histórico, mas **sem** o botão "Enviar
  notificação" — RLS + UI restringindo o disparo à equipe GSBC.
- `npm run build`, `npx tsc --noEmit`, `npx eslint .` sem erros.
- Sem erros no console do navegador em nenhuma das telas testadas.

## Decisões arquiteturais
Nenhum ADR novo — extensão natural do padrão de ledger imutável +
RLS já documentado; nenhuma mudança estrutural no modelo de
multi-tenancy ou autorização.

## Pendências
- Sem template de e-mail reutilizável para outros tipos de comunicação
  (hoje o corpo é composto inline em `sendNotificacaoAction`) — se mais
  tipos de notificação surgirem (ex.: negociação, acordo), vale extrair
  para um sistema de templates.
- Sem reenvio automático em caso de falha — a falha fica registrada e
  visível, mas o reenvio é uma nova ação manual da equipe GSBC.
- WhatsApp (mencionado como canal alternativo desde a Rodada 5) segue de
  fora — exigiria uma API paga de terceiros com credenciais reais, que
  não existem neste projeto.

## Riscos residuais
| Risco | Classificação | Observação |
|---|---|---|
| Corpo do e-mail hardcoded na action, não em template | Baixo | Aceitável para um único tipo de notificação; revisitar se o catálogo crescer |
| Sem retry automático em falha de envio | Baixo | Falha fica visível e auditável; reenvio manual é suficiente para o volume atual |

## Regras de negócio pendentes
Nenhuma nova.

## Próxima rodada recomendada
Com a cadeia completa, o site institucional e agora notificações reais
no ar, o MVP do prompt-mestre está funcionalmente fechado. Testes
automatizados de regressão sobre o fluxo ponta a ponta são o próximo
candidato natural, para sustentar a velocidade das próximas rodadas sem
depender só de verificação manual pelo navegador.
