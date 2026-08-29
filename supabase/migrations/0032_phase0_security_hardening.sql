-- GSBC — Phase 0: hardening de auditoria e webhook de pagamento
--
-- Esta migration fecha dois riscos P0/P1 identificados na execução da
-- Phase 0:
--   1. log_audit_event aceitava tenant_id/entity_id caller-supplied sem
--      validar se o ator podia auditar aquele tenant ou se o objeto
--      pertencia ao tenant informado.
--   2. webhooks distintos e concorrentes de uma mesma charge podiam
--      registrar pagamentos duplicados, porque o pagamento era inserido
--      antes da atualização terminal da charge.

create or replace function public.audit_actor_can_use_tenant(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.is_platform_staff(auth.uid())
    or p_tenant_id in (select public.user_tenant_ids(auth.uid()))
    or exists (
      select 1
      from empresa_contatos ec
      join empresas e on e.id = ec.empresa_id
      where ec.user_id = auth.uid()
        and ec.portal_access_status = 'active'
        and e.tenant_id = p_tenant_id
    ),
    false
  );
$$;

comment on function public.audit_actor_can_use_tenant(uuid) is
  'Phase 0: valida se o usuário autenticado pode registrar auditoria para o tenant informado (staff, membership ativa ou contato de portal ativo).';

create or replace function public.audit_entity_tenant_id(
  p_entity_type text,
  p_entity_id uuid
)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
begin
  if p_entity_id is null then
    return null;
  end if;

  case p_entity_type
    when 'tenant' then
      v_tenant_id := p_entity_id;
    when 'sindicato' then
      select tenant_id into v_tenant_id from sindicatos where id = p_entity_id;
    when 'membership' then
      select tenant_id into v_tenant_id from memberships where id = p_entity_id;
    when 'empresa' then
      select tenant_id into v_tenant_id from empresas where id = p_entity_id;
    when 'empresa_contato' then
      select e.tenant_id into v_tenant_id
      from empresa_contatos ec
      join empresas e on e.id = ec.empresa_id
      where ec.id = p_entity_id;
    when 'instrumento' then
      select tenant_id into v_tenant_id from instrumentos where id = p_entity_id;
    when 'obrigacao' then
      select tenant_id into v_tenant_id from obrigacoes where id = p_entity_id;
    when 'cobranca' then
      select tenant_id into v_tenant_id from cobrancas where id = p_entity_id;
    when 'negociacao' then
      select tenant_id into v_tenant_id from negociacoes where id = p_entity_id;
    when 'contestacao' then
      select tenant_id into v_tenant_id from contestacoes where id = p_entity_id;
    when 'documento' then
      select tenant_id into v_tenant_id from documentos where id = p_entity_id;
    when 'collection_enrollment' then
      select tenant_id into v_tenant_id from collection_enrollments where id = p_entity_id;
    when 'work_item' then
      select tenant_id into v_tenant_id from work_items where id = p_entity_id;
    when 'escalonamento' then
      select tenant_id into v_tenant_id from escalonamentos where id = p_entity_id;
    when 'policy' then
      return null;
    when 'oportunidade' then
      select tenant_candidato_id into v_tenant_id from oportunidades where id = p_entity_id;
    when 'prospecto' then
      select tenant_id into v_tenant_id from dossies_cadastrais where id = p_entity_id;
    when 'dossie_cadastral' then
      select tenant_id into v_tenant_id from dossies_cadastrais where id = p_entity_id;
    when 'dossie_importacao' then
      return null;
    else
      raise exception 'Tipo de entidade não suportado para auditoria: %', p_entity_type;
  end case;

  if v_tenant_id is null and p_entity_type not in ('policy', 'dossie_importacao') then
    raise exception 'Objeto de auditoria não encontrado ou sem tenant: %.%', p_entity_type, p_entity_id;
  end if;

  return v_tenant_id;
end;
$$;

comment on function public.audit_entity_tenant_id(text, uuid) is
  'Phase 0: resolve o tenant real de uma entidade auditável para impedir spoofing de tenant/entity_id em log_audit_event.';

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
  v_actor_id uuid;
  v_entity_tenant_id uuid;
begin
  v_actor_id := auth.uid();

  if v_actor_id is null then
    raise exception 'Auditoria exige usuário autenticado.';
  end if;

  if nullif(trim(p_action), '') is null then
    raise exception 'Ação de auditoria obrigatória.';
  end if;

  if nullif(trim(p_entity_type), '') is null then
    raise exception 'Tipo de entidade de auditoria obrigatório.';
  end if;

  v_entity_tenant_id := public.audit_entity_tenant_id(p_entity_type, p_entity_id);

  if p_tenant_id is null then
    if not public.is_platform_staff(v_actor_id) then
      raise exception 'tenant_id é obrigatório para usuários não-staff.';
    end if;
  else
    if not public.audit_actor_can_use_tenant(p_tenant_id) then
      raise exception 'Usuário sem permissão para registrar auditoria neste tenant.';
    end if;
  end if;

  if v_entity_tenant_id is not null and p_tenant_id is distinct from v_entity_tenant_id then
    raise exception 'tenant_id informado não corresponde ao tenant real da entidade auditada.';
  end if;

  insert into audit_logs (
    tenant_id, user_id, action, entity_type, entity_id, old_data, new_data, metadata
  )
  values (
    p_tenant_id, v_actor_id, p_action, p_entity_type, p_entity_id, p_old_data, p_new_data, p_metadata
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.audit_actor_can_use_tenant(uuid) to authenticated;
grant execute on function public.audit_entity_tenant_id(text, uuid) to authenticated;
grant execute on function public.log_audit_event(uuid, text, text, uuid, jsonb, jsonb, jsonb) to authenticated;

create or replace function public.register_provider_pagamento(
  p_charge_id uuid,
  p_external_status text,
  p_paid_at timestamptz,
  p_observacao text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_charge record;
  v_pagamento_id uuid;
begin
  select id, cobranca_id, valor, status, tipo, pagamento_id
    into v_charge
    from payment_charges
    where id = p_charge_id
    for update;

  if v_charge.id is null then
    raise exception 'Charge não encontrada.';
  end if;

  if v_charge.status = 'paid' then
    if v_charge.pagamento_id is null then
      raise exception 'Charge paga sem vínculo de pagamento exige revisão manual.';
    end if;
    return v_charge.pagamento_id;
  end if;

  if v_charge.status = 'refunded' then
    raise exception 'Charge estornada não pode receber novo pagamento.';
  end if;

  v_pagamento_id := public.register_pagamento(
    v_charge.cobranca_id,
    v_charge.valor,
    p_paid_at::date,
    v_charge.tipo,
    p_observacao
  );

  update payment_charges
     set status = 'paid',
         external_status = p_external_status,
         paid_at = p_paid_at,
         pagamento_id = v_pagamento_id
   where id = v_charge.id;

  return v_pagamento_id;
end;
$$;

comment on function public.register_provider_pagamento(uuid, text, timestamptz, text) is
  'Phase 0: registra pagamento confirmado por provider sob lock da payment_charge, garantindo idempotência/replay e evitando duplicidade em eventos concorrentes.';

revoke all on function public.register_provider_pagamento(uuid, text, timestamptz, text) from public;
grant execute on function public.register_provider_pagamento(uuid, text, timestamptz, text) to service_role;
