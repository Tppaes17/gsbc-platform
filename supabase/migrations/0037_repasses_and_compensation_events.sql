-- GSBC — Revenue Core Phase 4: repasses e eventos compensatórios
--
-- Repasses mudam de estado por RPC auditável. Estorno/chargeback/crédito
-- entram como evento compensatório append-only; o pagamento original não
-- é apagado nem reescrito.

create table payment_compensation_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  reconciliation_id uuid not null references payment_reconciliations(id) on delete cascade,
  payment_charge_id uuid references payment_charges(id) on delete set null,
  pagamento_id uuid not null references pagamentos(id) on delete cascade,
  event_type text not null check (event_type in ('refund', 'chargeback', 'credit', 'reversal')),
  amount numeric(14, 2) not null check (amount > 0),
  reason text not null,
  provider_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table payment_compensation_events is
  'Eventos compensatórios financeiros append-only. Estorno/chargeback/crédito nunca apagam pagamento, conciliação ou split original.';

create index payment_compensation_events_tenant_idx on payment_compensation_events (tenant_id);
create index payment_compensation_events_reconciliation_idx on payment_compensation_events (reconciliation_id);

alter table payment_compensation_events enable row level security;

create policy payment_compensation_events_select on payment_compensation_events for select
  using (public.is_platform_staff(auth.uid()) or tenant_id in (select public.user_tenant_ids(auth.uid())));

create or replace function public.transition_financial_repasse(
  p_repasse_id uuid,
  p_status text,
  p_scheduled_for date default null,
  p_external_transfer_id text default null,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_repasse record;
begin
  v_actor_id := auth.uid();

  if v_actor_id is null or not public.is_platform_staff(v_actor_id) then
    raise exception 'Apenas staff GSBC pode alterar repasses financeiros.';
  end if;

  if p_status not in ('scheduled', 'paid', 'failed', 'cancelled') then
    raise exception 'Status de repasse inválido.';
  end if;

  select *
    into v_repasse
    from financial_repasses
    where id = p_repasse_id
    for update;

  if v_repasse.id is null then
    raise exception 'Repasse financeiro não encontrado.';
  end if;

  if v_repasse.status = 'paid' then
    raise exception 'Repasse pago não pode ser alterado; use evento compensatório.';
  end if;

  if p_status = 'scheduled' and p_scheduled_for is null then
    raise exception 'Agendamento exige data prevista.';
  end if;

  if p_status = 'paid' and nullif(trim(coalesce(p_external_transfer_id, '')), '') is null then
    raise exception 'Marcar repasse como pago exige identificador externo da transferência.';
  end if;

  update financial_repasses
     set status = p_status,
         scheduled_for = case
           when p_status = 'scheduled' then p_scheduled_for
           when p_status in ('cancelled', 'failed') then null
           else scheduled_for
         end,
         paid_at = case when p_status = 'paid' then now() else paid_at end,
         external_transfer_id = case
           when p_status = 'paid' then p_external_transfer_id
           else external_transfer_id
         end,
         metadata = metadata || jsonb_build_object(
           'last_transition_status', p_status,
           'last_transition_reason', p_reason,
           'last_transition_by', v_actor_id,
           'last_transition_at', now()
         )
   where id = v_repasse.id;

  return v_repasse.id;
end;
$$;

comment on function public.transition_financial_repasse(uuid, text, date, text, text) is
  'Transiciona repasse financeiro sem executar transferência real; pagamento efetivo exige referência externa registrada.';

revoke all on function public.transition_financial_repasse(uuid, text, date, text, text) from public;
grant execute on function public.transition_financial_repasse(uuid, text, date, text, text) to authenticated;

create or replace function public.register_payment_compensation_event(
  p_reconciliation_id uuid,
  p_event_type text,
  p_amount numeric,
  p_reason text,
  p_provider_reference text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_reconciliation record;
  v_event_id uuid;
  v_new_status text;
  v_has_non_pending_repasse boolean;
begin
  v_actor_id := auth.uid();

  if v_actor_id is null or not public.is_platform_staff(v_actor_id) then
    raise exception 'Apenas staff GSBC pode registrar evento compensatório financeiro.';
  end if;

  if p_event_type not in ('refund', 'chargeback', 'credit', 'reversal') then
    raise exception 'Tipo de evento compensatório inválido.';
  end if;

  if p_amount <= 0 then
    raise exception 'Valor do evento compensatório deve ser positivo.';
  end if;

  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'Evento compensatório exige justificativa.';
  end if;

  select *
    into v_reconciliation
    from payment_reconciliations
    where id = p_reconciliation_id
    for update;

  if v_reconciliation.id is null then
    raise exception 'Conciliação financeira não encontrada.';
  end if;

  if p_amount > v_reconciliation.gross_amount then
    raise exception 'Evento compensatório não pode exceder o valor bruto conciliado.';
  end if;

  v_new_status := case
    when p_event_type = 'chargeback' then 'chargeback'
    when p_event_type in ('refund', 'reversal') then 'reversed'
    else 'failed_review_required'
  end;

  select exists (
    select 1
    from payment_split_items psi
    join financial_repasses fr on fr.split_item_id = psi.id
    where psi.reconciliation_id = v_reconciliation.id
      and fr.status <> 'pending'
  ) into v_has_non_pending_repasse;

  insert into payment_compensation_events (
    tenant_id, reconciliation_id, payment_charge_id, pagamento_id,
    event_type, amount, reason, provider_reference, metadata, created_by
  )
  values (
    v_reconciliation.tenant_id,
    v_reconciliation.id,
    v_reconciliation.payment_charge_id,
    v_reconciliation.pagamento_id,
    p_event_type,
    p_amount,
    p_reason,
    p_provider_reference,
    coalesce(p_metadata, '{}'::jsonb),
    v_actor_id
  )
  returning id into v_event_id;

  update financial_repasses fr
     set status = 'cancelled',
         scheduled_for = null,
         metadata = fr.metadata || jsonb_build_object(
           'cancelled_by_compensation_event_id', v_event_id,
           'cancelled_by', v_actor_id,
           'cancelled_at', now()
         )
    from payment_split_items psi
   where fr.split_item_id = psi.id
     and psi.reconciliation_id = v_reconciliation.id
     and fr.status = 'pending';

  update payment_charges
     set status = case
       when p_event_type in ('refund', 'reversal') then 'refunded'
       else status
     end,
         external_status = coalesce(p_provider_reference, external_status)
   where id = v_reconciliation.payment_charge_id
     and p_event_type in ('refund', 'reversal');

  update payment_reconciliations
     set status = case when v_has_non_pending_repasse then 'failed_review_required' else v_new_status end,
         processing_error = case
           when v_has_non_pending_repasse then 'Evento compensatório registrado após repasse não-pendente; exige revisão manual.'
           else p_reason
         end
   where id = v_reconciliation.id;

  if v_has_non_pending_repasse then
    insert into reconciliation_divergences (
      tenant_id, reconciliation_id, provider, external_reference, reason, payload
    )
    values (
      v_reconciliation.tenant_id,
      v_reconciliation.id,
      v_reconciliation.provider,
      p_provider_reference,
      'Evento compensatório registrado após repasse não-pendente; exige revisão manual.',
      jsonb_build_object(
        'compensation_event_id', v_event_id,
        'event_type', p_event_type,
        'amount', p_amount
      )
    );
  end if;

  return v_event_id;
end;
$$;

comment on function public.register_payment_compensation_event(uuid, text, numeric, text, text, jsonb) is
  'Registra evento financeiro compensatório append-only e atualiza estado de conciliação sem apagar pagamento original.';

revoke all on function public.register_payment_compensation_event(uuid, text, numeric, text, text, jsonb) from public;
grant execute on function public.register_payment_compensation_event(uuid, text, numeric, text, text, jsonb) to authenticated;

grant select on public.payment_compensation_events to authenticated;
