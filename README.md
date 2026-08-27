# GSBC — Plataforma

Plataforma SaaS de inteligência, gestão, recuperação de receitas e compliance
para entidades sindicais. Ver `docs/rodadas/` para o histórico de decisões,
`docs/architecture/` para os ADRs, e `docs/roadmap-stagings.md` para o
roadmap de evolução (STG-00 a STG-12).

## Ambientes

- **Local**: `npm run dev` + Supabase via Docker (`supabase start`) — ver
  Configuração abaixo.
- **Staging**: https://gsbc-platform.vercel.app (Vercel + Supabase Cloud,
  projeto `GBSC`/`zjtuvsgigymgludplghd`, região `eu-west-1`) — provisionado
  na Rodada 17 (`docs/rodadas/rodada-17-cloud-staging.md`). Mesmo seed de
  demonstração do ambiente local.

## Stack

- **Frontend**: Next.js 16 (App Router, Turbopack), React 19, TypeScript.
- **UI**: Tailwind CSS v4, shadcn/ui (Base UI), Lucide Icons.
- **Dados/Auth/Storage**: Supabase (PostgreSQL + Auth + Storage), `@supabase/ssr`.
- **Formulários/Validação**: React Hook Form, Zod.
- **Dados assíncronos**: TanStack Query, TanStack Table.
- **Gráficos**: Recharts (a partir da Rodada 9 — dashboards/relatórios).

Ver [ADR-002](docs/architecture/ADR-002-supabase-platform.md) para a
justificativa da escolha de plataforma.

## Pré-requisitos

- Node.js ≥ 20.9 (ver `node -v`).
- Docker (para rodar o Supabase localmente via CLI).
- Uma conta/projeto Supabase para ambientes remotos (staging/produção).

## Configuração

```bash
cp .env.example .env.local
```

Preencha `.env.local` com as credenciais do projeto Supabase (local ou
remoto). Ver comentários em `.env.example` para o significado de cada
variável — **nunca** commitar `.env.local` com chaves reais.

## Banco de dados

O schema vive em `supabase/migrations/*.sql`, aplicado via Supabase CLI:

```bash
npx supabase start      # sobe Postgres + Auth + Storage localmente (Docker)
npx supabase db reset   # reaplica migrations + supabase/seed.sql do zero
```

`supabase/seed.sql` cria dados de demonstração (1 tenant GSBC, 1 sindicato
fictício, papéis do RBAC e 2 usuários de teste — senha `Demo@12345` para
ambos):

- `admin.demo@gsbc.com.br` — Super Admin GSBC (acesso cross-tenant).
- `dirigente.demo@sindicatodemonstracao.org.br` — Dirigente do Sindicato
  Demonstração (acesso restrito ao próprio tenant).

**Nunca rodar `supabase db reset` ou o seed contra um projeto de produção.**

Quando o projeto Supabase remoto existir, regenerar os tipos TypeScript com:

```bash
npx supabase gen types typescript --project-id <id> > src/types/database.types.ts
```

até lá, `src/types/database.types.ts` é mantido manualmente em sincronia com
as migrations.

## Comandos

```bash
npm run dev      # ambiente de desenvolvimento (Turbopack)
npm run build    # build de produção
npm run start    # roda o build de produção
npm run lint     # ESLint
npx tsc --noEmit # checagem de tipos
```

## Estrutura

```
src/
  app/
    login/                 # autenticação
    backoffice/             # shell autenticado (GSBC + sindicatos, Rodada 1)
  components/
    ui/                    # primitivos shadcn/ui (Base UI)
    design-system/         # componentes de produto reutilizáveis (regra 43)
    backoffice/             # navegação e chrome do shell autenticado
  lib/
    supabase/               # client/server/proxy — único ponto de criação do cliente Supabase
    auth/                   # sessão e checagens de autorização (RLS é a autoridade final)
    audit/                  # escrita em audit_logs via função Postgres
    validation/              # schemas Zod
  types/
    database.types.ts       # tipos do banco (mantido manualmente até haver projeto Supabase)
    domain.ts                # códigos de papel/permissão, tipos de domínio
supabase/
  migrations/                # schema versionado
  seed.sql                   # dados de demonstração
docs/
  architecture/               # ADRs
  rodadas/                    # relatório de cada rodada de desenvolvimento
```

## Segurança e multi-tenancy

Isolamento entre sindicatos é garantido por Row Level Security no Postgres —
nunca por filtro de frontend (ver [ADR-001](docs/architecture/ADR-001-multi-tenancy.md)
e [ADR-003](docs/architecture/ADR-003-autorizacao-rbac.md)). Toda alteração de
schema deve vir acompanhada de política de RLS explícita.
