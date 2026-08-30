-- GSBC — Revenue Core Phase 2: workflow operacional de contratos financeiros
--
-- A UI de contratos precisa criar novas versões de split sem deixar o
-- tenant sem regra ativa se uma operação falhar pela metade. Esta RPC
-- centraliza o versionamento: valida contrato, arquiva a regra ativa
-- anterior e insere a nova versão na mesma transação.

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
    when 'financial_contract' then
      select tenant_id into v_tenant_id from financial_contracts where id = p_entity_id;
    when 'financial_split_rule' then
      select tenant_id into v_tenant_id from financial_split_rules where id = p_entity_id;
    when 'payment_reconciliation' then
      select tenant_id into v_tenant_id from payment_reconciliations where id = p_entity_id;
    when 'payment_split_item' then
      select tenant_id into v_tenant_id from payment_split_items where id = p_entity_id;
    when 'financial_repasse' then
      select tenant_id into v_tenant_id from financial_repasses where id = p_entity_id;
    when 'reconciliation_divergence' then
      select tenant_id into v_tenant_id from reconciliation_divergences where id = p_entity_id;
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

create or replace function public.create_financial_split_rule_version(
  p_contract_id uuid,
  p_effective_from date,
  p_gsbc_percent numeric,
  p_sindicato_percent numeric,
  p_terceiros_percent numeric default 0,
  p_provider_fee_percent numeric default 0,
  p_provider_fee_fixed numeric default 0,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_contract record;
  v_next_version integer;
  v_rule_id uuid;
begin
  v_actor_id := auth.uid();

  if v_actor_id is null or not public.is_platform_staff(v_actor_id) then
    raise exception 'Apenas staff GSBC pode versionar regra de split.';
  end if;

  select id, tenant_id, status, vigencia_inicio, vigencia_fim
    into v_contract
    from financial_contracts
    where id = p_contract_id
    for update;

  if v_contract.id is null then
    raise exception 'Contrato financeiro não encontrado.';
  end if;

  if v_contract.status <> 'validated' then
    raise exception 'Regra ativa exige contrato financeiro validado.';
  end if;

  if p_effective_from < v_contract.vigencia_inicio
     or (v_contract.vigencia_fim is not null and p_effective_from > v_contract.vigencia_fim) then
    raise exception 'Vigência da regra fora da vigência do contrato.';
  end if;

  if p_gsbc_percent + p_sindicato_percent + p_terceiros_percent <> 100 then
    raise exception 'Percentuais de split devem somar 100.';
  end if;

  if p_provider_fee_percent < 0 or p_provider_fee_fixed < 0 then
    raise exception 'Taxas do provider não podem ser negativas.';
  end if;

  select coalesce(max(version), 0) + 1
    into v_next_version
    from financial_split_rules
    where contract_id = p_contract_id;

  update financial_split_rules
     set status = 'archived',
         effective_to = p_effective_from - 1
   where tenant_id = v_contract.tenant_id
     and status = 'active'
     and effective_to is null;

  insert into financial_split_rules (
    contract_id, tenant_id, version, status, effective_from,
    gsbc_percent, sindicato_percent, terceiros_percent, fee_policy,
    metadata, created_by
  )
  values (
    p_contract_id,
    v_contract.tenant_id,
    v_next_version,
    'active',
    p_effective_from,
    p_gsbc_percent,
    p_sindicato_percent,
    p_terceiros_percent,
    jsonb_build_object(
      'provider_fee_percent', p_provider_fee_percent,
      'provider_fee_fixed', p_provider_fee_fixed
    ),
    coalesce(p_metadata, '{}'::jsonb),
    v_actor_id
  )
  returning id into v_rule_id;

  return v_rule_id;
end;
$$;

comment on function public.create_financial_split_rule_version(uuid, date, numeric, numeric, numeric, numeric, numeric, jsonb) is
  'Versiona regra de split de forma transacional: valida contrato, arquiva regra ativa anterior e cria nova versão ativa.';

revoke all on function public.create_financial_split_rule_version(uuid, date, numeric, numeric, numeric, numeric, numeric, jsonb) from public;
grant execute on function public.create_financial_split_rule_version(uuid, date, numeric, numeric, numeric, numeric, numeric, jsonb) to authenticated;
