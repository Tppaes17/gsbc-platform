# ADR-003 — Modelo de Autorização (RBAC via Membership)

## Status
Aceito — Rodada 1.

## Contexto
A regra 15 do prompt-mestre proíbe explicitamente um campo `role` fixo em
`users` — isso impediria um mesmo usuário de participar de múltiplas
organizações com papéis diferentes (ex.: um analista GSBC que também é
dirigente eleito de um sindicato-cliente, ou um usuário GSBC que muda de
carteira ao longo do tempo).

## Decisão
Modelo: `User → Membership → Tenant → Role → Permissions`.

- **`roles`**: catálogo de papéis, escopado por `tenant_type` (`platform` ou
  `sindicato`). Em P0, todos os papéis são `is_system = true` (seed fixo,
  seção 16) — não há UI para criar papéis customizados ainda.
- **`permissions`**: catálogo de permissões granulares (`recurso.ação`).
  Cresce por módulo, conforme cada um é implementado — não foi antecipado um
  catálogo completo para módulos que ainda não existem (regra 10).
- **`role_permissions`**: mapeamento N:N entre papéis e permissões.
- **`memberships`**: vínculo entre um `user` e um `tenant`, com exatamente 1
  `role`. Um usuário pode ter memberships em múltiplos tenants simultaneamente.
  **PENDING BUSINESS RULE**: múltiplos papéis por usuário dentro do *mesmo*
  tenant não é suportado em P0 (constraint `unique(tenant_id, user_id)`) —
  reavaliar se necessário.
- **Staff GSBC = membership no tenant `platform`** (ver ADR-001). Visibilidade
  cross-tenant é concedida via a função `is_platform_staff(uid)`, usada nas
  policies de RLS de toda tabela sensível.

## Provisionamento de membros: GSBC no onboarding, sindicato depois (confirmado)
Decisão do usuário (Rodada 1) para as duas lacunas identificadas nesta
fundação:
- **Dados cadastrais do sindicato** (`sindicatos`, `sindicato_contatos`):
  edição é **exclusiva da equipe GSBC**, permanentemente — não haverá
  self-service do sindicato para esses campos.
- **Convite/gestão de membros** (`memberships`): durante o onboarding do
  sindicato, **apenas staff GSBC** cria memberships (regra 6 — a GSBC
  executa). **Após a implantação concluída**, dirigentes/administradores do
  próprio sindicato passam a poder convidar e gerenciar sua equipe.

Essa segunda regra ainda não está implementada como capability alternável —
o schema não tem hoje um conceito de "onboarding concluído" (provavelmente
um status em `tenants` ou `sindicatos`, ex. `onboarding` vs. `active`). As
policies de RLS de `memberships` (`0002_rls_policies.sql`) permanecem
restritas a `is_platform_staff()` até que o fluxo de convite seja construído
e esse status seja modelado — ver pendência na Rodada 1.

## Aplicação em duas camadas
1. **RLS no Postgres** — autoridade final, nunca contornável pelo frontend
   (regra 14). Funções `is_platform_staff()` e `user_tenant_ids()`
   (`SECURITY DEFINER`, `STABLE`) evitam recursão de RLS e centralizam a
   lógica.
2. **Helpers em `src/lib/auth/session.ts`** — usados para decisões de UI
   (mostrar/ocultar ação, redirecionar). Nunca são o único controle em uma
   mutação sensível; sempre backed pelo RLS. Um helper de checagem de
   permissão em nível de aplicação (`can()`/`hasRole()`) será introduzido
   quando a primeira mutação sensível exigir gating de UI — evitado em P0
   por não ter consumidor real ainda.

## Auditoria como consequência do modelo
Toda escrita em `audit_logs` passa pela função `log_audit_event`
(`SECURITY DEFINER`), que carimba `user_id = auth.uid()` no servidor —
impossível de forjar a partir do cliente. Não existe policy de `INSERT` para
o papel `authenticated` na tabela `audit_logs`; a função é o único caminho.

## Alternativas consideradas
- **Campo `role` direto em `users`**: descartado — contraria explicitamente a
  regra 15 e inviabiliza multi-tenant real.
- **Sistema de permissão 100% no aplicativo (sem RLS)**: descartado — viola a
  regra 14 ("nunca confiar apenas em filtros do frontend/aplicação").
