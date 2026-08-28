-- GSBC — Rodada 29: restaura a referência financeira pós Policy Engine
--
-- A Rodada 13 definiu que uma cobrança com negociação aceita é quitada
-- pelo valor acordado (`valor_referencia_cobranca`), não pelo valor
-- original. A Rodada 27 redefiniu `register_pagamento` para registrar
-- decisões de policy, mas acidentalmente voltou a comparar o total pago
-- contra `valor_cobranca`. Esta migration preserva o log de policy e
-- restaura a regra financeira canônica.

create or replace function public.register_pagamento(
  p_cobranca_id uuid,
  p_valor numeric,
  p_data_pagamento date,
  p_forma_pagamento text,
  p_observacao text default null
) returns uuid language plpgsql security invoker as $$
declare
  v_pagamento_id uuid;
  v_tenant_id uuid;
  v_empresa_id uuid;
  v_status_atual text;
  v_valor_original numeric;
  v_valor_referencia numeric;
  v_total_pago numeric;
  v_novo_status text;
  v_policy_versao integer;
begin
  select tenant_id, empresa_id, valor_cobranca, status
    into v_tenant_id, v_empresa_id, v_valor_original, v_status_atual
    from cobrancas where id = p_cobranca_id;

  if v_tenant_id is null then
    raise exception 'Cobrança não encontrada.';
  end if;

  insert into pagamentos (tenant_id, empresa_id, cobranca_id, valor, data_pagamento, forma_pagamento, observacao, registrado_por)
  values (v_tenant_id, v_empresa_id, p_cobranca_id, p_valor, p_data_pagamento, p_forma_pagamento, p_observacao, auth.uid())
  returning id into v_pagamento_id;

  v_valor_referencia := public.valor_referencia_cobranca(p_cobranca_id);
  select coalesce(sum(valor), 0) into v_total_pago from pagamentos where cobranca_id = p_cobranca_id;

  v_novo_status := case
    when v_total_pago >= v_valor_referencia then 'paid'
    else 'partially_paid'
  end;

  if v_novo_status <> v_status_atual then
    perform public.change_cobranca_status(
      p_cobranca_id,
      v_novo_status,
      'Pagamento de ' || to_char(p_valor, 'FM999999990.00') || ' registrado.'
    );

    select versao into v_policy_versao from policies where id = 'pagamento_pausa_regua';
    if v_policy_versao is not null then
      insert into policy_decisoes (policy_id, policy_versao, tenant_id, entity_type, entity_id, inputs, resultado, motivo)
      values (
        'pagamento_pausa_regua', v_policy_versao, v_tenant_id, 'cobranca', p_cobranca_id,
        jsonb_build_object(
          'valor_pago', p_valor,
          'total_pago', v_total_pago,
          'valor_original', v_valor_original,
          'valor_referencia', v_valor_referencia,
          'novo_status', v_novo_status
        ),
        v_novo_status,
        case when v_novo_status = 'paid'
          then 'Total pago cobre o valor de referência da cobrança — régua de cobrança encerrada.'
          else 'Pagamento parcial registrado — cobrança segue elegível pro saldo restante.'
        end
      );
    end if;
  end if;

  return v_pagamento_id;
end;
$$;
