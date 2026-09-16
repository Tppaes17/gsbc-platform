-- RF-02 — Security, grants and tenant-scoped GSBC linkage.

create unique index if not exists empresas_tenant_id_id_unique
  on public.empresas (tenant_id, id);

create table public.rf_company_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  empresa_id uuid not null,
  dataset_version_id uuid not null references rf_canonical.rf_dataset_versions(id) on delete restrict,
  rf_company_id uuid references rf_canonical.rf_companies(id) on delete restrict,
  rf_establishment_id uuid references rf_canonical.rf_establishments(id) on delete restrict,
  cnpj_canonical text not null,
  match_status text not null check (match_status in (
    'AUTO_MATCHED',
    'SUGGESTED',
    'CONFIRMED',
    'REJECTED',
    'NEEDS_REVIEW'
  )),
  match_method text not null check (match_method in (
    'CNPJ_EXACT',
    'CNPJ_ROOT',
    'LEGAL_NAME',
    'MANUAL',
    'OTHER'
  )),
  confidence numeric(5,4) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  confirmed_by uuid references public.users(id) on delete set null,
  confirmed_at timestamptz,
  rejected_by uuid references public.users(id) on delete set null,
  rejected_at timestamptz,
  rejection_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rf_company_links_empresa_tenant_fk
    foreign key (tenant_id, empresa_id)
    references public.empresas (tenant_id, id)
    on delete cascade,
  constraint rf_company_links_cnpj_format check (cnpj_canonical ~ '^[A-Z0-9]{12}[0-9]{2}$'),
  constraint rf_company_links_rf_target check (rf_company_id is not null or rf_establishment_id is not null),
  constraint rf_company_links_confirmed_state check (
    (match_status <> 'CONFIRMED' and confirmed_at is null)
    or (match_status = 'CONFIRMED' and confirmed_at is not null)
  ),
  constraint rf_company_links_rejected_state check (
    (match_status <> 'REJECTED' and rejected_at is null)
    or (match_status = 'REJECTED' and rejected_at is not null)
  )
);

comment on table public.rf_company_links is 'Tenant-scoped link between GSBC empresas and global RF canonical records. Does not alter classification, obligations or billing.';

create unique index rf_company_links_current_unique_idx
  on public.rf_company_links (tenant_id, empresa_id, dataset_version_id, cnpj_canonical)
  where match_status <> 'REJECTED';

create index rf_company_links_tenant_idx on public.rf_company_links (tenant_id);
create index rf_company_links_empresa_idx on public.rf_company_links (empresa_id);
create index rf_company_links_cnpj_idx on public.rf_company_links (cnpj_canonical);
create index rf_company_links_status_idx on public.rf_company_links (match_status);
create index rf_company_links_dataset_idx on public.rf_company_links (dataset_version_id);

create trigger set_updated_at before update on public.rf_company_links
  for each row execute function public.set_updated_at();

-- RLS: raw is private, canonical is global read-only, links are tenant-scoped.
alter table rf_raw.rf_import_staging_rows enable row level security;

alter table rf_canonical.rf_dataset_versions enable row level security;
alter table rf_canonical.rf_dataset_files enable row level security;
alter table rf_canonical.rf_sync_jobs enable row level security;
alter table rf_canonical.rf_quality_checks enable row level security;
alter table rf_canonical.rf_cnaes enable row level security;
alter table rf_canonical.rf_municipalities enable row level security;
alter table rf_canonical.rf_countries enable row level security;
alter table rf_canonical.rf_legal_natures enable row level security;
alter table rf_canonical.rf_partner_qualifications enable row level security;
alter table rf_canonical.rf_registration_status_reasons enable row level security;
alter table rf_canonical.rf_companies enable row level security;
alter table rf_canonical.rf_establishments enable row level security;
alter table rf_canonical.rf_establishment_secondary_cnaes enable row level security;
alter table rf_canonical.rf_partners enable row level security;
alter table rf_canonical.rf_simples_mei enable row level security;

create policy rf_dataset_versions_select on rf_canonical.rf_dataset_versions for select
  using (auth.role() = 'authenticated');
create policy rf_dataset_files_select on rf_canonical.rf_dataset_files for select
  using (auth.role() = 'authenticated');
create policy rf_sync_jobs_select on rf_canonical.rf_sync_jobs for select
  using (public.is_platform_staff(auth.uid()));
create policy rf_quality_checks_select on rf_canonical.rf_quality_checks for select
  using (public.is_platform_staff(auth.uid()));
create policy rf_cnaes_select on rf_canonical.rf_cnaes for select
  using (auth.role() = 'authenticated');
create policy rf_municipalities_select on rf_canonical.rf_municipalities for select
  using (auth.role() = 'authenticated');
create policy rf_countries_select on rf_canonical.rf_countries for select
  using (auth.role() = 'authenticated');
create policy rf_legal_natures_select on rf_canonical.rf_legal_natures for select
  using (auth.role() = 'authenticated');
create policy rf_partner_qualifications_select on rf_canonical.rf_partner_qualifications for select
  using (auth.role() = 'authenticated');
create policy rf_registration_status_reasons_select on rf_canonical.rf_registration_status_reasons for select
  using (auth.role() = 'authenticated');
create policy rf_companies_select on rf_canonical.rf_companies for select
  using (auth.role() = 'authenticated');
create policy rf_establishments_select on rf_canonical.rf_establishments for select
  using (auth.role() = 'authenticated');
create policy rf_establishment_secondary_cnaes_select on rf_canonical.rf_establishment_secondary_cnaes for select
  using (auth.role() = 'authenticated');
create policy rf_partners_select on rf_canonical.rf_partners for select
  using (auth.role() = 'authenticated');
create policy rf_simples_mei_select on rf_canonical.rf_simples_mei for select
  using (auth.role() = 'authenticated');

alter table public.rf_company_links enable row level security;

create policy rf_company_links_select on public.rf_company_links for select
  using (
    public.is_platform_staff(auth.uid())
    or tenant_id in (select public.user_tenant_ids(auth.uid()))
  );

create policy rf_company_links_insert on public.rf_company_links for insert
  with check (public.is_platform_staff(auth.uid()));

create policy rf_company_links_update on public.rf_company_links for update
  using (public.is_platform_staff(auth.uid()))
  with check (public.is_platform_staff(auth.uid()));

create policy rf_company_links_delete on public.rf_company_links for delete
  using (public.is_platform_staff(auth.uid()));

-- Grants. rf_raw intentionally receives no grant for anon/authenticated.
revoke all on schema rf_raw from anon, authenticated;
revoke all on all tables in schema rf_raw from anon, authenticated;

grant usage on schema rf_canonical to authenticated;

grant select on
  rf_canonical.rf_dataset_versions,
  rf_canonical.rf_dataset_files,
  rf_canonical.rf_cnaes,
  rf_canonical.rf_municipalities,
  rf_canonical.rf_countries,
  rf_canonical.rf_legal_natures,
  rf_canonical.rf_partner_qualifications,
  rf_canonical.rf_registration_status_reasons,
  rf_canonical.rf_companies,
  rf_canonical.rf_establishments,
  rf_canonical.rf_establishment_secondary_cnaes,
  rf_canonical.rf_partners,
  rf_canonical.rf_simples_mei
to authenticated;

grant select on
  rf_canonical.rf_sync_jobs,
  rf_canonical.rf_quality_checks
to authenticated;

grant select, insert, update, delete on public.rf_company_links to authenticated;

-- RF-02 verification helpers. These functions expose only invariant checks,
-- not ingestion or privileged write paths.
create or replace function public.rf02_verify_cnpj_roundtrip(p_cnpj text)
returns text
language plpgsql
stable
security definer
set search_path = public, rf_canonical
as $$
begin
  if p_cnpj !~ '^[A-Z0-9]{12}[0-9]{2}$' then
    raise exception 'invalid canonical CNPJ';
  end if;

  return p_cnpj;
end;
$$;

grant execute on function public.rf02_verify_cnpj_roundtrip(text) to authenticated;

create or replace function public.rf02_get_current_dataset_count()
returns integer
language sql
stable
security definer
set search_path = rf_canonical
as $$
  select count(*)::integer
  from rf_dataset_versions
  where is_current;
$$;

grant execute on function public.rf02_get_current_dataset_count() to authenticated;
