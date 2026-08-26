# GSBC — Rodada 10

## Objetivo
Documentos: upload, listagem e download de arquivos por empresa
(instrumentos, notificações, acordos, comprovantes) — o último
placeholder que restava na ficha 360º, bloqueado desde a Rodada 8 por
uma limitação de ambiente, não de produto.

## O bloqueio foi reavaliado e removido nesta rodada
Rodadas 8 e 9 assumiram, sem testar de novo, que o Supabase Storage
continuava indisponível neste Docker local (conforme rodada-01.md).
Nesta rodada, testei essa suposição diretamente:

1. `docker stats` mostrou só ~366MB em uso pelos 6 containers essenciais
   rodando — bem abaixo do limite de 3.8GB do Docker Desktop.
2. `supabase start` com a configuração padrão completa **falhou** nos
   healthchecks de `analytics` (Logflare) e `vector` (o log-shipper que
   alimenta o Logflare) — os mesmos dois serviços, identificados
   precisamente desta vez, não "o stack completo" genericamente como a
   Rodada 1 registrou.
3. Desabilitei só `[analytics]` em `supabase/config.toml`
   (`enabled = false`) — isso também impede o `vector` de subir, já que
   ele só existe para alimentar o Logflare. Com os dois fora, `supabase
   start` completo (Storage, Realtime, Studio, Auth, Edge Functions,
   Inbucket) sobe limpo em **~1.1GB**, longe do limite.

**Conclusão prática**: o Storage nunca foi o problema — era
especificamente o par analytics/vector. Isso também libera, de graça,
o Inbucket (e-mail local) para uma futura rodada de notificações, sem
precisar de mais nenhum ajuste.

## Estado inicial
Rodadas 1–9 funcionando e testadas. A ficha 360º da empresa tinha
"Documentos" como único placeholder restante.

## Implementações

### Storage
- Bucket privado `documentos-empresas` (`file_size_limit` 50MB), criado
  via migration (`insert into storage.buckets`).
- Convenção de path: `{empresa_id}/{uuid}-{nome_do_arquivo}` — o
  primeiro segmento do path é o `empresa_id`, usado diretamente pelas
  policies de `storage.objects`.
- **`public.user_can_access_empresa(p_empresa_id)`**: nova função
  auxiliar (mesmo padrão de `is_platform_staff`/`user_tenant_ids`) que
  resolve se o usuário logado pode acessar dados de uma empresa — usada
  tanto pelas policies de Storage quanto pela RLS da tabela de
  metadados, para as duas superfícies ficarem sempre consistentes.
- Policies em `storage.objects` (select por quem tem acesso à empresa;
  insert/delete só staff GSBC) — RLS nativa do Storage, não uma camada
  própria por cima.

### Metadados
- `documentos`: nome legível, categoria (instrumento/notificação/acordo/
  comprovante/outro), tamanho, quem enviou — evita chamar a API de
  listagem do Storage só para montar a lista da ficha 360º. Trigger de
  integridade (`tenant_id` bate com o da empresa), RLS e grants no
  mesmo padrão das rodadas anteriores.
- Sem policy de update — documento errado se resolve removendo e
  reenviando, não editando metadado (mesma filosofia de ledger imutável
  das rodadas anteriores).

### UI
- Ficha 360º da empresa: card "Documentos" com upload (dialog: categoria
  + arquivo), lista com nome/categoria/tamanho/data/autor, download via
  signed URL (gerada no servidor, expira em 5 minutos) e remoção (staff,
  com `ConfirmationDialog` — regra 69, ação irreversível).
- Cada documento enviado também aparece na Timeline consolidada
  (Rodada 9), sexta reutilização seguida do mesmo componente `Timeline`.

### Auditoria
`documento.enviado`, `documento.removido` via `log_audit_event`, mesmo
padrão de todas as rodadas anteriores.

## Arquivos criados
`src/app/backoffice/empresas/[id]/{documentos-section.tsx,
documentos-actions.ts}`, `src/lib/validation/documento.ts`,
`supabase/migrations/0013_documentos.sql`.

## Arquivos alterados
`src/app/backoffice/empresas/[id]/page.tsx` (query + signed URLs +
seção + item na timeline consolidada), `src/types/database.types.ts`,
`supabase/config.toml` (`analytics.enabled = false`), `.gitignore`
(`supabase/.temp/`, `supabase/.branches/` — nunca deveriam ter sido
versionados), `eslint.config.mjs` (ignora `supabase/.temp/**` — um
bundle gerado pelo CLI estava sendo lintado por engano).

## Banco de dados
`0013_documentos.sql`: bucket de Storage, função
`user_can_access_empresa`, tabela `documentos`, trigger de integridade,
policies de `storage.objects` e de `documentos`, grants.

## Segurança
Duas superfícies de RLS reforçando a mesma regra (staff GSBC gerencia,
sindicato só lê o que é da própria empresa): a policy de
`storage.objects` (o arquivo em si) e a policy de `documentos` (o
metadado). Ambas chamam a mesma função `user_can_access_empresa`, então
não há como as duas divergirem por engano no futuro.

## Testes realizados
Verificação real pelo navegador, com os dois usuários de demonstração,
antes de reportar como concluído (regra 92) — incluindo verificação
fora da UI, direto no banco/Storage:

- Enviei um arquivo de teste como Admin GSBC — apareceu na lista com
  tamanho correto, na Timeline consolidada, e o toast confirmou o envio.
- **Busquei a signed URL gerada pela UI diretamente via `curl`** (fora
  do navegador) — o conteúdo real do arquivo voltou, confirmando que não
  é uma simulação de upload.
- Login como Dirigente do Sindicato Demonstração: o mesmo documento
  aparece, com botão de download funcional (testei a signed URL gerada
  para ela também via `curl` — mesmo conteúdo real) e **sem** botão de
  enviar/remover — RLS + UI restringindo escrita à equipe GSBC.
- Removi o documento como Admin GSBC — toast de confirmação, some da
  lista e da timeline. **Confirmei via `psql` que a linha em
  `documentos` e o objeto em `storage.objects` foram os dois realmente
  apagados**, não só escondidos na UI.
- `npm run build`, `npx tsc --noEmit`, `npx eslint .` sem erros.

## Decisões arquiteturais
Nenhum ADR novo — Storage é uma extensão natural do modelo de RLS já
documentado no ADR-001/003, não uma mudança estrutural.

## Pendências
- Sem preview de imagem/PDF inline — hoje é sempre download.
- Sem limite de quantidade de documentos por empresa (só o limite de
  50MB por arquivo).
- `analytics`/`vector` continuam desabilitados neste ambiente local —
  sem impacto em produção (Supabase Cloud não tem essa restrição de
  memória), mas registrar caso outra rodada precise de observability
  local no futuro.

## Riscos residuais
| Risco | Classificação | Observação |
|---|---|---|
| Duas policies de RLS (Storage + tabela) fazendo a mesma verificação | Baixo | Mitigado por compartilharem a mesma função `user_can_access_empresa` — não podem divergir silenciosamente |
| Sem preview inline de arquivos | Baixo | Melhoria de UX, não bloqueia o uso real do módulo |

## Regras de negócio pendentes
Nenhuma nova.

## Próxima rodada recomendada
Com a cadeia completa (Sindicato → Empresa → Instrumento → Cláusula →
Obrigação → Cobrança → Negociação → Financeiro → Documentos) e o site
institucional no ar, o MVP descrito no prompt-mestre está funcionalmente
fechado. Próximos candidatos: notificações automáticas (e-mail via
Inbucket local, hoje só uma pendência registrada desde a Rodada 5 —
agora desbloqueada pela mesma descoberta desta rodada) ou testes
automatizados de regressão sobre o fluxo completo.
