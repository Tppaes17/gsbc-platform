-- GSBC — Rodada 4: Instrumentos e obrigações
--
-- Modelo (regras 20-22 do prompt-mestre):
--   Instrumento -> Cláusula -> Obrigação
-- Obrigação é "o que deveria ser cumprido" — a Cobrança (Rodada 5) é a ação
-- operacional para buscar a regularização. Não confundir as duas (regra 22).
--
-- Mesma assunção de modelagem das rodadas 2-3: cadastro/edição é exclusivo
-- da equipe GSBC; sindicato tem leitura. Ver nota em 0006_empresas.sql.

create extension if not exists "pgcrypto";

-- =========================================================================
-- instrumentos (CCT, ACT, termo aditivo, outros — regra 20)
-- =========================================================================
create table instrumentos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  empresa_id uuid references empresas(id) on delete set null,
  tipo text not null check (tipo in ('cct', 'act', 'termo_aditivo', 'outro')),
  numero text,
  titulo text not null,
  data_base date,
  vigencia_inicio date,
  vigencia_fim date,
  origem text,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'expired', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table instrumentos is
  'Instrumento coletivo (CCT/ACT/termo aditivo). empresa_id preenchido só '
  'para ACT vinculado a uma empresa específica; nulo para CCT amplo (regra 20).';

create index instrumentos_tenant_id_idx on instrumentos (tenant_id);
create index instrumentos_empresa_id_idx on instrumentos (empresa_id);

create trigger set_updated_at before update on instrumentos
  for each row execute function public.set_updated_at();

-- =========================================================================
-- clausulas
-- =========================================================================
create table clausulas (
  id uuid primary key default gen_random_uuid(),
  instrumento_id uuid not null references instrumentos(id) on delete cascade,
  numero text,
  titulo text not null,
  texto text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clausulas_instrumento_id_idx on clausulas (instrumento_id);

create trigger set_updated_at before update on clausulas
  for each row execute function public.set_updated_at();

-- =========================================================================
-- obrigacoes (regra 21 — fundamento, descrição, periodicidade, período,
-- vencimento, critérios, documentação, status, validação)
-- tenant_id é denormalizado (igual audit_logs) para RLS simples e rápida —
-- toda obrigação nasce de um instrumento do mesmo tenant.
-- =========================================================================
create table obrigacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  instrumento_id uuid not null references instrumentos(id) on delete restrict,
  clausula_id uuid references clausulas(id) on delete set null,
  empresa_id uuid not null references empresas(id) on delete restrict,
  fundamento text,
  descricao text not null,
  periodicidade text not null default 'unica'
    check (periodicidade in ('unica', 'mensal', 'anual', 'outra')),
  periodo_inicio date,
  periodo_fim date,
  vencimento date,
  valor_referencia numeric(14, 2),
  status text not null default 'pending_validation'
    check (status in (
      'pending_validation', 'validated', 'contested', 'fulfilled', 'cancelled'
    )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table obrigacoes is
  'O que deveria ser cumprido pela empresa, originado de uma cláusula/'
  'instrumento (regra 21). Não confundir com cobrança (regra 22) — a ação '
  'operacional de buscar a regularização chega na Rodada 5.';

create index obrigacoes_tenant_id_idx on obrigacoes (tenant_id);
create index obrigacoes_instrumento_id_idx on obrigacoes (instrumento_id);
create index obrigacoes_empresa_id_idx on obrigacoes (empresa_id);

create trigger set_updated_at before update on obrigacoes
  for each row execute function public.set_updated_at();

-- Integridade: empresa_id do instrumento (quando preenchido) deve ser o
-- mesmo da obrigação — evita uma obrigação de ACT apontar para empresa
-- diferente da que o próprio instrumento restringe.
create or replace function public.enforce_obrigacao_empresa_matches_instrumento()
returns trigger
language plpgsql
as $$
declare
  v_instrumento_empresa_id uuid;
  v_instrumento_tenant_id uuid;
begin
  select empresa_id, tenant_id into v_instrumento_empresa_id, v_instrumento_tenant_id
  from instrumentos where id = new.instrumento_id;

  if v_instrumento_tenant_id is distinct from new.tenant_id then
    raise exception 'tenant_id da obrigação deve ser o mesmo do instrumento.';
  end if;

  if v_instrumento_empresa_id is not null
     and v_instrumento_empresa_id is distinct from new.empresa_id then
    raise exception
      'Obrigação deve referenciar a mesma empresa do instrumento (ACT restrito).';
  end if;

  return new;
end;
$$;

create trigger enforce_obrigacao_empresa_matches_instrumento
  before insert or update of instrumento_id, empresa_id, tenant_id on obrigacoes
  for each row execute function public.enforce_obrigacao_empresa_matches_instrumento();

-- =========================================================================
-- RLS — mesmo padrão de empresas/sindicatos: leitura staff GSBC + membros
-- do tenant; escrita exclusiva de staff GSBC.
-- =========================================================================
alter table instrumentos enable row level security;

create policy instrumentos_select on instrumentos for select
  using (
    public.is_platform_staff(auth.uid())
    or tenant_id in (select public.user_tenant_ids(auth.uid()))
  );

create policy instrumentos_insert on instrumentos for insert
  with check (public.is_platform_staff(auth.uid()));

create policy instrumentos_update on instrumentos for update
  using (public.is_platform_staff(auth.uid()))
  with check (public.is_platform_staff(auth.uid()));

create policy instrumentos_delete on instrumentos for delete
  using (public.is_platform_staff(auth.uid()));

alter table clausulas enable row level security;

create policy clausulas_select on clausulas for select
  using (
    public.is_platform_staff(auth.uid())
    or exists (
      select 1 from instrumentos i
      where i.id = clausulas.instrumento_id
        and i.tenant_id in (select public.user_tenant_ids(auth.uid()))
    )
  );

create policy clausulas_insert on clausulas for insert
  with check (public.is_platform_staff(auth.uid()));

create policy clausulas_update on clausulas for update
  using (public.is_platform_staff(auth.uid()))
  with check (public.is_platform_staff(auth.uid()));

create policy clausulas_delete on clausulas for delete
  using (public.is_platform_staff(auth.uid()));

alter table obrigacoes enable row level security;

create policy obrigacoes_select on obrigacoes for select
  using (
    public.is_platform_staff(auth.uid())
    or tenant_id in (select public.user_tenant_ids(auth.uid()))
  );

create policy obrigacoes_insert on obrigacoes for insert
  with check (public.is_platform_staff(auth.uid()));

create policy obrigacoes_update on obrigacoes for update
  using (public.is_platform_staff(auth.uid()))
  with check (public.is_platform_staff(auth.uid()));

create policy obrigacoes_delete on obrigacoes for delete
  using (public.is_platform_staff(auth.uid()));

-- =========================================================================
-- Grants
-- =========================================================================
grant select, insert, update, delete on public.instrumentos to authenticated;
grant select, insert, update, delete on public.clausulas to authenticated;
grant select, insert, update, delete on public.obrigacoes to authenticated;
