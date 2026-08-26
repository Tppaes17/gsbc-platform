-- GSBC — Rodada 3: Empresas
--
-- Empresa como entidade 360º (regra 19 do prompt-mestre). Nesta rodada:
-- dados cadastrais + contatos. As demais seções da ficha 360º (instrumentos,
-- obrigações, cobranças, negociações, financeiro, documentos) chegam nas
-- rodadas 4-7 — a UI mostra placeholders honestos, não dados fictícios
-- (regra 62).
--
-- ASSUNÇÃO DE MODELAGEM (não é uma regra de negócio confirmada pelo
-- usuário; escolhida por consistência com o padrão já confirmado para
-- sindicatos): cadastro/edição de empresas é exclusivo da equipe GSBC,
-- mesmo raciocínio da regra 6 ("a GSBC executa, o sindicato acompanha") já
-- aplicada a sindicatos na Rodada 1. Sindicato tem apenas leitura das
-- empresas do próprio tenant. Revisitar se o usuário indicar o contrário.
--
-- Empresa pertence a exatamente um tenant (o sindicato sob cuja
-- jurisdição ela está) — CNPJ é único por tenant, não globalmente, pois o
-- mesmo CNPJ poderia teoricamente aparecer em carteiras de sindicatos
-- diferentes sem que isso seja um erro de dados.

create table empresas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  razao_social text not null,
  nome_fantasia text,
  cnpj text not null,
  cnae text,
  segmento text,
  enquadramento text,
  endereco jsonb,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint empresas_tenant_cnpj_unique unique (tenant_id, cnpj)
);

comment on table empresas is
  'Ficha 360º da empresa (regra 19). tenant_id = sindicato sob cuja '
  'jurisdição a empresa está. Demais seções (instrumentos, obrigações, '
  'cobranças, negociações, financeiro, documentos) chegam nas rodadas 4-7.';

create index empresas_tenant_id_idx on empresas (tenant_id);

create table empresa_contatos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  nome text not null,
  cargo text,
  email text,
  telefone text,
  principal boolean not null default false,
  created_at timestamptz not null default now()
);

create index empresa_contatos_empresa_id_idx on empresa_contatos (empresa_id);

create trigger set_updated_at before update on empresas
  for each row execute function public.set_updated_at();

-- =========================================================================
-- RLS — mesmo padrão de sindicatos: leitura para membros do tenant e staff
-- GSBC; escrita exclusiva de staff GSBC.
-- =========================================================================
alter table empresas enable row level security;

create policy empresas_select on empresas for select
  using (
    public.is_platform_staff(auth.uid())
    or tenant_id in (select public.user_tenant_ids(auth.uid()))
  );

create policy empresas_insert on empresas for insert
  with check (public.is_platform_staff(auth.uid()));

create policy empresas_update on empresas for update
  using (public.is_platform_staff(auth.uid()))
  with check (public.is_platform_staff(auth.uid()));

create policy empresas_delete on empresas for delete
  using (public.is_platform_staff(auth.uid()));

alter table empresa_contatos enable row level security;

create policy empresa_contatos_select on empresa_contatos for select
  using (
    public.is_platform_staff(auth.uid())
    or exists (
      select 1 from empresas e
      where e.id = empresa_contatos.empresa_id
        and e.tenant_id in (select public.user_tenant_ids(auth.uid()))
    )
  );

create policy empresa_contatos_insert on empresa_contatos for insert
  with check (public.is_platform_staff(auth.uid()));

create policy empresa_contatos_update on empresa_contatos for update
  using (public.is_platform_staff(auth.uid()))
  with check (public.is_platform_staff(auth.uid()));

create policy empresa_contatos_delete on empresa_contatos for delete
  using (public.is_platform_staff(auth.uid()));

-- =========================================================================
-- Grants — RLS não tem efeito sem o GRANT de base (ver bug documentado na
-- Rodada 1 / 0003_grants.sql).
-- =========================================================================
grant select, insert, update, delete on public.empresas to authenticated;
grant select, insert, update, delete on public.empresa_contatos to authenticated;
