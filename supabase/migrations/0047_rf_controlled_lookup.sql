-- RF-03B.3 - Read-only product bridge for the controlled RF dataset.
-- The function exposes one exact CNPJ snapshot through the public API while
-- preserving the canonical schema as read-only and globally scoped.

create or replace function public.rf_controlled_company_lookup(p_cnpj text)
returns jsonb
language sql
stable
security invoker
set search_path = public, rf_canonical
as $$
  with current_dataset as (
    select
      id,
      dataset_version,
      competence_month,
      source,
      source_url,
      manifest_hash,
      published_at,
      metadata
    from rf_canonical.rf_dataset_versions
    where is_current = true
      and status = 'PUBLISHED'
    limit 1
  ),
  establishment as (
    select e.*
    from rf_canonical.rf_establishments e
    join current_dataset d on d.id = e.dataset_version_id
    where e.cnpj_canonical = upper(trim(p_cnpj))
    limit 1
  ),
  company as (
    select c.*
    from rf_canonical.rf_companies c
    join establishment e on e.rf_company_id = c.id
    limit 1
  ),
  simples as (
    select s.*
    from rf_canonical.rf_simples_mei s
    join current_dataset d on d.id = s.dataset_version_id
    join establishment e on e.cnpj_root = s.cnpj_root
    limit 1
  )
  select jsonb_build_object(
    'dataset', (select to_jsonb(d) from current_dataset d),
    'establishment', (select to_jsonb(e) from establishment e),
    'company', (select to_jsonb(c) from company c),
    'simples_mei', (select to_jsonb(s) from simples s)
  );
$$;

comment on function public.rf_controlled_company_lookup(text) is
  'Read-only exact CNPJ lookup against the currently published controlled RF dataset. Returns source snapshot data only; it makes no legal or tenant-scoped decision.';

revoke all on function public.rf_controlled_company_lookup(text) from public, anon;
grant execute on function public.rf_controlled_company_lookup(text) to authenticated;

