-- RF-03B.3 read-only controlled RF lookup regression tests.
-- Synthetic data and probe objects are rolled back.

begin;

set local role postgres;

do $$
begin
  if has_function_privilege('anon', 'public.rf_controlled_company_lookup(text)', 'execute') then
    raise exception 'anon retains execute on rf_controlled_company_lookup';
  end if;

  if not has_function_privilege('authenticated', 'public.rf_controlled_company_lookup(text)', 'execute') then
    raise exception 'authenticated is missing execute on rf_controlled_company_lookup';
  end if;
end;
$$;

-- Seed one PUBLISHED/current dataset plus one RETIRED/non-current dataset, so the
-- function's own filtering (not application-layer discipline) is what is proven.
insert into rf_canonical.rf_dataset_versions (
  id, dataset_version, competence_month, source, status, manifest_hash, file_count,
  is_current, published_at, metadata
) values (
  '90000000-0000-0000-0000-000000000001',
  'rf03b3-test-current',
  date '2026-09-01',
  'RECEITA_FEDERAL_CNPJ_OPEN_DATA',
  'PUBLISHED',
  repeat('a', 64),
  1,
  true,
  now(),
  '{"controlled_selection":{"cnpjs":["99000000000191"]}}'::jsonb
), (
  '90000000-0000-0000-0000-000000000002',
  'rf03b3-test-retired',
  date '2026-08-01',
  'RECEITA_FEDERAL_CNPJ_OPEN_DATA',
  'RETIRED',
  repeat('b', 64),
  1,
  false,
  now() - interval '30 days',
  '{}'::jsonb
);

insert into rf_canonical.rf_companies (
  id, dataset_version_id, cnpj_root, legal_name, source_record_hash
) values (
  '91000000-0000-0000-0000-000000000001',
  '90000000-0000-0000-0000-000000000001',
  '99000000',
  'RF03B3 TESTE LTDA',
  'rf03b3-test-company-current'
), (
  '91000000-0000-0000-0000-000000000002',
  '90000000-0000-0000-0000-000000000002',
  '99000000',
  'RF03B3 TESTE RETIRED LTDA',
  'rf03b3-test-company-retired'
);

insert into rf_canonical.rf_establishments (
  id, dataset_version_id, rf_company_id, cnpj_root, cnpj_order, cnpj_dv,
  cnpj_canonical, branch_type, trade_name, registration_status_code,
  main_cnae_code, state, municipality_code, source_record_hash
) values (
  '92000000-0000-0000-0000-000000000001',
  '90000000-0000-0000-0000-000000000001',
  '91000000-0000-0000-0000-000000000001',
  '99000000', '0001', '91', '99000000000191',
  'MATRIZ', 'RF03B3 FANTASIA', '02', '6201501', 'SP', '3550308',
  'rf03b3-test-establishment-current'
), (
  '92000000-0000-0000-0000-000000000002',
  '90000000-0000-0000-0000-000000000002',
  '91000000-0000-0000-0000-000000000002',
  '99000000', '0001', '91', '99000000000191',
  'MATRIZ', 'RF03B3 FANTASIA RETIRED', '02', '6201501', 'SP', '3550308',
  'rf03b3-test-establishment-retired'
);

insert into rf_canonical.rf_simples_mei (
  dataset_version_id, cnpj_root, simples_option, mei_option, source_record_hash
) values (
  '90000000-0000-0000-0000-000000000001', '99000000', true, false,
  'rf03b3-test-simples-current'
);

-- Anonymous requests fail at the privilege boundary, never reaching row data.
set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);

do $$
begin
  begin
    perform public.rf_controlled_company_lookup('99000000000191');
    raise exception 'expected anonymous lookup to fail';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- Authenticated requests succeed and observe only the PUBLISHED/current version.
set local role authenticated;
select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
declare
  v_result jsonb;
begin
  v_result := public.rf_controlled_company_lookup('99000000000191');

  if v_result -> 'dataset' ->> 'dataset_version' <> 'rf03b3-test-current' then
    raise exception 'lookup did not resolve the current dataset version, got %', v_result -> 'dataset';
  end if;

  if v_result -> 'establishment' ->> 'trade_name' <> 'RF03B3 FANTASIA' then
    raise exception 'lookup returned the wrong establishment, expected the current version''s row, got %', v_result -> 'establishment';
  end if;

  if v_result ? 'tenant_id' or (v_result -> 'establishment') ? 'tenant_id' or (v_result -> 'company') ? 'tenant_id' then
    raise exception 'lookup leaked a tenant_id key';
  end if;

  if (v_result -> 'simples_mei' ->> 'simples_option')::boolean is distinct from true then
    raise exception 'lookup did not return the expected Simples flag';
  end if;

  -- A CNPJ absent from this dataset resolves the dataset but no establishment,
  -- distinguishing DATASET_UNAVAILABLE from "not in this recorte" at the source.
  -- Note: jsonb_build_object serializes a SQL NULL member as the JSON scalar
  -- `null`, not as an absent key, so `v_result -> 'establishment'` is the
  -- non-NULL jsonb value 'null'::jsonb here -- `is not null` alone would
  -- never fire. jsonb_typeof(...) = 'null' is the correct way to detect it,
  -- and matches exactly what the real TypeScript consumer sees after
  -- JSON.parse (JSON null maps to JS null there without this ambiguity).
  v_result := public.rf_controlled_company_lookup('12345678000195');
  if v_result -> 'dataset' is null or jsonb_typeof(v_result -> 'dataset') = 'null' then
    raise exception 'lookup for a missing CNPJ unexpectedly lost the dataset context';
  end if;
  if not (v_result -> 'establishment' is null or jsonb_typeof(v_result -> 'establishment') = 'null') then
    raise exception 'lookup for an unrelated CNPJ unexpectedly matched an establishment, got %', v_result -> 'establishment';
  end if;
end;
$$;

rollback;

do $$
begin
  if exists (select 1 from rf_canonical.rf_dataset_versions where dataset_version like 'rf03b3-test-%')
    or exists (select 1 from rf_canonical.rf_companies where source_record_hash like 'rf03b3-test-%')
    or exists (select 1 from rf_canonical.rf_establishments where source_record_hash like 'rf03b3-test-%')
    or exists (select 1 from rf_canonical.rf_simples_mei where source_record_hash like 'rf03b3-test-%')
  then
    raise exception 'RF-03B.3 test residue survived rollback';
  end if;
end;
$$;
