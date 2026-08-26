-- GSBC — Rodada 13: reconciliação entre valor negociado e valor_cobranca
--
-- Regra de negócio pendente desde a Rodada 8 (resolvida pelo usuário):
-- quando uma negociação é ACEITA com valor menor que o valor_cobranca
-- original, o valor de referência para considerar a cobrança "quitada"
-- passa a ser o valor ACORDADO (negociacoes.valor_atual), não mais o
-- valor original. O valor original de `cobrancas.valor_cobranca`
-- continua intacto — é o registro histórico do que foi cobrado; só o
-- critério de quitação muda quando existe um acordo aceito.

create or replace function public.valor_referencia_cobranca(p_cobranca_id uuid)
returns numeric
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(
    (
      select n.valor_atual
      from negociacoes n
      where n.cobranca_id = p_cobranca_id
        and n.status = 'aceita'
        and n.valor_atual is not null
    ),
    (select c.valor_cobranca from cobrancas c where c.id = p_cobranca_id)
  );
$$;

comment on function public.valor_referencia_cobranca is 'Valor a considerar para "quitação" de uma cobrança: o valor negociado (se houver negociação aceita), senão o valor_cobranca original. Usado por register_pagamento e refletido na UI (financeiro, ficha da cobrança/empresa).';

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
  v_valor_referencia numeric;
  v_total_pago numeric;
  v_novo_status text;
begin
  select tenant_id, empresa_id, status
    into v_tenant_id, v_empresa_id, v_status_atual
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
  end if;

  return v_pagamento_id;
end;
$$;

grant execute on function public.valor_referencia_cobranca(uuid) to authenticated;
