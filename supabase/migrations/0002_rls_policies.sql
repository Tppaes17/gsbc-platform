-- GSBC — Rodada 1: Row Level Security
--
-- Princípio (regra 14 do prompt-mestre): usuário do Sindicato A jamais acessa dados
-- do Sindicato B. Toda tabela sensível tem RLS habilitado; a segurança nunca depende
-- apenas de filtros de frontend.
--
-- Staff GSBC (membro do tenant type=platform) tem visibilidade cross-tenant porque
-- opera múltiplos sindicatos (regra 97). Membros de um tenant type=sindicato só
-- enxergam dados do próprio tenant.

-- =========================================================================
-- Funções auxiliares (security definer, stable — evitam recursão de RLS)
-- =========================================================================
create or replace function public.is_platform_staff(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from memberships m
    join tenants t on t.id = m.tenant_id
    where m.user_id = p_user_id
      and m.status = 'active'
      and t.type = 'platform'
  );
$$;

comment on function public.is_platform_staff is 'True se o usuário é membro ativo do tenant platform (staff GSBC), com visibilidade cross-tenant.';

create or replace function public.user_tenant_ids(p_user_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id
  from memberships
  where user_id = p_user_id
    and status = 'active';
$$;

comment on function public.user_tenant_ids is 'Tenants em que o usuário possui membership ativa.';

-- =========================================================================
-- log_audit_event: único caminho de escrita em audit_logs.
-- SECURITY DEFINER contorna RLS de audit_logs (que não tem política de insert
-- para authenticated), garantindo que user_id sempre reflita auth.uid() real
-- e que old_data/new_data não possam ser forjados por chamadas diretas.
-- =========================================================================
create or replace function public.log_audit_event(
  p_tenant_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_old_data jsonb default null,
  p_new_data jsonb default null,
  p_metadata jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into audit_logs (
    tenant_id, user_id, action, entity_type, entity_id, old_data, new_data, metadata
  )
  values (
    p_tenant_id, auth.uid(), p_action, p_entity_type, p_entity_id, p_old_data, p_new_data, p_metadata
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.log_audit_event to authenticated;

-- =========================================================================
-- tenants
-- =========================================================================
alter table tenants enable row level security;

create policy tenants_select on tenants for select
  using (
    public.is_platform_staff(auth.uid())
    or id in (select public.user_tenant_ids(auth.uid()))
  );

create policy tenants_insert on tenants for insert
  with check (public.is_platform_staff(auth.uid()));

create policy tenants_update on tenants for update
  using (public.is_platform_staff(auth.uid()))
  with check (public.is_platform_staff(auth.uid()));

create policy tenants_delete on tenants for delete
  using (public.is_platform_staff(auth.uid()));

-- =========================================================================
-- sindicatos / sindicato_contatos
-- DECISÃO CONFIRMADA (usuário, Rodada 1): edição de dados cadastrais do
-- sindicato (razão social, contatos etc.) é exclusiva da equipe GSBC —
-- dirigentes/administradores do sindicato têm apenas leitura, sem exceção
-- futura prevista. Escrita restrita a staff GSBC permanentemente.
-- =========================================================================
alter table sindicatos enable row level security;

create policy sindicatos_select on sindicatos for select
  using (
    public.is_platform_staff(auth.uid())
    or tenant_id in (select public.user_tenant_ids(auth.uid()))
  );

create policy sindicatos_insert on sindicatos for insert
  with check (public.is_platform_staff(auth.uid()));

create policy sindicatos_update on sindicatos for update
  using (public.is_platform_staff(auth.uid()))
  with check (public.is_platform_staff(auth.uid()));

create policy sindicatos_delete on sindicatos for delete
  using (public.is_platform_staff(auth.uid()));

alter table sindicato_contatos enable row level security;

create policy sindicato_contatos_select on sindicato_contatos for select
  using (
    public.is_platform_staff(auth.uid())
    or exists (
      select 1 from sindicatos s
      where s.id = sindicato_contatos.sindicato_id
        and s.tenant_id in (select public.user_tenant_ids(auth.uid()))
    )
  );

create policy sindicato_contatos_insert on sindicato_contatos for insert
  with check (public.is_platform_staff(auth.uid()));

create policy sindicato_contatos_update on sindicato_contatos for update
  using (public.is_platform_staff(auth.uid()))
  with check (public.is_platform_staff(auth.uid()));

create policy sindicato_contatos_delete on sindicato_contatos for delete
  using (public.is_platform_staff(auth.uid()));

-- =========================================================================
-- users
-- Visível: o próprio usuário, staff GSBC, ou membros de um tenant em comum
-- (diretório de equipe). Só o próprio usuário edita seu perfil em P0.
-- Inserção acontece via trigger handle_new_user (security definer), não via API.
-- =========================================================================
alter table users enable row level security;

create policy users_select on users for select
  using (
    id = auth.uid()
    or public.is_platform_staff(auth.uid())
    or exists (
      select 1
      from memberships m1
      join memberships m2 on m2.tenant_id = m1.tenant_id
      where m1.user_id = auth.uid()
        and m1.status = 'active'
        and m2.user_id = users.id
        and m2.status = 'active'
    )
  );

create policy users_update_self on users for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- =========================================================================
-- roles / permissions / role_permissions
-- Catálogo é seed/system-managed em P0: leitura liberada a qualquer usuário
-- autenticado (necessária para a UI exibir nomes de papéis), escrita restrita
-- a service_role (nenhuma política de insert/update/delete definida).
-- =========================================================================
alter table roles enable row level security;
alter table permissions enable row level security;
alter table role_permissions enable row level security;

create policy roles_select on roles for select using (auth.role() = 'authenticated');
create policy permissions_select on permissions for select using (auth.role() = 'authenticated');
create policy role_permissions_select on role_permissions for select using (auth.role() = 'authenticated');

-- =========================================================================
-- memberships
-- DECISÃO CONFIRMADA (usuário, Rodada 1): apenas staff GSBC provisiona
-- membros durante o onboarding do sindicato (regra 6 — a GSBC executa).
-- Após a implantação/onboarding do sindicato estar concluída, dirigentes e
-- administradores do próprio sindicato poderão convidar e gerenciar sua
-- própria equipe (self-service). Essa policy ainda restringe insert/update/
-- delete a staff GSBC porque o conceito de "onboarding concluído" (provável
-- status em `tenants` ou `sindicatos`) ainda não existe no schema — a
-- implementar quando o fluxo de convite for construído (planejado para
-- Rodada 2 ou posterior, gated por esse status).
-- =========================================================================
alter table memberships enable row level security;

create policy memberships_select on memberships for select
  using (
    user_id = auth.uid()
    or public.is_platform_staff(auth.uid())
    or tenant_id in (select public.user_tenant_ids(auth.uid()))
  );

create policy memberships_insert on memberships for insert
  with check (public.is_platform_staff(auth.uid()));

create policy memberships_update on memberships for update
  using (public.is_platform_staff(auth.uid()))
  with check (public.is_platform_staff(auth.uid()));

create policy memberships_delete on memberships for delete
  using (public.is_platform_staff(auth.uid()));

-- =========================================================================
-- audit_logs
-- Somente leitura via API (escrita exclusiva por public.log_audit_event).
-- Sem política de update/delete: log é imutável por construção.
-- =========================================================================
alter table audit_logs enable row level security;

create policy audit_logs_select on audit_logs for select
  using (
    public.is_platform_staff(auth.uid())
    or tenant_id in (select public.user_tenant_ids(auth.uid()))
  );
