-- GSBC — Rodada 2: Clientes e usuários
--
-- Contexto (decisão do usuário, Rodada 1):
--   1. Dados cadastrais do sindicato seguem exclusivos da equipe GSBC —
--      nenhuma mudança de RLS de escrita em sindicatos/sindicato_contatos.
--   2. Convite/gestão de membros: GSBC durante o onboarding; o próprio
--      sindicato pode passar a convidar/gerenciar sua equipe *depois* de
--      implantado. Esta migration modela esse "depois" via
--      tenants.onboarding_status.

-- =========================================================================
-- tenants.onboarding_status
-- =========================================================================
alter table tenants
  add column onboarding_status text not null default 'onboarding'
    check (onboarding_status in ('onboarding', 'active'));

comment on column tenants.onboarding_status is
  'Fase do ciclo de vida do tenant. Enquanto "onboarding", apenas staff GSBC '
  'gerencia memberships do tenant (regra 6). Uma vez "active", '
  'administradores do próprio sindicato também podem convidar/gerenciar '
  'sua equipe (decisão do usuário, Rodada 1).';

-- O tenant platform (GSBC) nasce operacional; sindicatos nascem em onboarding.
update tenants set onboarding_status = 'active' where type = 'platform';

-- =========================================================================
-- Integridade: o papel de uma membership deve pertencer ao mesmo tipo de
-- tenant da membership (não é possível atribuir um papel "platform" a uma
-- membership em tenant "sindicato", nem o inverso). CHECK simples não
-- alcança colunas de outra tabela — trigger garante a regra no banco
-- (regra 67: não transferir toda integridade para o frontend).
-- =========================================================================
create or replace function public.enforce_membership_role_tenant_type()
returns trigger
language plpgsql
as $$
declare
  v_tenant_type text;
  v_role_tenant_type text;
begin
  select type into v_tenant_type from tenants where id = new.tenant_id;
  select tenant_type into v_role_tenant_type from roles where id = new.role_id;

  if v_tenant_type is null or v_role_tenant_type is null then
    raise exception 'Tenant ou role inexistente para a membership.';
  end if;

  if v_tenant_type <> v_role_tenant_type then
    raise exception
      'Papel incompatível: tenant do tipo % não aceita papel do tipo %.',
      v_tenant_type, v_role_tenant_type;
  end if;

  return new;
end;
$$;

create trigger enforce_membership_role_tenant_type
  before insert or update of tenant_id, role_id on memberships
  for each row execute function public.enforce_membership_role_tenant_type();

-- =========================================================================
-- invited -> active: a membership criada por convite começa "invited" e só
-- vira "active" quando o usuário efetivamente confirma o cadastro (define
-- senha a partir do link de convite). Evita contar como "ativo" alguém que
-- nunca aceitou.
-- =========================================================================
create or replace function public.handle_user_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    update memberships
    set status = 'active'
    where user_id = new.id
      and status = 'invited';
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute function public.handle_user_email_confirmed();

-- =========================================================================
-- can_manage_tenant_members: staff GSBC sempre; administrador do próprio
-- sindicato somente depois do onboarding concluído.
-- =========================================================================
create or replace function public.can_manage_tenant_members(p_user_id uuid, p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_platform_staff(p_user_id)
    or exists (
      select 1
      from memberships m
      join roles r on r.id = m.role_id
      join tenants t on t.id = m.tenant_id
      where m.user_id = p_user_id
        and m.tenant_id = p_tenant_id
        and m.status = 'active'
        and r.code = 'sindicato_administrador'
        and t.onboarding_status = 'active'
    );
$$;

comment on function public.can_manage_tenant_members is
  'True se o usuário pode convidar/gerenciar membros do tenant: staff GSBC '
  'sempre, ou administrador do próprio sindicato após onboarding concluído.';

grant execute on function public.can_manage_tenant_members(uuid, uuid) to authenticated;

-- Substitui as policies de escrita de memberships para incluir o caminho de
-- self-service pós-onboarding, mantendo o caminho de staff GSBC.
drop policy if exists memberships_insert on memberships;
drop policy if exists memberships_update on memberships;
drop policy if exists memberships_delete on memberships;

create policy memberships_insert on memberships for insert
  with check (public.can_manage_tenant_members(auth.uid(), tenant_id));

create policy memberships_update on memberships for update
  using (public.can_manage_tenant_members(auth.uid(), tenant_id))
  with check (public.can_manage_tenant_members(auth.uid(), tenant_id));

create policy memberships_delete on memberships for delete
  using (public.can_manage_tenant_members(auth.uid(), tenant_id));

-- =========================================================================
-- create_sindicato_tenant: cria tenant + sindicato numa única transação
-- (evita tenant órfão se a segunda inserção falhar). SECURITY INVOKER
-- (padrão) — roda com os privilégios de quem chama, então as policies de
-- tenants_insert/sindicatos_insert (staff GSBC apenas) seguem valendo.
-- =========================================================================
create or replace function public.create_sindicato_tenant(
  p_name text,
  p_slug text,
  p_razao_social text,
  p_nome_fantasia text,
  p_cnpj text,
  p_categoria text,
  p_base_territorial text,
  p_email_institucional text,
  p_telefone text
)
returns uuid
language plpgsql
as $$
declare
  v_tenant_id uuid;
begin
  insert into tenants (type, name, slug)
  values ('sindicato', p_name, p_slug)
  returning id into v_tenant_id;

  insert into sindicatos (
    tenant_id, razao_social, nome_fantasia, cnpj, categoria,
    base_territorial, email_institucional, telefone
  ) values (
    v_tenant_id, p_razao_social, p_nome_fantasia, p_cnpj, p_categoria,
    p_base_territorial, p_email_institucional, p_telefone
  );

  return v_tenant_id;
end;
$$;

grant execute on function public.create_sindicato_tenant(
  text, text, text, text, text, text, text, text, text
) to authenticated;
