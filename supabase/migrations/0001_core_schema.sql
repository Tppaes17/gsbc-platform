-- GSBC — Rodada 1: Fundação SaaS
-- Schema core: tenants, sindicatos, users, roles, permissions, memberships, audit_logs.
--
-- Modelo de multi-tenancy (ADR-001):
--   tenant = fronteira de isolamento técnico.
--   Existe exatamente 1 tenant do tipo 'platform' (a própria GSBC, operando múltiplos
--   sindicatos) e N tenants do tipo 'sindicato' (um por entidade sindical cliente).
--   A entidade "organizations" do documento de referência é tratada como sinônimo de
--   "tenants" neste estágio — ver ADR-001 para justificativa.
--
-- Modelo de autorização (ADR-003): User -> Membership -> Tenant -> Role -> Permissions.
-- Nunca hardcoded role em users; um usuário pode ter memberships em múltiplos tenants.

create extension if not exists "pgcrypto";

-- =========================================================================
-- tenants
-- =========================================================================
create table tenants (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('platform', 'sindicato')),
  name text not null,
  slug text not null unique,
  status text not null default 'active' check (status in ('active', 'suspended', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table tenants is 'Fronteira de isolamento multi-tenant. type=platform é singleton (GSBC); type=sindicato é 1 por cliente.';

-- Garante no máximo 1 tenant do tipo platform.
create unique index tenants_single_platform on tenants (type) where type = 'platform';

-- =========================================================================
-- sindicatos (perfil de negócio do tenant tipo sindicato — relação 1:1)
-- =========================================================================
create table sindicatos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references tenants(id) on delete cascade,
  razao_social text not null,
  nome_fantasia text,
  cnpj text not null unique,
  categoria text,
  base_territorial text,
  email_institucional text,
  telefone text,
  endereco jsonb,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table sindicatos is 'Dados cadastrais do sindicato. 1:1 com um tenant do tipo sindicato.';

create table sindicato_contatos (
  id uuid primary key default gen_random_uuid(),
  sindicato_id uuid not null references sindicatos(id) on delete cascade,
  nome text not null,
  cargo text,
  email text,
  telefone text,
  principal boolean not null default false,
  created_at timestamptz not null default now()
);

create index sindicato_contatos_sindicato_id_idx on sindicato_contatos (sindicato_id);

-- =========================================================================
-- users (perfil público 1:1 com auth.users)
-- =========================================================================
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  avatar_url text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table users is 'Perfil público do usuário. Criado automaticamente via trigger em auth.users.';

-- =========================================================================
-- roles / permissions / role_permissions
-- =========================================================================
create table roles (
  id uuid primary key default gen_random_uuid(),
  tenant_type text not null check (tenant_type in ('platform', 'sindicato')),
  code text not null unique,
  name text not null,
  description text,
  is_system boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table roles is 'Papéis do RBAC, escopados por tipo de tenant. Em P0, apenas papéis seed (is_system=true) existem.';

create table permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

-- =========================================================================
-- memberships (User <-> Tenant <-> Role)
-- =========================================================================
create table memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role_id uuid not null references roles(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'invited', 'suspended')),
  invited_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint memberships_unique unique (tenant_id, user_id)
);

comment on table memberships is 'Um usuário pode ter no máximo 1 papel por tenant em P0. PENDING BUSINESS RULE: múltiplos papéis por tenant, se necessário no futuro.';

create index memberships_user_id_idx on memberships (user_id);
create index memberships_tenant_id_idx on memberships (tenant_id);

-- =========================================================================
-- audit_logs
-- =========================================================================
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete set null,
  user_id uuid references users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  metadata jsonb,
  ip_address inet,
  user_agent text,
  correlation_id uuid,
  created_at timestamptz not null default now()
);

comment on table audit_logs is 'Log de auditoria append-only. Inserção exclusiva via função public.log_audit_event (ver 0002_rls_policies.sql).';

create index audit_logs_tenant_id_created_at_idx on audit_logs (tenant_id, created_at desc);
create index audit_logs_entity_idx on audit_logs (entity_type, entity_id);

-- =========================================================================
-- updated_at triggers
-- =========================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on tenants
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on sindicatos
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on users
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on memberships
  for each row execute function public.set_updated_at();

-- =========================================================================
-- handle_new_user: cria public.users automaticamente ao registrar em auth.users
-- =========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
