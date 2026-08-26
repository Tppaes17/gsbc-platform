# GSBC — Rodada 2

## Objetivo
Clientes e usuários: fluxo real de cadastro de sindicato (substituindo o seed
manual), fluxo de convite/onboarding de usuários, e resolução das duas
pendências de regra de negócio deixadas pela Rodada 1.

## Estado inicial
Fundação SaaS da Rodada 1 funcionando (auth, multi-tenancy, RBAC, auditoria,
design system, backoffice com dados apenas via seed). Duas decisões de
negócio haviam sido confirmadas pelo usuário mas não implementadas:
1. Edição de dados do sindicato é exclusiva da GSBC (já era o comportamento
   da RLS — nenhuma mudança necessária).
2. Convite/gestão de equipe pelo próprio sindicato, liberado somente após o
   onboarding — exigia modelar esse "depois" no schema.

## Implementações

### Onboarding do sindicato
- `tenants.onboarding_status` (`onboarding` | `active`) — Rodada 1 já previa
  esse campo conceitualmente; implementado nesta rodada.
- `public.can_manage_tenant_members()` — staff GSBC sempre; administrador do
  próprio sindicato (`sindicato_administrador`) somente com
  `onboarding_status = 'active'`.
- Trigger `enforce_membership_role_tenant_type` — impede atribuir um papel
  `platform` a uma membership de tenant `sindicato` (e vice-versa) no nível
  do banco (regra 67).
- `/backoffice/sindicatos/novo` — formulário de cadastro (GSBC apenas).
  `public.create_sindicato_tenant()` cria `tenants` + `sindicatos` numa única
  transação (`SECURITY INVOKER` — RLS do chamador continua valendo).
- `/backoffice/sindicatos/[id]` — página de detalhe: formulário de edição
  (editável só para staff GSBC; somente leitura com aviso explícito para
  demais usuários) e ação "Concluir onboarding" (com `ConfirmationDialog`,
  visível só quando aplicável).

### Convite de usuários
- `/backoffice/usuarios` — botão "Convidar usuário", visível para staff GSBC
  (qualquer tenant) e para administradores de sindicato já implantado
  (apenas o próprio tenant).
- `src/lib/supabase/admin.ts` — cliente service-role, uso exclusivo para
  `auth.admin.inviteUserByEmail` (única operação sem equivalente via RLS).
- Fluxo: verifica se o e-mail já existe (`public.users` via admin client);
  se não, convida via GoTrue (dispara e-mail); insere a `membership` com
  `status = 'invited'` usando o cliente autenticado normal (RLS decide se o
  convite é permitido).
- Trigger `handle_user_email_confirmed` em `auth.users` — quando o convidado
  define a senha (aceita o convite), a membership vira `active`
  automaticamente.
- Papéis oferecidos no formulário são filtrados pelo tipo do tenant
  selecionado (não é possível convidar alguém como papel `platform` para um
  tenant `sindicato`).

### Auditoria
Quatro novas ações registradas: `sindicato.created`, `sindicato.updated`,
`sindicato.onboarding_completed`, `membership.invited` — todas via
`log_audit_event`, verificadas na tela de Auditoria após cada operação.

## Arquivos criados
`src/app/backoffice/sindicatos/{actions.ts,novo/,[id]/}`,
`src/app/backoffice/usuarios/{actions.ts,invite-member-dialog.tsx}`,
`src/lib/supabase/admin.ts`, `src/lib/validation/{sindicato,membership}.ts`,
`src/lib/auth/permissions.ts` (reintroduzido — agora com consumidor real),
`supabase/migrations/0004_onboarding_and_invites.sql`,
`supabase/migrations/0005_users_visibility_invited.sql`.

## Arquivos alterados
`src/app/backoffice/sindicatos/{page.tsx,sindicatos-table.tsx}`,
`src/app/backoffice/usuarios/page.tsx`, `src/lib/auth/session.ts` (inclui
`tenantOnboardingStatus`), `src/types/{database.types.ts,domain.ts}`,
`supabase/seed.sql` (onboarding_status do tenant demo).

## Banco de dados
- `0004_onboarding_and_invites.sql`: `onboarding_status`, trigger de
  integridade papel↔tenant, trigger invited→active, função
  `can_manage_tenant_members`, policies de `memberships` atualizadas,
  função `create_sindicato_tenant`.
- `0005_users_visibility_invited.sql`: corrige visibilidade de convites
  pendentes entre membros do mesmo tenant (ver Testes realizados).

## Segurança
- `create_sindicato_tenant` é `SECURITY INVOKER`: não contorna RLS, apenas
  agrupa duas inserções numa transação.
- O cliente service-role (`admin.ts`) é usado estritamente para o convite de
  auth — a escrita da `membership` em si sempre passa pelo cliente
  autenticado, então a autorização real (quem pode convidar quem) é
  decidida pela RLS, não pelo código da aplicação.
- Trigger de integridade papel↔tenant é uma segunda camada de defesa: mesmo
  que uma policy de RLS tivesse um erro, o banco recusaria a combinação
  inválida.

## Testes realizados
Ambiente local (Supabase CLI + Docker), verificação real via navegador com
os dois usuários de demonstração — não apenas leitura de código. Seis bugs
reais foram encontrados e corrigidos:

1. **`"use server"` só pode exportar funções assíncronas** — os arquivos
   `actions.ts` exportavam também uma constante de estado inicial
   (`{error: null}`). Next.js proíbe qualquer export não-função em um módulo
   `"use server"`. Corrigido movendo o estado inicial para dentro de cada
   componente cliente que o usa.
2. **Base UI `Button` + `Link`** — compor um botão com um link (`render={<Link
   .../>}`) exige `nativeButton={false}`; sem isso, o Base UI espera (e
   avisa sobre) um `<button>` nativo. Corrigido em
   `sindicatos/page.tsx`.
3. **`Select.Value` não resolve o rótulo automaticamente** — diferente do
   Radix, o `Select.Value` do Base UI mostra o `value` bruto (ex.: o UUID) a
   menos que se passe uma função `children` que traduza valor → rótulo.
   Corrigido no diálogo de convite (tenant e papel).
4. **`Select` controlado + `name` não confiável para submissão nativa** —
   combinar `value`/`onValueChange` (controlado, necessário para filtrar
   papéis pelo tenant) com o `name` do próprio `Select` não garantia que o
   input nativo interno refletisse o valor no momento do submit. Corrigido
   com um `<input type="hidden">` explícito, alimentado diretamente pelo
   estado React, como única fonte de verdade no `FormData`.
5. **Zod v4 `.uuid()` é estritamente RFC 4122** — os ids de seed são
   sequenciais e legíveis (`00000000-...-0001`), não UUIDs v4 "de verdade";
   `.uuid()` os rejeitava com "Selecione um tenant válido." mesmo com um id
   válido selecionado. Corrigido trocando por `.guid()` (formato
   8-4-4-4-12 sem checagem de versão) em `validation/{membership,sindicato}.ts`
   — dados reais (`gen_random_uuid()`) continuam válidos.
6. **Convite pendente invisível para colegas do tenant** — a policy de
   `users_select` exigia que *ambas* as memberships estivessem `active`
   para dois membros do mesmo tenant se enxergarem, escondendo nome/e-mail
   de quem acabara de ser convidado (mostrava "—"). Corrigido em
   `0005_users_visibility_invited.sql`: quem pergunta precisa estar `active`;
   quem é consultado pode estar `active` ou `invited`.

Depois das correções, confirmado ponta a ponta pelo navegador:
- Cadastro de um sindicato novo → redireciona para o detalhe → onboarding
  "Em onboarding" → "Concluir onboarding" muda para "Implantado" e some o
  botão.
- Edição de sindicato existente (staff GSBC) persiste e reflete
  imediatamente; o mesmo formulário para o dirigente do sindicato aparece
  inteiramente desabilitado com aviso explícito.
- Convite de usuário (staff GSBC → tenant de sindicato) cria a membership
  com status "Convidado", aparece na tabela com nome/e-mail corretos tanto
  para o admin GSBC quanto para a dirigente do mesmo tenant.
- **Isolamento de tenant**: a dirigente nunca vê o admin GSBC nem o outro
  tenant; o botão "Convidar usuário" fica ausente para ela porque seu papel
  é "Dirigente", não "Administrador do Sindicato" — confirma que o gate é
  por papel, não apenas por tenant.
- Todas as quatro ações geraram entrada correspondente na trilha de
  Auditoria, na ordem certa, com timestamps corretos.
- `npm run build`, `npx tsc --noEmit`, `npx eslint .` sem erros (mesmo
  warning inofensivo de `useReactTable` da Rodada 1).

## Decisões arquiteturais
- **Convite via GoTrue admin, membership via RLS** — deliberadamente não
  usei o cliente service-role para inserir a `membership`; só a chamada de
  auth (que não tem equivalente autorizável via RLS) passa pelo admin
  client. Mantém a autorização real centralizada no Postgres.
- **`.guid()` em vez de `.uuid()`** — ver bug #5 acima. Documentado inline
  nos schemas para não ser "corrigido" de volta por engano no futuro.
- Não foi criado ADR novo nesta rodada — as decisões são refinamentos
  operacionais das arquiteturas já registradas em ADR-001/002/003, não
  decisões estruturais novas.

## Pendências
- Suspender/reativar/remover uma membership (hoje só é possível convidar).
- Reenviar convite expirado.
- CRUD de `sindicato_contatos` (contatos do sindicato) pela UI — hoje só a
  ficha principal do sindicato é editável.

## Riscos residuais
| Risco | Classificação | Observação |
|---|---|---|
| Sem teste automatizado cobrindo RLS/onboarding gate | Médio | Validado manualmente nesta rodada; recomenda-se suíte de testes de autorização antes de P1 avançar muito mais |
| `.guid()` aceita UUIDs de qualquer versão | Baixo | Não é uma superfície de ataque real — o Postgres também valida o tipo `uuid` da coluna; apenas reduz a checagem de formato em nível de app |
| E-mail de convite depende do provedor SMTP configurado | Baixo | Em produção, configurar o provedor de e-mail do Supabase; local usa Mailpit |

## Regras de negócio pendentes
Nenhuma nova. As duas identificadas na Rodada 1 foram implementadas nesta
rodada.

## Próxima rodada recomendada
Rodada 3 — Empresas: entidade 360º da empresa (regra 19), incluindo cadastro,
contatos e o início do vínculo com instrumentos coletivos (preparando a
Rodada 4).
