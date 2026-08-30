-- GSBC — Revenue Core Phase 1: subledger, split e conciliação
--
-- Primeiro incremento de STG-07 sem provider real: cria o modelo
-- canônico de contrato financeiro, regra de split versionada,
-- conciliação por pagamento, itens de split e repasses. Nenhum split é
-- hardcoded: se não houver contrato validado/regra ativa, a conciliação
-- fica em manual_review.

create table financial_contracts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  sindicato_id uuid not null references sindicatos(id) on delete cascade,
  titulo text not null,
  status text not null default 'draft'
    check (status in ('draft', 'pending_validation', 'validated', 'archived')),
  vigencia_inicio date not null,
  vigencia_fim date,
  moeda text not null default 'BRL' check (moeda = 'BRL'),
  termos_snapshot jsonb not null default '{}'::jsonb,
  criado_por uuid references users(id) on delete set null,
  validado_por uuid references users(id) on delete set null,
  validado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_contracts_vigencia_check
    check (vigencia_fim is null or vigencia_fim >= vigencia_inicio)
);

comment on table financial_contracts is
  'Contrato financeiro validado que parametriza split/repasses por tenant. Entrada em produção exige validação GSBC; nunca hardcode de percentual.';

create index financial_contracts_tenant_idx on financial_contracts (tenant_id);
create index financial_contracts_sindicato_idx on financial_contracts (sindicato_id);

create trigger set_updated_at before update on financial_contracts
  for each row execute function public.set_updated_at();

create or replace function public.enforce_financial_contract_matches_sindicato()
returns trigger
language plpgsql
as $$
declare
  v_tenant_id uuid;
begin
  select tenant_id into v_tenant_id from sindicatos where id = new.sindicato_id;

  if v_tenant_id is null then
    raise exception 'Sindicato do contrato financeiro não encontrado.';
  end if;

  if new.tenant_id <> v_tenant_id then
    raise exception 'tenant_id do contrato financeiro deve bater com o sindicato.';
  end if;

  if new.status = 'validated' and (new.validado_por is null or new.validado_em is null) then
    raise exception 'Contrato validado exige validado_por e validado_em.';
  end if;

  return new;
end;
$$;

create trigger financial_contracts_enforce_match
  before insert or update on financial_contracts
  for each row execute function public.enforce_financial_contract_matches_sindicato();

create table financial_split_rules (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references financial_contracts(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  version integer not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  effective_from date not null,
  effective_to date,
  gsbc_percent numeric(5, 2) not null check (gsbc_percent >= 0 and gsbc_percent <= 100),
  sindicato_percent numeric(5, 2) not null check (sindicato_percent >= 0 and sindicato_percent <= 100),
  terceiros_percent numeric(5, 2) not null default 0 check (terceiros_percent >= 0 and terceiros_percent <= 100),
  fee_policy jsonb not null default '{"provider_fee_percent":0,"provider_fee_fixed":0}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_split_rules_percent_sum
    check (gsbc_percent + sindicato_percent + terceiros_percent = 100),
  constraint financial_split_rules_vigencia_check
    check (effective_to is null or effective_to >= effective_from),
  constraint financial_split_rules_contract_version_unique unique (contract_id, version)
);

comment on table financial_split_rules is
  'Regra de split versionada e vinculada a contrato validado. A versão aplicada é preservada na conciliação e nos itens de split.';

create unique index financial_split_rules_one_active
  on financial_split_rules (tenant_id)
  where status = 'active' and effective_to is null;
create index financial_split_rules_tenant_idx on financial_split_rules (tenant_id);

create trigger set_updated_at before update on financial_split_rules
  for each row execute function public.set_updated_at();

create or replace function public.enforce_split_rule_contract()
returns trigger
language plpgsql
as $$
declare
  v_tenant_id uuid;
  v_status text;
begin
  select tenant_id, status into v_tenant_id, v_status
  from financial_contracts where id = new.contract_id;

  if v_tenant_id is null then
    raise exception 'Contrato financeiro da regra não encontrado.';
  end if;

  if new.tenant_id <> v_tenant_id then
    raise exception 'tenant_id da regra de split deve bater com o contrato.';
  end if;

  if new.status = 'active' and v_status <> 'validated' then
    raise exception 'Regra ativa exige contrato financeiro validado.';
  end if;

  return new;
end;
$$;

create trigger financial_split_rules_enforce_contract
  before insert or update on financial_split_rules
  for each row execute function public.enforce_split_rule_contract();

create table payment_reconciliations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  empresa_id uuid not null references empresas(id) on delete cascade,
  cobranca_id uuid not null references cobrancas(id) on delete cascade,
  pagamento_id uuid not null unique references pagamentos(id) on delete cascade,
  payment_charge_id uuid unique references payment_charges(id) on delete set null,
  provider text,
  provider_status text,
  provider_event_id text,
  gross_amount numeric(14, 2) not null check (gross_amount > 0),
  provider_fee_amount numeric(14, 2) not null default 0 check (provider_fee_amount >= 0),
  net_amount numeric(14, 2) generated always as (gross_amount - provider_fee_amount) stored,
  status text not null default 'pending' check (status in (
    'pending', 'provider_reported', 'reconciling', 'partial', 'mismatch',
    'manual_review', 'reconciled', 'unidentified', 'reversed',
    'chargeback', 'failed_review_required'
  )),
  split_rule_id uuid references financial_split_rules(id) on delete restrict,
  split_rule_version integer,
  provider_payload jsonb not null default '{}'::jsonb,
  processing_error text,
  reconciled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table payment_reconciliations is
  'Subledger de conciliação por pagamento. Provider é source of truth de liquidação; GSBC registra status, split e divergências sem ajuste silencioso.';

create index payment_reconciliations_tenant_idx on payment_reconciliations (tenant_id);
create index payment_reconciliations_status_idx on payment_reconciliations (status);
create index payment_reconciliations_cobranca_idx on payment_reconciliations (cobranca_id);

create trigger set_updated_at before update on payment_reconciliations
  for each row execute function public.set_updated_at();

create table payment_split_items (
  id uuid primary key default gen_random_uuid(),
  reconciliation_id uuid not null references payment_reconciliations(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  beneficiary_type text not null check (beneficiary_type in ('gsbc', 'sindicato', 'terceiro')),
  beneficiary_label text not null,
  gross_share_amount numeric(14, 2) not null check (gross_share_amount >= 0),
  fee_share_amount numeric(14, 2) not null default 0 check (fee_share_amount >= 0),
  net_amount numeric(14, 2) generated always as (gross_share_amount - fee_share_amount) stored,
  status text not null default 'pending' check (status in ('pending', 'reconciled', 'repass_pending', 'repassed', 'manual_review')),
  split_rule_id uuid not null references financial_split_rules(id) on delete restrict,
  split_rule_version integer not null,
  created_at timestamptz not null default now()
);

comment on table payment_split_items is
  'Componentes de split derivados da regra versionada aplicada na conciliação. Não representa custódia direta pela GSBC.';

create index payment_split_items_reconciliation_idx on payment_split_items (reconciliation_id);
create index payment_split_items_tenant_idx on payment_split_items (tenant_id);

create table financial_repasses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  split_item_id uuid not null unique references payment_split_items(id) on delete cascade,
  beneficiary_type text not null check (beneficiary_type in ('sindicato', 'terceiro')),
  beneficiary_label text not null,
  amount numeric(14, 2) not null check (amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'scheduled', 'paid', 'failed', 'cancelled')),
  scheduled_for date,
  paid_at timestamptz,
  external_transfer_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table financial_repasses is
  'Fila de repasses derivados do split conciliado. Liquidação real depende de instituição de pagamento/conta apropriada.';

create index financial_repasses_tenant_idx on financial_repasses (tenant_id);
create index financial_repasses_status_idx on financial_repasses (status);

create trigger set_updated_at before update on financial_repasses
  for each row execute function public.set_updated_at();

create table reconciliation_divergences (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  reconciliation_id uuid references payment_reconciliations(id) on delete cascade,
  provider text,
  external_reference text,
  status text not null default 'open' check (status in ('open', 'in_review', 'resolved', 'dismissed')),
  reason text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references users(id) on delete set null
);

comment on table reconciliation_divergences is
  'Fila própria de divergências financeiras. Divergência nunca é ajustada silenciosamente.';

create index reconciliation_divergences_tenant_idx on reconciliation_divergences (tenant_id);
create index reconciliation_divergences_status_idx on reconciliation_divergences (status);

create or replace function public.enforce_reconciliation_matches_pagamento()
returns trigger
language plpgsql
as $$
declare
  v_pagamento record;
begin
  select tenant_id, empresa_id, cobranca_id, valor
    into v_pagamento
    from pagamentos where id = new.pagamento_id;

  if v_pagamento.tenant_id is null then
    raise exception 'Pagamento da conciliação não encontrado.';
  end if;

  if new.tenant_id <> v_pagamento.tenant_id
     or new.empresa_id <> v_pagamento.empresa_id
     or new.cobranca_id <> v_pagamento.cobranca_id
     or new.gross_amount <> v_pagamento.valor then
    raise exception 'Conciliação deve bater com tenant/empresa/cobrança/valor do pagamento.';
  end if;

  return new;
end;
$$;

create trigger payment_reconciliations_enforce_match
  before insert or update of tenant_id, empresa_id, cobranca_id, pagamento_id, gross_amount on payment_reconciliations
  for each row execute function public.enforce_reconciliation_matches_pagamento();

create or replace function public.reconcile_provider_payment(
  p_pagamento_id uuid,
  p_payment_charge_id uuid,
  p_provider_status text,
  p_provider_event_id text default null,
  p_provider_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pagamento record;
  v_charge record;
  v_rule record;
  v_reconciliation_id uuid;
  v_fee numeric(14, 2);
  v_gsbc_gross numeric(14, 2);
  v_terceiros_gross numeric(14, 2);
  v_sindicato_gross numeric(14, 2);
  v_gsbc_fee numeric(14, 2);
  v_terceiros_fee numeric(14, 2);
  v_sindicato_fee numeric(14, 2);
begin
  select * into v_pagamento from pagamentos where id = p_pagamento_id;
  if v_pagamento.id is null then
    raise exception 'Pagamento não encontrado para conciliação.';
  end if;

  select * into v_charge from payment_charges where id = p_payment_charge_id;
  if v_charge.id is null then
    raise exception 'Charge não encontrada para conciliação.';
  end if;

  if v_charge.pagamento_id is distinct from p_pagamento_id then
    raise exception 'Charge não aponta para o pagamento informado.';
  end if;

  select id, version, gsbc_percent, sindicato_percent, terceiros_percent, fee_policy
    into v_rule
    from financial_split_rules r
    where r.tenant_id = v_pagamento.tenant_id
      and r.status = 'active'
      and r.effective_from <= v_pagamento.data_pagamento
      and (r.effective_to is null or r.effective_to >= v_pagamento.data_pagamento)
      and exists (
        select 1 from financial_contracts c
        where c.id = r.contract_id
          and c.status = 'validated'
          and c.vigencia_inicio <= v_pagamento.data_pagamento
          and (c.vigencia_fim is null or c.vigencia_fim >= v_pagamento.data_pagamento)
      )
    order by r.effective_from desc, r.version desc
    limit 1;

  if v_rule.id is null then
    insert into payment_reconciliations (
      tenant_id, empresa_id, cobranca_id, pagamento_id, payment_charge_id,
      provider, provider_status, provider_event_id, gross_amount,
      provider_fee_amount, status, provider_payload, processing_error
    )
    values (
      v_pagamento.tenant_id, v_pagamento.empresa_id, v_pagamento.cobranca_id,
      v_pagamento.id, v_charge.id, v_charge.provider, p_provider_status,
      p_provider_event_id, v_pagamento.valor, 0, 'manual_review',
      coalesce(p_provider_payload, '{}'::jsonb),
      'Contrato financeiro validado/regra de split ativa ausente.'
    )
    on conflict (pagamento_id) do update
      set provider_status = excluded.provider_status,
          provider_event_id = excluded.provider_event_id,
          provider_payload = excluded.provider_payload
    returning id into v_reconciliation_id;

    insert into reconciliation_divergences (
      tenant_id, reconciliation_id, provider, external_reference, reason, payload
    )
    values (
      v_pagamento.tenant_id,
      v_reconciliation_id,
      v_charge.provider,
      v_charge.external_id,
      'Contrato financeiro validado/regra de split ativa ausente.',
      coalesce(p_provider_payload, '{}'::jsonb)
    )
    on conflict do nothing;

    return v_reconciliation_id;
  end if;

  v_fee := round(
    (
      v_pagamento.valor * coalesce((v_rule.fee_policy->>'provider_fee_percent')::numeric, 0) / 100
    ) + coalesce((v_rule.fee_policy->>'provider_fee_fixed')::numeric, 0),
    2
  );

  v_gsbc_gross := round(v_pagamento.valor * v_rule.gsbc_percent / 100, 2);
  v_terceiros_gross := round(v_pagamento.valor * v_rule.terceiros_percent / 100, 2);
  v_sindicato_gross := v_pagamento.valor - v_gsbc_gross - v_terceiros_gross;

  v_gsbc_fee := round(v_fee * v_rule.gsbc_percent / 100, 2);
  v_terceiros_fee := round(v_fee * v_rule.terceiros_percent / 100, 2);
  v_sindicato_fee := v_fee - v_gsbc_fee - v_terceiros_fee;

  insert into payment_reconciliations (
    tenant_id, empresa_id, cobranca_id, pagamento_id, payment_charge_id,
    provider, provider_status, provider_event_id, gross_amount,
    provider_fee_amount, status, split_rule_id, split_rule_version,
    provider_payload, reconciled_at
  )
  values (
    v_pagamento.tenant_id, v_pagamento.empresa_id, v_pagamento.cobranca_id,
    v_pagamento.id, v_charge.id, v_charge.provider, p_provider_status,
    p_provider_event_id, v_pagamento.valor, v_fee, 'reconciled',
    v_rule.id, v_rule.version, coalesce(p_provider_payload, '{}'::jsonb), now()
  )
  on conflict (pagamento_id) do update
    set provider_status = excluded.provider_status,
        provider_event_id = excluded.provider_event_id,
        provider_payload = excluded.provider_payload
  returning id into v_reconciliation_id;

  -- Replay de webhook (ex.: provider manda "confirmado" e depois
  -- "liquidado" pro mesmo pagamento, cada um com external_event_id
  -- próprio) chega aqui de novo pro mesmo pagamento. Nunca reescreve
  -- split/repasse que já saiu de 'pending' — um repasse já pago, por
  -- exemplo, não pode ser apagado e recriado como pendente (regra:
  -- histórico não pode desaparecer; nunca ajustar divergência
  -- silenciosamente). A atualização de provider_status/event_id/payload
  -- acima já aconteceu; só o recompute de split fica de fora.
  if exists (
    select 1
    from payment_split_items psi
    join financial_repasses fr on fr.split_item_id = psi.id
    where psi.reconciliation_id = v_reconciliation_id
      and fr.status <> 'pending'
  ) then
    return v_reconciliation_id;
  end if;

  delete from payment_split_items where reconciliation_id = v_reconciliation_id;

  insert into payment_split_items (
    reconciliation_id, tenant_id, beneficiary_type, beneficiary_label,
    gross_share_amount, fee_share_amount, status, split_rule_id, split_rule_version
  )
  values
    (v_reconciliation_id, v_pagamento.tenant_id, 'gsbc', 'GSBC', v_gsbc_gross, v_gsbc_fee, 'reconciled', v_rule.id, v_rule.version),
    (v_reconciliation_id, v_pagamento.tenant_id, 'sindicato', 'Entidade sindical', v_sindicato_gross, v_sindicato_fee, 'repass_pending', v_rule.id, v_rule.version);

  if v_terceiros_gross > 0 then
    insert into payment_split_items (
      reconciliation_id, tenant_id, beneficiary_type, beneficiary_label,
      gross_share_amount, fee_share_amount, status, split_rule_id, split_rule_version
    )
    values (
      v_reconciliation_id, v_pagamento.tenant_id, 'terceiro', 'Terceiros', v_terceiros_gross, v_terceiros_fee, 'repass_pending', v_rule.id, v_rule.version
    );
  end if;

  insert into financial_repasses (
    tenant_id, split_item_id, beneficiary_type, beneficiary_label, amount, status
  )
  select tenant_id, id, beneficiary_type, beneficiary_label, net_amount, 'pending'
  from payment_split_items
  where reconciliation_id = v_reconciliation_id
    and beneficiary_type in ('sindicato', 'terceiro')
  on conflict (split_item_id) do nothing;

  return v_reconciliation_id;
end;
$$;

comment on function public.reconcile_provider_payment(uuid, uuid, text, text, jsonb) is
  'Cria/atualiza conciliação idempotente de pagamento de provider, aplica regra de split versionada quando houver contrato validado e abre revisão manual quando faltar regra.';

revoke all on function public.reconcile_provider_payment(uuid, uuid, text, text, jsonb) from public;
grant execute on function public.reconcile_provider_payment(uuid, uuid, text, text, jsonb) to service_role;

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
    perform public.reconcile_provider_payment(v_charge.pagamento_id, v_charge.id, p_external_status, null, jsonb_build_object('source', 'provider_webhook_replay'));
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

  perform public.reconcile_provider_payment(v_pagamento_id, v_charge.id, p_external_status, null, jsonb_build_object('source', 'provider_webhook'));

  return v_pagamento_id;
end;
$$;

revoke all on function public.register_provider_pagamento(uuid, text, timestamptz, text) from public;
grant execute on function public.register_provider_pagamento(uuid, text, timestamptz, text) to service_role;

alter table financial_contracts enable row level security;
alter table financial_split_rules enable row level security;
alter table payment_reconciliations enable row level security;
alter table payment_split_items enable row level security;
alter table financial_repasses enable row level security;
alter table reconciliation_divergences enable row level security;

create policy financial_contracts_select on financial_contracts for select
  using (public.is_platform_staff(auth.uid()) or tenant_id in (select public.user_tenant_ids(auth.uid())));
create policy financial_contracts_insert on financial_contracts for insert
  with check (public.is_platform_staff(auth.uid()));
create policy financial_contracts_update on financial_contracts for update
  using (public.is_platform_staff(auth.uid()))
  with check (public.is_platform_staff(auth.uid()));

create policy financial_split_rules_select on financial_split_rules for select
  using (public.is_platform_staff(auth.uid()) or tenant_id in (select public.user_tenant_ids(auth.uid())));
create policy financial_split_rules_insert on financial_split_rules for insert
  with check (public.is_platform_staff(auth.uid()));
create policy financial_split_rules_update on financial_split_rules for update
  using (public.is_platform_staff(auth.uid()))
  with check (public.is_platform_staff(auth.uid()));

create policy payment_reconciliations_select on payment_reconciliations for select
  using (public.is_platform_staff(auth.uid()) or tenant_id in (select public.user_tenant_ids(auth.uid())));

create policy payment_split_items_select on payment_split_items for select
  using (public.is_platform_staff(auth.uid()) or tenant_id in (select public.user_tenant_ids(auth.uid())));

create policy financial_repasses_select on financial_repasses for select
  using (public.is_platform_staff(auth.uid()) or tenant_id in (select public.user_tenant_ids(auth.uid())));

create policy reconciliation_divergences_select on reconciliation_divergences for select
  using (public.is_platform_staff(auth.uid()));
create policy reconciliation_divergences_update on reconciliation_divergences for update
  using (public.is_platform_staff(auth.uid()))
  with check (public.is_platform_staff(auth.uid()));

grant select, insert, update on public.financial_contracts to authenticated;
grant select, insert, update on public.financial_split_rules to authenticated;
grant select on public.payment_reconciliations to authenticated;
grant select on public.payment_split_items to authenticated;
grant select on public.financial_repasses to authenticated;
grant select, update on public.reconciliation_divergences to authenticated;
