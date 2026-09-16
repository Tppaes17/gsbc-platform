-- RF-02 — Dataset governance foundation.
-- Raw and canonical RF-CNPJ data are global, versioned and separate from
-- tenant-scoped GSBC operational data. No Receita dataset is ingested here.

create schema if not exists rf_raw;
create schema if not exists rf_canonical;

comment on schema rf_raw is 'Private operational schema for Receita Federal raw/staging artifacts. Not exposed to application users.';
comment on schema rf_canonical is 'Canonical, versioned Receita Federal CNPJ schema. Global data; tenant-specific GSBC interpretation lives in public.* links.';

create table rf_canonical.rf_dataset_versions (
  id uuid primary key default gen_random_uuid(),
  dataset_version text not null,
  competence_month date not null,
  source text not null default 'RECEITA_FEDERAL_CNPJ_OPEN_DATA',
  source_url text,
  status text not null check (status in (
    'DISCOVERED',
    'DOWNLOADING',
    'DOWNLOADED',
    'VALIDATING',
    'VALIDATED',
    'READY',
    'PUBLISHED',
    'RETIRED',
    'FAILED'
  )),
  is_current boolean not null default false,
  manifest_hash text not null,
  file_count integer check (file_count is null or file_count >= 0),
  expected_total_size_bytes bigint check (expected_total_size_bytes is null or expected_total_size_bytes >= 0),
  discovered_at timestamptz,
  download_started_at timestamptz,
  downloaded_at timestamptz,
  validation_started_at timestamptz,
  validated_at timestamptz,
  ready_at timestamptz,
  published_at timestamptz,
  retired_at timestamptz,
  failed_at timestamptz,
  supersedes_dataset_version_id uuid references rf_canonical.rf_dataset_versions(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rf_dataset_versions_unique_version unique (source, dataset_version),
  constraint rf_dataset_versions_published_has_time check (status <> 'PUBLISHED' or published_at is not null),
  constraint rf_dataset_versions_current_is_published check (not is_current or status = 'PUBLISHED')
);

comment on table rf_canonical.rf_dataset_versions is 'Version manifest for Receita Federal CNPJ datasets. Publication is logical and reversible without reingestion.';

create unique index rf_dataset_versions_single_current_idx
  on rf_canonical.rf_dataset_versions (source)
  where is_current;

create unique index rf_dataset_versions_single_published_idx
  on rf_canonical.rf_dataset_versions (source)
  where status = 'PUBLISHED';

create index rf_dataset_versions_status_idx on rf_canonical.rf_dataset_versions (status);
create index rf_dataset_versions_competence_idx on rf_canonical.rf_dataset_versions (competence_month desc);

create trigger set_updated_at before update on rf_canonical.rf_dataset_versions
  for each row execute function public.set_updated_at();

create table rf_canonical.rf_dataset_files (
  id uuid primary key default gen_random_uuid(),
  dataset_version_id uuid not null references rf_canonical.rf_dataset_versions(id) on delete cascade,
  file_type text not null check (file_type in (
    'EMPRESA',
    'ESTABELECIMENTO',
    'SOCIO',
    'SIMPLES',
    'CNAE',
    'MUNICIPIO',
    'PAIS',
    'NATUREZA_JURIDICA',
    'QUALIFICACAO_SOCIO',
    'MOTIVO_SITUACAO',
    'MANIFEST',
    'OTHER'
  )),
  identifier text not null,
  source_url text,
  expected_size_bytes bigint check (expected_size_bytes is null or expected_size_bytes >= 0),
  actual_size_bytes bigint check (actual_size_bytes is null or actual_size_bytes >= 0),
  etag text,
  last_modified_at timestamptz,
  checksum_sha256 text,
  storage_path text,
  status text not null check (status in (
    'DISCOVERED',
    'PLANNED',
    'DOWNLOADING',
    'DOWNLOADED',
    'VERIFIED',
    'EXTRACTED',
    'LOADED',
    'FAILED',
    'SKIPPED'
  )),
  attempts integer not null default 0 check (attempts >= 0),
  error_code text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rf_dataset_files_unique_identifier unique (dataset_version_id, file_type, identifier)
);

comment on table rf_canonical.rf_dataset_files is 'Manifest entries for arbitrary Receita files. Does not assume fixed file names or counts.';

create index rf_dataset_files_dataset_idx on rf_canonical.rf_dataset_files (dataset_version_id);
create index rf_dataset_files_status_idx on rf_canonical.rf_dataset_files (status);
create index rf_dataset_files_storage_path_idx on rf_canonical.rf_dataset_files (storage_path);

create trigger set_updated_at before update on rf_canonical.rf_dataset_files
  for each row execute function public.set_updated_at();

create table rf_canonical.rf_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  dataset_version_id uuid references rf_canonical.rf_dataset_versions(id) on delete set null,
  job_type text not null check (job_type in (
    'DISCOVER',
    'PLAN',
    'DOWNLOAD',
    'VERIFY',
    'EXTRACT',
    'LOAD',
    'VALIDATE',
    'NORMALIZE',
    'INDEX',
    'DIFF',
    'PUBLISH',
    'ROLLBACK',
    'REPORT'
  )),
  status text not null check (status in (
    'QUEUED',
    'RUNNING',
    'SUCCEEDED',
    'FAILED',
    'CANCELLED',
    'TIMED_OUT'
  )),
  attempt integer not null default 1 check (attempt >= 1),
  started_at timestamptz,
  heartbeat_at timestamptz,
  finished_at timestamptz,
  error_code text,
  error_message text,
  metrics jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table rf_canonical.rf_sync_jobs is 'Future RF-CNPJ orchestration ledger. No worker is implemented in RF-02.';

create index rf_sync_jobs_dataset_idx on rf_canonical.rf_sync_jobs (dataset_version_id);
create index rf_sync_jobs_type_status_idx on rf_canonical.rf_sync_jobs (job_type, status);
create index rf_sync_jobs_heartbeat_idx on rf_canonical.rf_sync_jobs (heartbeat_at);

create trigger set_updated_at before update on rf_canonical.rf_sync_jobs
  for each row execute function public.set_updated_at();

create table rf_canonical.rf_quality_checks (
  id uuid primary key default gen_random_uuid(),
  dataset_version_id uuid not null references rf_canonical.rf_dataset_versions(id) on delete cascade,
  dataset_file_id uuid references rf_canonical.rf_dataset_files(id) on delete set null,
  check_type text not null check (check_type in (
    'FILE_INTEGRITY',
    'ROW_COUNT',
    'REJECTION_RATE',
    'DUPLICATE_KEY',
    'REFERENTIAL_INTEGRITY',
    'SCHEMA_COMPATIBILITY',
    'VOLUME_VARIATION',
    'CANONICAL_VALIDATION'
  )),
  status text not null check (status in ('PASS', 'WARN', 'FAIL', 'SKIPPED')),
  severity text not null check (severity in ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  expected jsonb,
  actual jsonb,
  details jsonb not null default '{}'::jsonb,
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table rf_canonical.rf_quality_checks is 'Dataset quality gates for publication readiness. Critical failures block future publish operations.';

create index rf_quality_checks_dataset_idx on rf_canonical.rf_quality_checks (dataset_version_id);
create index rf_quality_checks_status_severity_idx on rf_canonical.rf_quality_checks (status, severity);

create table rf_raw.rf_import_staging_rows (
  id uuid primary key default gen_random_uuid(),
  dataset_version_id uuid not null references rf_canonical.rf_dataset_versions(id) on delete cascade,
  dataset_file_id uuid references rf_canonical.rf_dataset_files(id) on delete set null,
  entity_type text not null,
  source_row_number bigint check (source_row_number is null or source_row_number > 0),
  raw_payload jsonb not null,
  source_record_hash text not null,
  load_status text not null default 'STAGED' check (load_status in ('STAGED', 'NORMALIZED', 'REJECTED')),
  rejection_reason text,
  created_at timestamptz not null default now(),
  constraint rf_import_staging_rows_unique_hash unique (dataset_version_id, entity_type, source_record_hash)
);

comment on table rf_raw.rf_import_staging_rows is 'Private raw/staging rows for future RF-CNPJ loader. Not exposed to authenticated users.';

create index rf_import_staging_rows_dataset_idx on rf_raw.rf_import_staging_rows (dataset_version_id);
create index rf_import_staging_rows_file_idx on rf_raw.rf_import_staging_rows (dataset_file_id);
create index rf_import_staging_rows_status_idx on rf_raw.rf_import_staging_rows (load_status);
