-- GSBC — Revenue Core Phase 3: central operacional de conciliação
--
-- Reprocessa conciliações em revisão manual quando contrato/regra passam
-- a existir. A operação é transacional e bloqueia recalcular qualquer
-- conciliação que já tenha repasse fora de pending.

create or replace function public.retry_manual_payment_reconciliation(
  p_reconciliation_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid;
  v_reconciliation record;
  v_pagamento record;
  v_rule record;
  v_fee numeric(14, 2);
  v_gsbc_gross numeric(14, 2);
  v_terceiros_gross numeric(14, 2);
  v_sindicato_gross numeric(14, 2);
  v_gsbc_fee numeric(14, 2);
  v_terceiros_fee numeric(14, 2);
  v_sindicato_fee numeric(14, 2);
begin
  v_actor_id := auth.uid();

  if v_actor_id is null or not public.is_platform_staff(v_actor_id) then
    raise exception 'Apenas staff GSBC pode reprocessar conciliação financeira.';
  end if;

  select *
    into v_reconciliation
    from payment_reconciliations
    where id = p_reconciliation_id
    for update;

  if v_reconciliation.id is null then
    raise exception 'Conciliação financeira não encontrada.';
  end if;

  if v_reconciliation.status not in ('manual_review', 'failed_review_required', 'mismatch', 'partial', 'unidentified') then
    raise exception 'Somente conciliações pendentes de decisão manual podem ser reprocessadas.';
  end if;

  if exists (
    select 1
    from payment_split_items psi
    join financial_repasses fr on fr.split_item_id = psi.id
    where psi.reconciliation_id = v_reconciliation.id
      and fr.status <> 'pending'
  ) then
    raise exception 'Conciliação com repasse não-pendente não pode ser recalculada.';
  end if;

  select *
    into v_pagamento
    from pagamentos
    where id = v_reconciliation.pagamento_id
    for update;

  if v_pagamento.id is null then
    raise exception 'Pagamento da conciliação não encontrado.';
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
    update payment_reconciliations
       set status = 'manual_review',
           processing_error = 'Contrato financeiro validado/regra de split ativa ausente.'
     where id = v_reconciliation.id;

    raise exception 'Contrato financeiro validado/regra de split ativa ausente.';
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

  delete from payment_split_items where reconciliation_id = v_reconciliation.id;

  update payment_reconciliations
     set provider_fee_amount = v_fee,
         status = 'reconciled',
         split_rule_id = v_rule.id,
         split_rule_version = v_rule.version,
         processing_error = null,
         reconciled_at = now()
   where id = v_reconciliation.id;

  insert into payment_split_items (
    reconciliation_id, tenant_id, beneficiary_type, beneficiary_label,
    gross_share_amount, fee_share_amount, status, split_rule_id, split_rule_version
  )
  values
    (v_reconciliation.id, v_pagamento.tenant_id, 'gsbc', 'GSBC', v_gsbc_gross, v_gsbc_fee, 'reconciled', v_rule.id, v_rule.version),
    (v_reconciliation.id, v_pagamento.tenant_id, 'sindicato', 'Entidade sindical', v_sindicato_gross, v_sindicato_fee, 'repass_pending', v_rule.id, v_rule.version);

  if v_terceiros_gross > 0 then
    insert into payment_split_items (
      reconciliation_id, tenant_id, beneficiary_type, beneficiary_label,
      gross_share_amount, fee_share_amount, status, split_rule_id, split_rule_version
    )
    values (
      v_reconciliation.id, v_pagamento.tenant_id, 'terceiro', 'Terceiros', v_terceiros_gross, v_terceiros_fee, 'repass_pending', v_rule.id, v_rule.version
    );
  end if;

  insert into financial_repasses (
    tenant_id, split_item_id, beneficiary_type, beneficiary_label, amount, status
  )
  select tenant_id, id, beneficiary_type, beneficiary_label, net_amount, 'pending'
  from payment_split_items
  where reconciliation_id = v_reconciliation.id
    and beneficiary_type in ('sindicato', 'terceiro')
  on conflict (split_item_id) do nothing;

  update reconciliation_divergences
     set status = 'resolved',
         resolved_at = now(),
         resolved_by = v_actor_id
   where reconciliation_id = v_reconciliation.id
     and status in ('open', 'in_review');

  return v_reconciliation.id;
end;
$$;

comment on function public.retry_manual_payment_reconciliation(uuid) is
  'Reprocessa conciliação em revisão manual aplicando contrato/regra de split ativa, fechando divergências relacionadas quando resolvida.';

revoke all on function public.retry_manual_payment_reconciliation(uuid) from public;
grant execute on function public.retry_manual_payment_reconciliation(uuid) to authenticated;
