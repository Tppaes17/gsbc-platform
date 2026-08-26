# ADR-002 — Supabase como Plataforma de Dados, Auth e Storage

## Status
Aceito — Rodada 1. Confirmado por decisão do usuário na Rodada 0/1.

## Contexto
A stack preferencial (seção 11 do prompt-mestre) recomenda Next.js/TypeScript
no frontend e Supabase (Postgres + Auth + Storage) como plataforma de dados.
O projeto partiu vazio (sem stack legada a preservar), então a escolha coube
a esta rodada.

## Decisão
Adotar **Supabase** como:
- Banco de dados: PostgreSQL gerenciado.
- Autenticação: Supabase Auth (`@supabase/ssr` para integração com Next.js
  App Router — cookies HTTP-only, refresh de sessão via `proxy.ts`).
- Autorização: RLS nativo do Postgres, não uma camada de autorização própria
  no aplicativo — a autoridade final de isolamento de dados vive no banco
  (regra 14), nunca apenas no código da aplicação.
- Storage: reservado para documentos (regra 46), a implementar quando o
  módulo de Documentos for construído (fora do escopo da Rodada 1).
- Hospedagem: Vercel para o frontend Next.js, Supabase Cloud para o backend
  (decisão do usuário).

## Consequências
- `src/lib/supabase/{client,server,proxy}.ts` encapsulam toda a criação de
  cliente Supabase — nenhum outro ponto do código deve chamar
  `createBrowserClient`/`createServerClient` diretamente.
- `src/types/database.types.ts` é mantido manualmente até existir um projeto
  Supabase real; a partir daí, deve ser substituído por
  `supabase gen types typescript` (documentado no cabeçalho do arquivo).
- Migrations SQL vivem em `supabase/migrations/`, aplicadas via Supabase CLI
  (`supabase db push` ou `supabase migration up`) — nunca alteração manual de
  schema em produção (regra 60).
- `supabase/seed.sql` fornece dados de demonstração de ponta a ponta (regra
  61), executado automaticamente por `supabase db reset` em ambiente local.

## Alternativas consideradas
- **PostgreSQL self-hosted + Prisma**: descartado nesta rodada — exigiria
  implementar RLS, Auth e refresh de sessão manualmente, atrasando a entrega
  da fundação sem ganho claro de controle neste estágio.
