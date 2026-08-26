-- GSBC — Rodada 8: Financeiro (pagamentos)
--
-- Registro de pagamentos contra uma cobrança — permite pagamento parcial
-- (várias linhas em `pagamentos` até quitar `valor_cobranca`). Ledger
-- imutável, mesmo espírito de cobranca_eventos/negociacao_eventos: uma
-- correção não edita uma linha existente, entra como um novo registro
-- (estorno) — não implementado nesta rodada, ver Pendências no rodada-08.

create table pagamentos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  empresa_id uuid not null references empresas(id) on delete cascade,
  cobranca_id uuid not null references cobrancas(id) on delete cascade,
  valor numeric(14, 2) not null check (valor > 0),
  data_pagamento date not null,
  forma_pagamento text not null check (forma_pagamento in ('pix', 'boleto', 'transferencia', 'outro')),
  observacao text,
  registrado_por uuid references users(id),
  created_at timestamptz not null default now()
);

comment on table pagamentos is 'Ledger imutável de pagamentos contra uma cobrança — várias linhas até quitar valor_cobranca (pagamento parcial).';

create index pagamentos_cobranca_id_idx on pagamentos (cobranca_id);

-- Integridade: tenant_id/empresa_id do pagamento têm que bater com os da
-- cobrança de origem — mesma defesa em profundidade das rodadas anteriores.
create or replace function public.enforce_pagamento_matches_cobranca()
returns trigger language plpgsql as $$
declare
  v_tenant_id uuid;
  v_empresa_id uuid;
begin
  select tenant_id, empresa_id into v_tenant_id, v_empresa_id
  from cobrancas where id = new.cobranca_id;

  if v_tenant_id is null then
    raise exception 'Cobrança de origem não encontrada.';
  end if;

  if new.tenant_id <> v_tenant_id or new.empresa_id <> v_empresa_id then
    raise exception 'tenant_id/empresa_id do pagamento devem bater com os da cobrança de origem.';
  end if;

  return new;
end;
$$;

create trigger pagamentos_enforce_match
  before insert on pagamentos
  for each row execute function public.enforce_pagamento_matches_cobranca();

-- Único caminho para registrar um pagamento: grava a linha e recalcula o
-- status da cobrança (paga / parcialmente paga) na mesma transação,
-- reaproveitando change_cobranca_status (Rodada 5) para que a mudança de
-- status também gere o evento correspondente na timeline da cobrança.
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
  v_valor_cobranca numeric;
  v_status_atual text;
  v_total_pago numeric;
  v_novo_status text;
begin
  select tenant_id, empresa_id, valor_cobranca, status
    into v_tenant_id, v_empresa_id, v_valor_cobranca, v_status_atual
    from cobrancas where id = p_cobranca_id;

  if v_tenant_id is null then
    raise exception 'Cobrança não encontrada.';
  end if;

  insert into pagamentos (tenant_id, empresa_id, cobranca_id, valor, data_pagamento, forma_pagamento, observacao, registrado_por)
  values (v_tenant_id, v_empresa_id, p_cobranca_id, p_valor, p_data_pagamento, p_forma_pagamento, p_observacao, auth.uid())
  returning id into v_pagamento_id;

  select coalesce(sum(valor), 0) into v_total_pago from pagamentos where cobranca_id = p_cobranca_id;

  v_novo_status := case
    when v_total_pago >= v_valor_cobranca then 'paid'
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

alter table pagamentos enable row level security;

create policy pagamentos_select on pagamentos for select
  using (public.is_platform_staff(auth.uid()) or tenant_id in (select public.user_tenant_ids(auth.uid())));

create policy pagamentos_insert on pagamentos for insert
  with check (public.is_platform_staff(auth.uid()));

grant select, insert on public.pagamentos to authenticated;
