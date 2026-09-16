-- RF-02 structural and adversarial checks.
-- Synthetic data only. No Receita Federal dataset is ingested.

begin;

set local role postgres;

delete from public.rf_company_links where metadata->>'rf02_test' = 'true';
delete from rf_canonical.rf_simples_mei where source_record_hash like 'rf02-test-%';
delete from rf_canonical.rf_partners where source_record_hash like 'rf02-test-%';
delete from rf_canonical.rf_establishment_secondary_cnaes where source_record_hash like 'rf02-test-%';
delete from rf_canonical.rf_establishments where source_record_hash like 'rf02-test-%';
delete from rf_canonical.rf_companies where source_record_hash like 'rf02-test-%';
delete from rf_canonical.rf_cnaes where source_record_hash like 'rf02-test-%';
delete from rf_canonical.rf_dataset_versions where dataset_version like 'rf02-test-%';

insert into rf_canonical.rf_dataset_versions (
  id,
  dataset_version,
  competence_month,
  status,
  is_current,
  manifest_hash,
  discovered_at,
  published_at,
  metadata
) values (
  '80000000-0000-0000-0000-000000000001',
  'rf02-test-2026-09',
  date '2026-09-01',
  'PUBLISHED',
  true,
  'rf02-test-manifest-current',
  now(),
  now(),
  '{"rf02_test": true}'::jsonb
);

insert into rf_canonical.rf_dataset_versions (
  id,
  dataset_version,
  competence_month,
  status,
  is_current,
  manifest_hash,
  discovered_at,
  retired_at,
  metadata
) values (
  '80000000-0000-0000-0000-000000000000',
  'rf02-test-2026-08',
  date '2026-08-01',
  'RETIRED',
  false,
  'rf02-test-manifest-previous',
  now(),
  now(),
  '{"rf02_test": true}'::jsonb
);

do $$
begin
  begin
    insert into rf_canonical.rf_dataset_versions (
      dataset_version,
      competence_month,
      status,
      is_current,
      manifest_hash,
      published_at
    ) values (
      'rf02-test-duplicate-current',
      date '2026-10-01',
      'PUBLISHED',
      true,
      'rf02-test-manifest-duplicate',
      now()
    );
    raise exception 'expected single-current dataset constraint to fail';
  exception when unique_violation then
    null;
  end;
end;
$$;

insert into rf_canonical.rf_cnaes (
  dataset_version_id,
  code,
  description,
  source_record_hash
) values (
  '80000000-0000-0000-0000-000000000001',
  '6201500',
  'Desenvolvimento de programas de computador sob encomenda',
  'rf02-test-cnae-6201500'
);

insert into rf_canonical.rf_companies (
  id,
  dataset_version_id,
  cnpj_root,
  legal_name,
  legal_nature_code,
  responsible_qualification_code,
  share_capital,
  company_size_code,
  source_record_hash
) values
  (
    '81000000-0000-0000-0000-000000000001',
    '80000000-0000-0000-0000-000000000001',
    '00000000',
    'RF02 ALFANUMERICA TESTE LTDA',
    '2062',
    '49',
    1000.00,
    '01',
    'rf02-test-company-alpha'
  ),
  (
    '81000000-0000-0000-0000-000000000002',
    '80000000-0000-0000-0000-000000000001',
    '11222333',
    'RF02 NUMERICA TESTE LTDA',
    '2062',
    '49',
    2000.00,
    '01',
    'rf02-test-company-numeric'
  );

insert into rf_canonical.rf_establishments (
  id,
  dataset_version_id,
  rf_company_id,
  cnpj_root,
  cnpj_order,
  cnpj_dv,
  cnpj_canonical,
  branch_type,
  trade_name,
  main_cnae_code,
  state,
  municipality_code,
  source_record_hash
) values
  (
    '82000000-0000-0000-0000-000000000001',
    '80000000-0000-0000-0000-000000000001',
    '81000000-0000-0000-0000-000000000001',
    '00000000',
    'E08G',
    '12',
    '00000000E08G12',
    'MATRIZ',
    'RF02 Alpha',
    '6201500',
    'SP',
    '3550308',
    'rf02-test-establishment-alpha'
  ),
  (
    '82000000-0000-0000-0000-000000000002',
    '80000000-0000-0000-0000-000000000001',
    '81000000-0000-0000-0000-000000000002',
    '11222333',
    '0001',
    '81',
    '11222333000181',
    'MATRIZ',
    'RF02 Numeric',
    '6201500',
    'SP',
    '3550308',
    'rf02-test-establishment-numeric'
  );

insert into rf_canonical.rf_establishment_secondary_cnaes (
  dataset_version_id,
  rf_establishment_id,
  cnae_code,
  source_record_hash
) values (
  '80000000-0000-0000-0000-000000000001',
  '82000000-0000-0000-0000-000000000001',
  '6201500',
  'rf02-test-secondary-cnae-alpha'
);

do $$
begin
  begin
    insert into rf_canonical.rf_companies (
      dataset_version_id,
      cnpj_root,
      legal_name
    ) values (
      '80000000-0000-0000-0000-000000000001',
      'ABCDEF12',
      'RF02 SEM PROVENIENCIA'
    );
    raise exception 'expected mandatory provenance to fail';
  exception when not_null_violation then
    null;
  end;
end;
$$;

insert into public.rf_company_links (
  id,
  tenant_id,
  empresa_id,
  dataset_version_id,
  rf_company_id,
  rf_establishment_id,
  cnpj_canonical,
  match_status,
  match_method,
  confidence,
  metadata
) values (
  '83000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '40000000-0000-0000-0000-000000000001',
  '80000000-0000-0000-0000-000000000001',
  '81000000-0000-0000-0000-000000000001',
  '82000000-0000-0000-0000-000000000001',
  '00000000E08G12',
  'SUGGESTED',
  'CNPJ_EXACT',
  0.9900,
  '{"rf02_test": true}'::jsonb
);

do $$
begin
  begin
    insert into public.rf_company_links (
      tenant_id,
      empresa_id,
      dataset_version_id,
      rf_company_id,
      cnpj_canonical,
      match_status,
      match_method,
      metadata
    ) values (
      '00000000-0000-0000-0000-000000000001',
      '40000000-0000-0000-0000-000000000001',
      '80000000-0000-0000-0000-000000000001',
      '81000000-0000-0000-0000-000000000001',
      '00000000E08G12',
      'SUGGESTED',
      'CNPJ_EXACT',
      '{"rf02_test": true}'::jsonb
    );
    raise exception 'expected cross-tenant link FK to fail';
  exception when foreign_key_violation then
    null;
  end;
end;
$$;

-- Authenticated tenant user can read only own tenant link.
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.rf_company_links;
  if v_count <> 1 then
    raise exception 'expected tenant A user to read exactly one RF link, got %', v_count;
  end if;
end;
$$;

do $$
begin
  begin
    insert into rf_canonical.rf_dataset_versions (
      dataset_version,
      competence_month,
      status,
      manifest_hash
    ) values (
      'rf02-test-auth-write',
      date '2026-11-01',
      'DISCOVERED',
      'rf02-test-auth-write'
    );
    raise exception 'expected authenticated canonical write to fail';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

do $$
begin
  begin
    insert into public.rf_company_links (
      tenant_id,
      empresa_id,
      dataset_version_id,
      rf_company_id,
      cnpj_canonical,
      match_status,
      match_method,
      metadata
    ) values (
      '00000000-0000-0000-0000-000000000002',
      '40000000-0000-0000-0000-000000000001',
      '80000000-0000-0000-0000-000000000001',
      '81000000-0000-0000-0000-000000000001',
      '00000000E08G12',
      'SUGGESTED',
      'CNPJ_EXACT',
      '{"rf02_test": true}'::jsonb
    );
    raise exception 'expected authenticated link write to fail';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

do $$
begin
  begin
    perform count(*) from rf_raw.rf_import_staging_rows;
    raise exception 'expected authenticated raw read to fail';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

set local role service_role;

do $$
declare
  v_cnpj text;
  v_current integer;
begin
  select public.rf02_verify_cnpj_roundtrip('00000000E08G12') into v_cnpj;
  if v_cnpj <> '00000000E08G12' then
    raise exception 'alphanumeric CNPJ was not preserved';
  end if;

  select public.rf02_verify_cnpj_roundtrip('11222333000181') into v_cnpj;
  if v_cnpj <> '11222333000181' then
    raise exception 'numeric CNPJ was not preserved';
  end if;

  select public.rf02_get_current_dataset_count() into v_current;
  if v_current <> 1 then
    raise exception 'expected exactly one current dataset, got %', v_current;
  end if;
end;
$$;

rollback;
