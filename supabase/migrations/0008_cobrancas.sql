-- GSBC — Rodada 5: Cobranças
--
-- Cobrança é a ação operacional para buscar a regularização de uma
-- obrigação — não confundir com a obrigação em si (regra 22). Modelo:
--   Obrigação -> Cobrança -> (eventos de status, regra 24) -> Timeline (regra 25)
--
-- Mesma assunção de modelagem das rodadas 2-4: cadastro/gestão é exclusivo
-- da equipe GSBC ("a GSBC executa" — regra 6); sindicato tem leitura.
--
-- P0 desta rodada: uma cobrança nasce de exatamente uma obrigação (relação
-- 1:1) — cada obrigação já representa uma ocorrência específica (tem seu
-- próprio período/vencimento, regra 21), não um template recorrente.
-- PENDING BUSINESS RULE (regra 21: "prever outras origens válidas quando
-- necessárias"): se uma cobrança precisar existir sem obrigação de origem
-- (ex.: cobrança avulsa), obrigacao_id deveria virar opcional — não
-- implementado agora por falta de caso de uso concreto.

create extension if not exists "pgcrypto";

-- =========================================================================
-- cobrancas (regra 23)
-- =========================================================================
create table cobrancas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  empresa_id uuid not null references empresas(id) on delete restrict,
  obrigacao_id uuid not null references obrigacoes(id) on delete restrict,
  valor_principal numeric(14, 2) not null,
  valor_atualizacao numeric(14, 2) not null default 0,
  valor_cobranca numeric(14, 2)
    generated always as (valor_principal + valor_atualizacao) stored,
  vencimento date,
  prioridade text not null default 'medium'
    check (prioridade in ('low', 'medium', 'high')),
  responsavel_id uuid references users(id) on delete set null,
  status text not null default 'draft'
    check (status in (
      'draft', 'pending_validation', 'approved', 'notified', 'contacted',
      'negotiating', 'agreement_reached', 'partially_paid', 'paid',
      'overdue', 'suspended', 'cancelled', 'legal_escalation', 'closed'
    )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cobrancas_obrigacao_id_unique unique (obrigacao_id)
);

comment on table cobrancas is
  'Ação operacional de regularização de uma obrigação (regra 22). Status '
  'não é histórico — toda mudança gera um cobranca_eventos (regra 24).';

create index cobrancas_tenant_id_idx on cobrancas (tenant_id);
create index cobrancas_empresa_id_idx on cobrancas (empresa_id);
create index cobrancas_status_idx on cobrancas (status);

create trigger set_updated_at before update on cobrancas
  for each row execute function public.set_updated_at();

-- Integridade: tenant_id/empresa_id da cobrança devem bater com os da
-- obrigação de origem — mesmo padrão de defesa em profundidade da Rodada 4.
create or replace function public.enforce_cobranca_matches_obrigacao()
returns trigger
language plpgsql
as $$
declare
  v_obrigacao_tenant_id uuid;
  v_obrigacao_empresa_id uuid;
begin
  select tenant_id, empresa_id into v_obrigacao_tenant_id, v_obrigacao_empresa_id
  from obrigacoes where id = new.obrigacao_id;

  if v_obrigacao_tenant_id is null then
    raise exception 'Obrigação inexistente para a cobrança.';
  end if;

  if v_obrigacao_tenant_id is distinct from new.tenant_id
     or v_obrigacao_empresa_id is distinct from new.empresa_id then
    raise exception
      'tenant_id/empresa_id da cobrança devem ser os mesmos da obrigação de origem.';
  end if;

  return new;
end;
$$;

create trigger enforce_cobranca_matches_obrigacao
  before insert or update of obrigacao_id, tenant_id, empresa_id on cobrancas
  for each row execute function public.enforce_cobranca_matches_obrigacao();

-- =========================================================================
-- cobranca_eventos (regra 24 — status não é histórico)
-- =========================================================================
create table cobranca_eventos (
  id uuid primary key default gen_random_uuid(),
  cobranca_id uuid not null references cobrancas(id) on delete cascade,
  from_status text,
  to_status text not null,
  user_id uuid references users(id) on delete set null,
  reason text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

comment on table cobranca_eventos is
  'Histórico imutável de mudanças de status — alimenta a timeline da '
  'cobrança (regra 25). Inserção via public.change_cobranca_status ou '
  'diretamente na criação da cobrança.';

create index cobranca_eventos_cobranca_id_idx on cobranca_eventos (cobranca_id, created_at);

-- =========================================================================
-- change_cobranca_status: único caminho para mudar o status de uma
-- cobrança — atualiza a linha e registra o evento na mesma transação.
-- SECURITY INVOKER (padrão): RLS de cobrancas/cobranca_eventos do chamador
-- continua valendo (só staff GSBC).
-- =========================================================================
create or replace function public.change_cobranca_status(
  p_cobranca_id uuid,
  p_new_status text,
  p_reason text default null
)
returns uuid
language plpgsql
as $$
declare
  v_old_status text;
  v_event_id uuid;
begin
  select status into v_old_status from cobrancas where id = p_cobranca_id;

  if v_old_status is null then
    raise exception 'Cobrança não encontrada.';
  end if;

  update cobrancas set status = p_new_status where id = p_cobranca_id;

  insert into cobranca_eventos (cobranca_id, from_status, to_status, user_id, reason)
  values (p_cobranca_id, v_old_status, p_new_status, auth.uid(), p_reason)
  returning id into v_event_id;

  return v_event_id;
end;
$$;

grant execute on function public.change_cobranca_status(uuid, text, text) to authenticated;

-- =========================================================================
-- RLS — mesmo padrão de instrumentos/empresas: leitura staff GSBC + membros
-- do tenant; escrita exclusiva de staff GSBC.
-- =========================================================================
alter table cobrancas enable row level security;

create policy cobrancas_select on cobrancas for select
  using (
    public.is_platform_staff(auth.uid())
    or tenant_id in (select public.user_tenant_ids(auth.uid()))
  );

create policy cobrancas_insert on cobrancas for insert
  with check (public.is_platform_staff(auth.uid()));

create policy cobrancas_update on cobrancas for update
  using (public.is_platform_staff(auth.uid()))
  with check (public.is_platform_staff(auth.uid()));

create policy cobrancas_delete on cobrancas for delete
  using (public.is_platform_staff(auth.uid()));

alter table cobranca_eventos enable row level security;

create policy cobranca_eventos_select on cobranca_eventos for select
  using (
    public.is_platform_staff(auth.uid())
    or exists (
      select 1 from cobrancas c
      where c.id = cobranca_eventos.cobranca_id
        and c.tenant_id in (select public.user_tenant_ids(auth.uid()))
    )
  );

create policy cobranca_eventos_insert on cobranca_eventos for insert
  with check (public.is_platform_staff(auth.uid()));

-- Sem policy de update/delete: histórico imutável por construção.

-- =========================================================================
-- Grants
-- =========================================================================
grant select, insert, update, delete on public.cobrancas to authenticated;
grant select, insert on public.cobranca_eventos to authenticated;
