-- RF-02 — Canonical Receita Federal CNPJ model.
-- CNPJ fields are text and canonical uppercase without punctuation.

create table rf_canonical.rf_cnaes (
  id uuid primary key default gen_random_uuid(),
  dataset_version_id uuid not null references rf_canonical.rf_dataset_versions(id) on delete cascade,
  code text not null,
  description text not null,
  source_file_id uuid references rf_canonical.rf_dataset_files(id) on delete set null,
  source_record_hash text,
  created_at timestamptz not null default now(),
  constraint rf_cnaes_code_format check (code ~ '^[0-9]{7}$'),
  constraint rf_cnaes_unique unique (dataset_version_id, code)
);

create table rf_canonical.rf_municipalities (
  id uuid primary key default gen_random_uuid(),
  dataset_version_id uuid not null references rf_canonical.rf_dataset_versions(id) on delete cascade,
  code text not null,
  name text not null,
  state text,
  source_file_id uuid references rf_canonical.rf_dataset_files(id) on delete set null,
  source_record_hash text,
  created_at timestamptz not null default now(),
  constraint rf_municipalities_unique unique (dataset_version_id, code)
);

create table rf_canonical.rf_countries (
  id uuid primary key default gen_random_uuid(),
  dataset_version_id uuid not null references rf_canonical.rf_dataset_versions(id) on delete cascade,
  code text not null,
  name text not null,
  source_file_id uuid references rf_canonical.rf_dataset_files(id) on delete set null,
  source_record_hash text,
  created_at timestamptz not null default now(),
  constraint rf_countries_unique unique (dataset_version_id, code)
);

create table rf_canonical.rf_legal_natures (
  id uuid primary key default gen_random_uuid(),
  dataset_version_id uuid not null references rf_canonical.rf_dataset_versions(id) on delete cascade,
  code text not null,
  description text not null,
  source_file_id uuid references rf_canonical.rf_dataset_files(id) on delete set null,
  source_record_hash text,
  created_at timestamptz not null default now(),
  constraint rf_legal_natures_unique unique (dataset_version_id, code)
);

create table rf_canonical.rf_partner_qualifications (
  id uuid primary key default gen_random_uuid(),
  dataset_version_id uuid not null references rf_canonical.rf_dataset_versions(id) on delete cascade,
  code text not null,
  description text not null,
  source_file_id uuid references rf_canonical.rf_dataset_files(id) on delete set null,
  source_record_hash text,
  created_at timestamptz not null default now(),
  constraint rf_partner_qualifications_unique unique (dataset_version_id, code)
);

create table rf_canonical.rf_registration_status_reasons (
  id uuid primary key default gen_random_uuid(),
  dataset_version_id uuid not null references rf_canonical.rf_dataset_versions(id) on delete cascade,
  code text not null,
  description text not null,
  source_file_id uuid references rf_canonical.rf_dataset_files(id) on delete set null,
  source_record_hash text,
  created_at timestamptz not null default now(),
  constraint rf_registration_status_reasons_unique unique (dataset_version_id, code)
);

create table rf_canonical.rf_companies (
  id uuid primary key default gen_random_uuid(),
  dataset_version_id uuid not null references rf_canonical.rf_dataset_versions(id) on delete cascade,
  cnpj_root text not null,
  legal_name text not null,
  legal_nature_code text,
  responsible_qualification_code text,
  share_capital numeric(18,2),
  company_size_code text,
  federative_entity text,
  source text not null default 'RECEITA_FEDERAL_CNPJ_OPEN_DATA',
  source_file_id uuid references rf_canonical.rf_dataset_files(id) on delete set null,
  source_record_hash text not null,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint rf_companies_cnpj_root_format check (cnpj_root ~ '^[A-Z0-9]{8}$'),
  constraint rf_companies_unique_root unique (dataset_version_id, cnpj_root),
  constraint rf_companies_unique_hash unique (dataset_version_id, source_record_hash)
);

comment on table rf_canonical.rf_companies is 'Canonical Receita empresa root records. Not tenant-scoped.';

create index rf_companies_cnpj_root_idx on rf_canonical.rf_companies (cnpj_root);
create index rf_companies_dataset_idx on rf_canonical.rf_companies (dataset_version_id);
create index rf_companies_legal_name_idx on rf_canonical.rf_companies (legal_name);

create table rf_canonical.rf_establishments (
  id uuid primary key default gen_random_uuid(),
  dataset_version_id uuid not null references rf_canonical.rf_dataset_versions(id) on delete cascade,
  rf_company_id uuid not null references rf_canonical.rf_companies(id) on delete cascade,
  cnpj_root text not null,
  cnpj_order text not null,
  cnpj_dv text not null,
  cnpj_canonical text not null,
  branch_type text not null check (branch_type in ('MATRIZ', 'FILIAL', 'UNKNOWN')),
  trade_name text,
  registration_status_code text,
  registration_status_date date,
  registration_status_reason_code text,
  foreign_city text,
  country_code text,
  activity_start_date date,
  main_cnae_code text,
  street_type text,
  street text,
  number text,
  complement text,
  district text,
  postal_code text,
  state text,
  municipality_code text,
  ddd1 text,
  phone1 text,
  ddd2 text,
  phone2 text,
  fax_ddd text,
  fax text,
  email text,
  special_status text,
  special_status_date date,
  source text not null default 'RECEITA_FEDERAL_CNPJ_OPEN_DATA',
  source_file_id uuid references rf_canonical.rf_dataset_files(id) on delete set null,
  source_record_hash text not null,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint rf_establishments_cnpj_root_format check (cnpj_root ~ '^[A-Z0-9]{8}$'),
  constraint rf_establishments_cnpj_order_format check (cnpj_order ~ '^[A-Z0-9]{4}$'),
  constraint rf_establishments_cnpj_dv_format check (cnpj_dv ~ '^[0-9]{2}$'),
  constraint rf_establishments_cnpj_canonical_format check (cnpj_canonical ~ '^[A-Z0-9]{12}[0-9]{2}$'),
  constraint rf_establishments_cnpj_parts_match check (cnpj_canonical = cnpj_root || cnpj_order || cnpj_dv),
  constraint rf_establishments_unique_cnpj unique (dataset_version_id, cnpj_canonical),
  constraint rf_establishments_unique_hash unique (dataset_version_id, source_record_hash)
);

comment on table rf_canonical.rf_establishments is 'Canonical Receita establishments, separated from company root and from GSBC empresas.';

create index rf_establishments_company_idx on rf_canonical.rf_establishments (rf_company_id);
create index rf_establishments_cnpj_idx on rf_canonical.rf_establishments (cnpj_canonical);
create index rf_establishments_main_cnae_idx on rf_canonical.rf_establishments (main_cnae_code);
create index rf_establishments_state_municipality_idx on rf_canonical.rf_establishments (state, municipality_code);
create index rf_establishments_status_idx on rf_canonical.rf_establishments (registration_status_code);

create table rf_canonical.rf_establishment_secondary_cnaes (
  id uuid primary key default gen_random_uuid(),
  dataset_version_id uuid not null references rf_canonical.rf_dataset_versions(id) on delete cascade,
  rf_establishment_id uuid not null references rf_canonical.rf_establishments(id) on delete cascade,
  cnae_code text not null,
  source_record_hash text,
  created_at timestamptz not null default now(),
  constraint rf_establishment_secondary_cnaes_code_format check (cnae_code ~ '^[0-9]{7}$'),
  constraint rf_establishment_secondary_cnaes_unique unique (rf_establishment_id, cnae_code)
);

create index rf_establishment_secondary_cnaes_dataset_idx on rf_canonical.rf_establishment_secondary_cnaes (dataset_version_id);
create index rf_establishment_secondary_cnaes_cnae_idx on rf_canonical.rf_establishment_secondary_cnaes (cnae_code);

create table rf_canonical.rf_partners (
  id uuid primary key default gen_random_uuid(),
  dataset_version_id uuid not null references rf_canonical.rf_dataset_versions(id) on delete cascade,
  rf_company_id uuid not null references rf_canonical.rf_companies(id) on delete cascade,
  cnpj_root text not null,
  partner_identifier_type text,
  partner_name text not null,
  partner_document_masked text,
  partner_qualification_code text,
  entry_date date,
  country_code text,
  legal_representative_document_masked text,
  legal_representative_name text,
  legal_representative_qualification_code text,
  age_group text,
  source text not null default 'RECEITA_FEDERAL_CNPJ_OPEN_DATA',
  source_file_id uuid references rf_canonical.rf_dataset_files(id) on delete set null,
  source_record_hash text not null,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint rf_partners_cnpj_root_format check (cnpj_root ~ '^[A-Z0-9]{8}$'),
  constraint rf_partners_unique_hash unique (dataset_version_id, source_record_hash)
);

comment on table rf_canonical.rf_partners is 'Canonical QSA records. Masked public documents are preserved as source values and never reconstructed.';

create index rf_partners_company_idx on rf_canonical.rf_partners (rf_company_id);
create index rf_partners_cnpj_root_idx on rf_canonical.rf_partners (cnpj_root);
create index rf_partners_qualification_idx on rf_canonical.rf_partners (partner_qualification_code);

create table rf_canonical.rf_simples_mei (
  id uuid primary key default gen_random_uuid(),
  dataset_version_id uuid not null references rf_canonical.rf_dataset_versions(id) on delete cascade,
  cnpj_root text not null,
  simples_option boolean,
  simples_option_start_date date,
  simples_option_end_date date,
  mei_option boolean,
  mei_option_start_date date,
  mei_option_end_date date,
  source text not null default 'RECEITA_FEDERAL_CNPJ_OPEN_DATA',
  source_file_id uuid references rf_canonical.rf_dataset_files(id) on delete set null,
  source_record_hash text not null,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint rf_simples_mei_cnpj_root_format check (cnpj_root ~ '^[A-Z0-9]{8}$'),
  constraint rf_simples_mei_unique_root unique (dataset_version_id, cnpj_root),
  constraint rf_simples_mei_unique_hash unique (dataset_version_id, source_record_hash)
);

comment on table rf_canonical.rf_simples_mei is 'Canonical Simples Nacional and MEI source data. Does not decide union classification by itself.';

create index rf_simples_mei_dataset_idx on rf_canonical.rf_simples_mei (dataset_version_id);
create index rf_simples_mei_cnpj_root_idx on rf_canonical.rf_simples_mei (cnpj_root);
