# GSBC — Rodada 1

## Objetivo
Fundação SaaS: autenticação, tenants, usuários, roles, permissões, segurança
(RLS), auditoria, design system e a entidade sindicatos — conforme prioridade
P0 do prompt-mestre (seção 9) e recomendação da Rodada 0.

## Estado inicial
Projeto vazio (ver `rodada-00.md`). Nenhum código, banco ou configuração
prévia.

## Implementações

### Scaffold e stack
- Next.js 16.3.1 (App Router, Turbopack, React 19.2) + TypeScript.
- Tailwind CSS v4 + shadcn/ui (que nesta versão usa **Base UI**, não Radix —
  ver seção "Decisões arquiteturais").
- Dependências: `@supabase/supabase-js`, `@supabase/ssr`, `zod`,
  `react-hook-form`, `@hookform/resolvers`, `@tanstack/react-query`,
  `@tanstack/react-table@8` (fixado em v8, ver decisão abaixo), `recharts`,
  `date-fns`, `lucide-react`.
- `git init` no diretório do projeto.

### Autenticação
- `src/lib/supabase/{client,server,proxy}.ts` — únicos pontos de criação do
  cliente Supabase (browser, Server Components/Actions, e refresh de sessão).
- `src/proxy.ts` — substitui `middleware.ts` (renomeado no Next.js 16),
  refresca a sessão a cada requisição e protege `/backoffice`.
- `/login` — formulário e Server Action (`signInWithPassword`), com
  `useActionState` (React 19) para estado de erro/pending.
- Logout via Server Action, acessível pelo menu do usuário.

### Multi-tenancy e autorização
- Modelo `User → Membership → Tenant → Role → Permissions` (ADR-003).
- `tenants` (singleton `platform` + N `sindicato`), `sindicatos`,
  `sindicato_contatos`, `users`, `roles`, `permissions`, `role_permissions`,
  `memberships` — todas com RLS habilitado.
- Funções auxiliares `is_platform_staff()` e `user_tenant_ids()`
  (`SECURITY DEFINER`, `STABLE`) usadas nas policies para evitar recursão.
- `src/lib/auth/session.ts` — `getCurrentUser()`/`requireCurrentUser()`,
  cacheados por requisição via `cache()` do React.

### Auditoria
- `audit_logs` append-only (sem policy de update/delete).
- `public.log_audit_event()` (`SECURITY DEFINER`) — único caminho de escrita,
  carimba `user_id = auth.uid()` no servidor.
- `src/lib/audit/log.ts` — wrapper tipado para chamar a função via RPC.
- Página `/backoffice/auditoria`, visível a todos os usuários autenticados
  (não só staff GSBC) — reforça a transparência da terceirização (regra 6).

### Design system
- `PageHeader`, `MetricCard`, `StatusBadge`, `EmptyState`,
  `ConfirmationDialog`, `DataTable` (paginação client-side sobre
  `@tanstack/react-table`) em `src/components/design-system/`.
- Paleta institucional provisória (azul navy) aplicada via tokens CSS em
  `globals.css`, claramente marcada como placeholder até manual de marca
  oficial da GSBC.

### Backoffice (shell autenticado)
- `/backoffice` — dashboard com métricas reais (sindicatos, usuários,
  memberships visíveis por RLS) — **sem dados fictícios** (regra 62).
- `/backoffice/sindicatos` — listagem de sindicatos.
- `/backoffice/usuarios` — listagem de memberships (usuário, tenant, papel,
  status).
- `/backoffice/auditoria` — trilha de auditoria.
- Menu lateral filtrado dinamicamente (nenhum item aponta para tela
  inexistente).
- Um único shell serve tanto staff GSBC quanto usuários de sindicato nesta
  rodada — Portal do Sindicato como ambiente visualmente separado (regra 35)
  fica para a Rodada 8, conforme o roadmap original.

## Arquivos criados
Lista completa via `git status` (repositório iniciado nesta rodada, primeiro
commit ainda não realizado). Principais diretórios: `src/app/`,
`src/components/`, `src/lib/`, `src/types/`, `supabase/migrations/`,
`supabase/seed.sql`, `docs/architecture/`, `docs/rodadas/`.

## Arquivos alterados
Não aplicável — projeto partiu vazio.

## Banco de dados
- `supabase/migrations/0001_core_schema.sql` — schema core.
- `supabase/migrations/0002_rls_policies.sql` — RLS, funções auxiliares,
  `log_audit_event`.
- `supabase/migrations/0003_grants.sql` — `GRANT` de privilégio de tabela ao
  papel `authenticated` (ver bug corrigido abaixo).
- `supabase/seed.sql` — dados de demonstração (1 tenant GSBC, 1 sindicato
  fictício, 11 papéis, 4 permissões, 2 usuários reais em `auth.users` com
  senha `Demo@12345`).

## Segurança
- RLS habilitado em todas as tabelas sensíveis; isolamento de tenant validado
  manualmente (ver Testes realizados).
- Nenhuma chave real commitada — `.env.local` está no `.gitignore`;
  `.env.example` documenta as variáveis necessárias.
- `audit_logs` imutável por construção (sem policy de update/delete, sem
  grant de insert direto).

## Auditoria
Infraestrutura pronta (`log_audit_event`); nenhuma Server Action de mutação
existe ainda em P0 além de login/logout, então a tabela está vazia por
enquanto — esperado e correto (não há o que registrar ainda).

## Testes realizados
Ambiente local via Supabase CLI (`supabase start`, Postgres + Auth + REST +
Kong) rodando em Docker. Verificação ponta a ponta real — não apenas
inspeção de código — incluindo login via navegador com os dois usuários de
demonstração, navegação entre `/backoffice`, `/backoffice/sindicatos`,
`/backoffice/usuarios` e `/backoffice/auditoria`, e logout.

Três bugs reais foram encontrados e corrigidos durante essa verificação:

1. **Seed de `auth.users` quebrava o login** — colunas de token
   (`confirmation_token`, `recovery_token` etc.) ficavam `NULL` em vez de
   `''`, e o scanner SQL do GoTrue falha com `converting NULL to string is
   unsupported` ao autenticar. Corrigido explicitando `''` nessas colunas em
   `seed.sql`.
2. **`permission denied for table users` (42501)** — RLS habilitado sem os
   `GRANT` de privilégio de tabela correspondentes ao papel `authenticated`.
   RLS restringe *linhas*; sem o `GRANT`, o Postgres nega a operação antes
   mesmo de avaliar as policies. Corrigido em `0003_grants.sql`.
3. **`PGRST201` — embed ambíguo** — `memberships` tem duas foreign keys para
   `users` (`user_id` e `invited_by`); o PostgREST não conseguia resolver
   `users(...)` no select embutido. Corrigido especificando a relação:
   `users!memberships_user_id_fkey(...)`.
4. **Erro de runtime no menu do usuário** — Base UI (usado pelo shadcn/ui
   nesta versão) exige que `Menu.GroupLabel`/itens estejam dentro de
   `Menu.Group`; `DropdownMenuLabel` sem `DropdownMenuGroup` quebrava o menu
   ao abrir. Corrigido envolvendo os labels/itens em `DropdownMenuGroup`.
5. **Funções passadas de Server para Client Component** — `columns` do
   `DataTable` (com `cell` retornando JSX) definidos no Server Component
   (page.tsx) e passados como prop para o `DataTable` (`"use client"`) —
   React não serializa funções através dessa fronteira. Corrigido extraindo
   um componente cliente por tabela (`sindicatos-table.tsx`,
   `usuarios-table.tsx`, `auditoria-table.tsx`) que define `columns`
   internamente e recebe apenas dados serializáveis do servidor.

Após as correções, confirmado via navegador real (não apenas curl):
- Login com `admin.demo@gsbc.com.br` (staff GSBC) e
  `dirigente.demo@sindicatodemonstracao.org.br` (sindicato).
- **Isolamento de tenant**: o usuário do sindicato vê apenas seu próprio
  tenant (1 sindicato, 1 usuário — a si mesmo), enquanto o staff GSBC vê os 2
  usuários e o sindicato cadastrado. O nome/e-mail do admin GSBC nunca
  aparece na sessão do dirigente do sindicato.
- Menu lateral e labels adaptados por papel ("Sindicatos ativos" vs. "Meu
  sindicato").
- Logout funcional, redireciona corretamente para `/login`.
- `npm run build`, `npx tsc --noEmit` e `npx eslint .` sem erros (1 warning
  inofensivo do React Compiler sobre `useReactTable`).

**Nota sobre o ambiente de teste**: o stack completo do Supabase local (11
containers) excede o limite de memória padrão do Docker Desktop (3.8 GB)
nesta máquina, causando OOM kills. Os testes foram concluídos com um subset
mínimo (`db`, `auth`, `rest`, `kong`); `supabase/config.toml` foi restaurado
aos padrões completos (todos os serviços habilitados) ao final. Se o mesmo
ocorrer no ambiente do usuário, aumentar a memória do Docker Desktop
(Settings → Resources) ou manter os serviços não essenciais desabilitados
localmente.

## Decisões arquiteturais
Ver ADRs completos:
- [ADR-001](../architecture/ADR-001-multi-tenancy.md) — estratégia de
  multi-tenancy (RLS em banco compartilhado; `organizations` tratado como
  sinônimo de `tenants` em P0).
- [ADR-002](../architecture/ADR-002-supabase-platform.md) — Supabase como
  plataforma de dados/auth/storage.
- [ADR-003](../architecture/ADR-003-autorizacao-rbac.md) — modelo RBAC via
  membership.

Decisões adicionais desta rodada (não elevadas a ADR por serem detalhes de
implementação, não estruturais):
- **`@tanstack/react-table` fixado em v8.21.3**, não v9 (atual "latest" no
  npm). A v9 é uma reescrita de API incompatível com o padrão amplamente
  documentado; v8 é estável, madura e suficiente para o escopo de P0 (regra
  10 — não antecipar complexidade).
- **`proxy.ts` vive em `src/proxy.ts`**, não na raiz — Next.js 16 exige que
  fique no mesmo nível de `app/` (aqui, dentro de `src/`).
- shadcn/ui nesta versão gera componentes sobre **Base UI**
  (`@base-ui/react`), não Radix — a composição de trigger customizado usa a
  prop `render`, não `asChild`.

## Pendências
- Portal do Sindicato como ambiente visual separado (Rodada 8, conforme
  roadmap original).
- Camada de storage (Supabase Storage) — reservada para o módulo de
  Documentos, fora do escopo de P0.
- Nenhuma Server Action de mutação além de login/logout — chegam com os
  módulos de Empresas/Instrumentos/Cobranças (P1–P3).

## Riscos residuais
| Risco | Classificação | Observação |
|---|---|---|
| Regras de negócio de convite/self-service não definidas | Médio | Ver "Regras de negócio pendentes" |
| `src/types/database.types.ts` mantido manualmente | Médio | Deve ser substituído por `supabase gen types` assim que houver projeto Supabase remoto — divergência silenciosa é possível até lá |
| Ambiente local sensível a memória do Docker | Baixo | Documentado; não afeta produção (Supabase Cloud) |
| Paleta de marca é placeholder | Baixo | Aguardando manual de marca oficial da GSBC |

## Regras de negócio pendentes

**Resolvidas nesta rodada** (decisão do usuário, registradas em
[ADR-003](../architecture/ADR-003-autorizacao-rbac.md) e nos comentários de
`0002_rls_policies.sql`):
1. Edição de dados cadastrais do sindicato (`sindicatos`,
   `sindicato_contatos`) é **exclusiva da equipe GSBC**, permanentemente. RLS
   já implementado dessa forma desde o início — nenhuma mudança de código
   necessária.
2. Convite/gestão de membros da própria equipe pelo sindicato: **apenas
   staff GSBC durante o onboarding**; dirigentes/administradores do
   sindicato passam a poder fazer isso **após a implantação concluída**. A
   RLS atual (staff GSBC apenas) está correta para o estado presente do
   produto, mas falta modelar um status de "onboarding concluído" em
   `tenants`/`sindicatos` para liberar o self-service — a implementar junto
   do fluxo de convite (Rodada 2 ou quando esse fluxo for priorizado).

**Ainda em aberto:**
3. Um usuário poderá ter mais de um papel dentro do mesmo tenant? (hoje
   impedido pela constraint `unique(tenant_id, user_id)` em `memberships`).

## Próxima rodada recomendada
Rodada 2 — Clientes e usuários: fluxo de convite/onboarding de usuários
(resolvendo as pendências acima), CRUD de sindicato (via UI, não só seed),
e gestão de memberships pelo backoffice GSBC.
