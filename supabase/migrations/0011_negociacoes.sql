-- GSBC — Rodada 7: Negociações
--
-- Propostas, contrapropostas e o desfecho (aceite/recusa) de uma cobrança
-- em negociação (regras 26-27). Mesmo padrão já validado em Cobranças
-- (Rodada 5): uma tabela de cabeçalho com status não-histórico + uma
-- tabela de eventos imutável (aqui os eventos carregam o próprio conteúdo
-- da proposta, não só a transição de status — timeline e conteúdo são a
-- mesma coisa nesta entidade).

create table negociacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  empresa_id uuid not null references empresas(id) on delete cascade,
  cobranca_id uuid not null unique references cobrancas(id) on delete cascade,
  status text not null default 'aberta' check (status in ('aberta', 'em_negociacao', 'aceita', 'recusada', 'encerrada')),
  valor_atual numeric(14, 2),
  responsavel_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table negociacoes is 'Negociação de uma cobrança: nasce de exatamente uma cobrança (mesma lógica 1:1 de cobranca:obrigacao — ver Rodada 4/5).';
comment on column negociacoes.valor_atual is 'Valor da proposta/contraproposta mais recente — atualizado só via register_negociacao_evento(), nunca editado direto.';

create table negociacao_eventos (
  id uuid primary key default gen_random_uuid(),
  negociacao_id uuid not null references negociacoes(id) on delete cascade,
  tipo text not null check (tipo in ('proposta_gsbc', 'contraproposta_empresa', 'aceite', 'recusa', 'observacao')),
  valor numeric(14, 2),
  condicoes text,
  user_id uuid references users(id),
  created_at timestamptz not null default now()
);

comment on table negociacao_eventos is 'Histórico imutável de propostas/contrapropostas/desfecho — sem policy de update/delete, mesmo padrão de cobranca_eventos.';

-- Integridade: tenant_id/empresa_id da negociação têm que bater com os da
-- cobrança de origem — mesma defesa em profundidade das rodadas anteriores.
create or replace function public.enforce_negociacao_matches_cobranca()
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
    raise exception 'tenant_id/empresa_id da negociação devem bater com os da cobrança de origem.';
  end if;

  return new;
end;
$$;

create trigger negociacoes_enforce_match
  before insert or update on negociacoes
  for each row execute function public.enforce_negociacao_matches_cobranca();

-- Único caminho para registrar uma proposta/contraproposta/desfecho:
-- grava o evento e atualiza o cabeçalho na mesma transação.
create or replace function public.register_negociacao_evento(
  p_negociacao_id uuid,
  p_tipo text,
  p_valor numeric default null,
  p_condicoes text default null
) returns uuid language plpgsql security invoker as $$
declare
  v_event_id uuid;
  v_new_status text;
begin
  v_new_status := case p_tipo
    when 'aceite' then 'aceita'
    when 'recusa' then 'recusada'
    when 'observacao' then null
    else 'em_negociacao'
  end;

  insert into negociacao_eventos (negociacao_id, tipo, valor, condicoes, user_id)
  values (p_negociacao_id, p_tipo, p_valor, p_condicoes, auth.uid())
  returning id into v_event_id;

  update negociacoes
  set
    valor_atual = coalesce(p_valor, valor_atual),
    status = coalesce(v_new_status, status),
    updated_at = now()
  where id = p_negociacao_id;

  return v_event_id;
end;
$$;

alter table negociacoes enable row level security;
alter table negociacao_eventos enable row level security;

create policy negociacoes_select on negociacoes for select
  using (public.is_platform_staff(auth.uid()) or tenant_id in (select public.user_tenant_ids(auth.uid())));

create policy negociacoes_write on negociacoes for insert
  with check (public.is_platform_staff(auth.uid()));

create policy negociacoes_update on negociacoes for update
  using (public.is_platform_staff(auth.uid()))
  with check (public.is_platform_staff(auth.uid()));

create policy negociacao_eventos_select on negociacao_eventos for select
  using (
    exists (
      select 1 from negociacoes n
      where n.id = negociacao_eventos.negociacao_id
        and (public.is_platform_staff(auth.uid()) or n.tenant_id in (select public.user_tenant_ids(auth.uid())))
    )
  );

create policy negociacao_eventos_insert on negociacao_eventos for insert
  with check (public.is_platform_staff(auth.uid()));

grant select, insert, update on public.negociacoes to authenticated;
grant select, insert on public.negociacao_eventos to authenticated;
