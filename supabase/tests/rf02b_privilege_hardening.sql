-- RF-02B privilege hardening regression tests.
-- Synthetic data and probe objects are rolled back.

begin;

set local role postgres;

do $$
begin
  if has_table_privilege('anon', 'public.rf_company_links', 'select')
    or has_table_privilege('anon', 'public.rf_company_links', 'insert')
    or has_table_privilege('anon', 'public.rf_company_links', 'update')
    or has_table_privilege('anon', 'public.rf_company_links', 'delete')
    or has_table_privilege('anon', 'public.rf_company_links', 'truncate')
    or has_table_privilege('anon', 'public.rf_company_links', 'references')
    or has_table_privilege('anon', 'public.rf_company_links', 'trigger')
  then
    raise exception 'anon retains a privilege on rf_company_links';
  end if;

  if not has_table_privilege('authenticated', 'public.rf_company_links', 'select')
    or not has_table_privilege('authenticated', 'public.rf_company_links', 'insert')
    or not has_table_privilege('authenticated', 'public.rf_company_links', 'update')
    or not has_table_privilege('authenticated', 'public.rf_company_links', 'delete')
  then
    raise exception 'authenticated is missing an RLS-gated CRUD privilege';
  end if;

  if has_table_privilege('authenticated', 'public.rf_company_links', 'truncate')
    or has_table_privilege('authenticated', 'public.rf_company_links', 'references')
    or has_table_privilege('authenticated', 'public.rf_company_links', 'trigger')
  then
    raise exception 'authenticated retains a structural table privilege';
  end if;

  if has_function_privilege('anon', 'public.rf02_verify_cnpj_roundtrip(text)', 'execute')
    or has_function_privilege('anon', 'public.rf02_get_current_dataset_count()', 'execute')
    or has_function_privilege('authenticated', 'public.rf02_verify_cnpj_roundtrip(text)', 'execute')
    or has_function_privilege('authenticated', 'public.rf02_get_current_dataset_count()', 'execute')
  then
    raise exception 'user-facing role retains RF helper execute';
  end if;

  if not has_function_privilege('service_role', 'public.rf02_verify_cnpj_roundtrip(text)', 'execute')
    or not has_function_privilege('service_role', 'public.rf02_get_current_dataset_count()', 'execute')
  then
    raise exception 'service_role is missing RF helper execute';
  end if;

  if has_schema_privilege('anon', 'rf_raw', 'usage')
    or has_schema_privilege('authenticated', 'rf_raw', 'usage')
    or has_table_privilege('anon', 'rf_raw.rf_import_staging_rows', 'select')
    or has_table_privilege('authenticated', 'rf_raw.rf_import_staging_rows', 'select')
  then
    raise exception 'raw schema is exposed to a user-facing role';
  end if;

  if not has_schema_privilege('service_role', 'rf_raw', 'usage')
    or not has_schema_privilege('service_role', 'rf_canonical', 'usage')
    or not has_table_privilege('service_role', 'rf_raw.rf_import_staging_rows', 'insert')
    or not has_table_privilege('service_role', 'rf_canonical.rf_dataset_versions', 'insert')
  then
    raise exception 'service_role is missing RF pipeline privileges';
  end if;
end;
$$;

-- Prove future objects no longer inherit user-facing access.
create table public.rf02b_public_table_probe (id bigint);
create function public.rf02b_public_function_probe()
returns integer language sql as 'select 1';

create table rf_raw.rf02b_raw_table_probe (id bigint);
create function rf_raw.rf02b_raw_function_probe()
returns integer language sql as 'select 1';

create table rf_canonical.rf02b_canonical_table_probe (id bigint);
create function rf_canonical.rf02b_canonical_function_probe()
returns integer language sql as 'select 1';

do $$
begin
  if has_table_privilege('anon', 'public.rf02b_public_table_probe', 'select')
    or has_table_privilege('authenticated', 'public.rf02b_public_table_probe', 'select')
    or not has_table_privilege('service_role', 'public.rf02b_public_table_probe', 'select')
  then
    raise exception 'public table default privileges are unsafe';
  end if;

  if has_function_privilege('anon', 'public.rf02b_public_function_probe()', 'execute')
    or has_function_privilege('authenticated', 'public.rf02b_public_function_probe()', 'execute')
    or not has_function_privilege('service_role', 'public.rf02b_public_function_probe()', 'execute')
  then
    raise exception 'public function default privileges are unsafe';
  end if;

  if has_table_privilege('anon', 'rf_raw.rf02b_raw_table_probe', 'select')
    or has_table_privilege('authenticated', 'rf_raw.rf02b_raw_table_probe', 'select')
    or not has_table_privilege('service_role', 'rf_raw.rf02b_raw_table_probe', 'insert')
    or not has_table_privilege('service_role', 'rf_raw.rf02b_raw_table_probe', 'truncate')
  then
    raise exception 'raw table default privileges are unsafe';
  end if;

  if has_function_privilege('anon', 'rf_raw.rf02b_raw_function_probe()', 'execute')
    or has_function_privilege('authenticated', 'rf_raw.rf02b_raw_function_probe()', 'execute')
    or not has_function_privilege('service_role', 'rf_raw.rf02b_raw_function_probe()', 'execute')
  then
    raise exception 'raw function default privileges are unsafe';
  end if;

  if has_table_privilege('anon', 'rf_canonical.rf02b_canonical_table_probe', 'select')
    or has_table_privilege('authenticated', 'rf_canonical.rf02b_canonical_table_probe', 'select')
    or not has_table_privilege('service_role', 'rf_canonical.rf02b_canonical_table_probe', 'insert')
  then
    raise exception 'canonical table default privileges are unsafe';
  end if;

  if has_function_privilege('anon', 'rf_canonical.rf02b_canonical_function_probe()', 'execute')
    or has_function_privilege('authenticated', 'rf_canonical.rf02b_canonical_function_probe()', 'execute')
    or not has_function_privilege('service_role', 'rf_canonical.rf02b_canonical_function_probe()', 'execute')
  then
    raise exception 'canonical function default privileges are unsafe';
  end if;
end;
$$;

-- Seed synthetic RF records through the future pipeline role.
set local role service_role;

insert into rf_canonical.rf_dataset_versions (
  id, dataset_version, competence_month, status, is_current, manifest_hash
) values (
  '84000000-0000-0000-0000-000000000001',
  'rf02b-test-2026-09',
  date '2026-09-01',
  'DISCOVERED',
  false,
  'rf02b-test-manifest'
);

insert into rf_canonical.rf_companies (
  id, dataset_version_id, cnpj_root, legal_name, source_record_hash
) values (
  '85000000-0000-0000-0000-000000000001',
  '84000000-0000-0000-0000-000000000001',
  '00000000',
  'RF02B TESTE LTDA',
  'rf02b-test-company'
);

insert into rf_canonical.rf_establishments (
  id, dataset_version_id, rf_company_id, cnpj_root, cnpj_order, cnpj_dv,
  cnpj_canonical, branch_type, source_record_hash
) values (
  '86000000-0000-0000-0000-000000000001',
  '84000000-0000-0000-0000-000000000001',
  '85000000-0000-0000-0000-000000000001',
  '00000000',
  'E08G',
  '12',
  '00000000E08G12',
  'MATRIZ',
  'rf02b-test-establishment'
);

insert into rf_raw.rf_import_staging_rows (
  dataset_version_id, entity_type, source_row_number, raw_payload,
  source_record_hash
) values (
  '84000000-0000-0000-0000-000000000001',
  'EMPRESA',
  1,
  '{"rf02b_test":true}'::jsonb,
  'rf02b-test-raw'
);

insert into public.rf_company_links (
  id, tenant_id, empresa_id, dataset_version_id, rf_company_id,
  rf_establishment_id, cnpj_canonical, match_status, match_method, metadata
) values (
  '87000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '40000000-0000-0000-0000-000000000001',
  '84000000-0000-0000-0000-000000000001',
  '85000000-0000-0000-0000-000000000001',
  '86000000-0000-0000-0000-000000000001',
  '00000000E08G12',
  'SUGGESTED',
  'CNPJ_EXACT',
  '{"rf02b_test":true}'::jsonb
);

do $$
declare
  v_cnpj text;
begin
  select public.rf02_verify_cnpj_roundtrip('00000000E08G12') into v_cnpj;
  if v_cnpj <> '00000000E08G12' then
    raise exception 'service_role helper changed the CNPJ';
  end if;
end;
$$;

-- Anonymous requests fail at the privilege boundary.
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);

do $$
begin
  begin
    perform count(*) from public.rf_company_links;
    raise exception 'expected anonymous link read to fail';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.rf02_verify_cnpj_roundtrip('00000000E08G12');
    raise exception 'expected anonymous helper execute to fail';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.rf_company_links (
      tenant_id, empresa_id, dataset_version_id, rf_company_id,
      cnpj_canonical, match_status, match_method
    ) values (
      '00000000-0000-0000-0000-000000000002',
      '40000000-0000-0000-0000-000000000001',
      '84000000-0000-0000-0000-000000000001',
      '85000000-0000-0000-0000-000000000001',
      '00000000E08G13',
      'SUGGESTED',
      'CNPJ_EXACT'
    );
    raise exception 'expected anonymous link write to fail';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- Ordinary tenant users can read their link but cannot write or call helpers.
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.rf_company_links;
  if v_count <> 1 then
    raise exception 'tenant user expected one RF link, got %', v_count;
  end if;

  perform count(*) from rf_canonical.rf_companies;

  begin
    perform count(*) from rf_raw.rf_import_staging_rows;
    raise exception 'expected authenticated raw read to fail';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.rf02_get_current_dataset_count();
    raise exception 'expected authenticated helper execute to fail';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.rf_company_links (
      tenant_id, empresa_id, dataset_version_id, rf_company_id,
      cnpj_canonical, match_status, match_method
    ) values (
      '00000000-0000-0000-0000-000000000002',
      '40000000-0000-0000-0000-000000000001',
      '84000000-0000-0000-0000-000000000001',
      '85000000-0000-0000-0000-000000000001',
      '00000000E08G13',
      'SUGGESTED',
      'CNPJ_EXACT'
    );
    raise exception 'expected tenant user link write to fail';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- Platform staff remains able to operate tenant links through RLS.
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000001', true);

insert into public.rf_company_links (
  id, tenant_id, empresa_id, dataset_version_id, rf_company_id,
  cnpj_canonical, match_status, match_method, metadata
) values (
  '87000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  '40000000-0000-0000-0000-000000000001',
  '84000000-0000-0000-0000-000000000001',
  '85000000-0000-0000-0000-000000000001',
  '00000000E08G13',
  'SUGGESTED',
  'MANUAL',
  '{"rf02b_staff_test":true}'::jsonb
);

update public.rf_company_links
set confidence = 0.9000
where id = '87000000-0000-0000-0000-000000000002';

delete from public.rf_company_links
where id = '87000000-0000-0000-0000-000000000002';

-- Composite FK still rejects a cross-tenant link even for service_role.
set local role service_role;

do $$
begin
  begin
    insert into public.rf_company_links (
      tenant_id, empresa_id, dataset_version_id, rf_company_id,
      cnpj_canonical, match_status, match_method
    ) values (
      '00000000-0000-0000-0000-000000000001',
      '40000000-0000-0000-0000-000000000001',
      '84000000-0000-0000-0000-000000000001',
      '85000000-0000-0000-0000-000000000001',
      '00000000E08G13',
      'SUGGESTED',
      'CNPJ_EXACT'
    );
    raise exception 'expected cross-tenant link FK to fail';
  exception when foreign_key_violation then null;
  end;
end;
$$;

rollback;

