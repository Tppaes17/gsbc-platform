import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

function csv(value) {
  const string = String(value ?? "");
  return /[",\r\n]/.test(string) ? `"${string.replaceAll('"', '""')}"` : string;
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function runPsqlRaw(container, input) {
  return spawnSync(
    "docker",
    ["exec", "-i", container, "psql", "-U", "postgres", "-d", "postgres", "-X", "--set", "ON_ERROR_STOP=1", "--quiet"],
    { input, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
}

function runPsql(container, input) {
  const result = runPsqlRaw(container, input);
  if (result.status !== 0) {
    throw new Error(`PostgreSQL benchmark failed:\n${result.stdout.trim()}\n${result.stderr.trim()}`);
  }
  return result.stdout;
}

function parseResults(output) {
  return Object.fromEntries(
    output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith("RF_POC_RESULT|"))
      .map((line) => {
        const [, key, value] = line.split("|");
        const numeric = Number(value);
        return [key, Number.isFinite(numeric) && value !== "" ? numeric : value];
      }),
  );
}

export function benchmarkDatabase(records, { maxRows, container = "supabase_db_GSBC_2_-_Claude" }) {
  if (records.length === 0) throw new Error("Database benchmark requires source records");
  const datasetId = "030a0000-0000-4000-8000-000000000001";
  const fileId = "030a0000-0000-4000-8000-000000000002";
  const rows = [];
  for (let index = 0; index < maxRows; index += 1) {
    const record = records[index % records.length];
    const rowNumber = index + 1;
    const payload = JSON.stringify({
      code: record.code,
      description: record.description,
      source_record_hash: record.source_record_hash,
    });
    rows.push([
      datasetId,
      fileId,
      "CNAE",
      rowNumber,
      payload,
      hash(`${record.source_record_hash}:${rowNumber}`),
      "STAGED",
    ].map(csv).join(","));
  }
  const csvBlock = `${rows.join("\n")}\n`;

  const setup = String.raw`
\pset tuples_only on
\pset format unaligned
begin;
create temp table rf_poc_metrics (label text primary key, at timestamptz not null);
create temp table rf_poc_landing (
  dataset_version_id uuid,
  dataset_file_id uuid,
  entity_type text,
  source_row_number bigint,
  raw_payload jsonb,
  source_record_hash text,
  load_status text
) on commit drop;
create temp table rf_poc_batch (like rf_poc_landing including defaults) on commit drop;
insert into rf_canonical.rf_dataset_versions (
  id, dataset_version, competence_month, source, status, manifest_hash, file_count
) values (
  '${datasetId}', 'RF03A-POC-2026-04', '2026-04-01', 'RF03A_UNVERIFIED_MIRROR_POC', 'VALIDATING', '${hash("rf03a-poc-manifest")}', 1
);
insert into rf_canonical.rf_dataset_files (
  id, dataset_version_id, file_type, identifier, status
) values (
  '${fileId}', '${datasetId}', 'CNAE', 'Cnaes.zip', 'VERIFIED'
);
insert into rf_poc_metrics values ('copy_start', clock_timestamp());
\copy rf_poc_landing from stdin with (format csv)
`;
  const afterFirstCopy = String.raw`\.
insert into rf_poc_metrics values ('copy_end', clock_timestamp());
insert into rf_poc_metrics values ('batch_start', clock_timestamp());
insert into rf_poc_batch select * from rf_poc_landing;
insert into rf_poc_metrics values ('batch_end', clock_timestamp());
insert into rf_poc_metrics values ('normalize_start', clock_timestamp());
insert into rf_raw.rf_import_staging_rows (
  dataset_version_id, dataset_file_id, entity_type, source_row_number,
  raw_payload, source_record_hash, load_status
)
select dataset_version_id, dataset_file_id, entity_type, source_row_number,
       raw_payload, source_record_hash, load_status
from rf_poc_landing
on conflict (dataset_version_id, entity_type, source_record_hash) do nothing;
insert into rf_canonical.rf_cnaes (
  dataset_version_id, code, description, source_file_id, source_record_hash
)
select distinct on (raw_payload->>'code')
       dataset_version_id,
       raw_payload->>'code',
       raw_payload->>'description',
       dataset_file_id,
       raw_payload->>'source_record_hash'
from rf_poc_landing
order by raw_payload->>'code', source_row_number
on conflict (dataset_version_id, code) do nothing;
update rf_raw.rf_import_staging_rows
set load_status = 'NORMALIZED'
where dataset_version_id = '${datasetId}';
insert into rf_poc_metrics values ('normalize_end', clock_timestamp());
select 'RF_POC_RESULT|first_staging_rows|' || count(*) from rf_raw.rf_import_staging_rows where dataset_version_id = '${datasetId}';
select 'RF_POC_RESULT|first_canonical_rows|' || count(*) from rf_canonical.rf_cnaes where dataset_version_id = '${datasetId}';
truncate rf_poc_landing;
\copy rf_poc_landing from stdin with (format csv)
`;
  const afterSecondCopy = String.raw`\.
insert into rf_raw.rf_import_staging_rows (
  dataset_version_id, dataset_file_id, entity_type, source_row_number,
  raw_payload, source_record_hash, load_status
)
select dataset_version_id, dataset_file_id, entity_type, source_row_number,
       raw_payload, source_record_hash, load_status
from rf_poc_landing
on conflict (dataset_version_id, entity_type, source_record_hash) do nothing;
insert into rf_canonical.rf_cnaes (
  dataset_version_id, code, description, source_file_id, source_record_hash
)
select distinct on (raw_payload->>'code')
       dataset_version_id,
       raw_payload->>'code',
       raw_payload->>'description',
       dataset_file_id,
       raw_payload->>'source_record_hash'
from rf_poc_landing
order by raw_payload->>'code', source_row_number
on conflict (dataset_version_id, code) do nothing;
select 'RF_POC_RESULT|second_staging_rows|' || count(*) from rf_raw.rf_import_staging_rows where dataset_version_id = '${datasetId}';
select 'RF_POC_RESULT|second_canonical_rows|' || count(*) from rf_canonical.rf_cnaes where dataset_version_id = '${datasetId}';
select 'RF_POC_RESULT|copy_ms|' || round(extract(epoch from ((select at from rf_poc_metrics where label='copy_end') - (select at from rf_poc_metrics where label='copy_start'))) * 1000, 3);
select 'RF_POC_RESULT|batch_insert_ms|' || round(extract(epoch from ((select at from rf_poc_metrics where label='batch_end') - (select at from rf_poc_metrics where label='batch_start'))) * 1000, 3);
select 'RF_POC_RESULT|normalize_ms|' || round(extract(epoch from ((select at from rf_poc_metrics where label='normalize_end') - (select at from rf_poc_metrics where label='normalize_start'))) * 1000, 3);
select 'RF_POC_RESULT|rf_relation_bytes_during|' || coalesce(sum(pg_total_relation_size(format('%I.%I', schemaname, relname))), 0)
from pg_stat_user_tables where schemaname in ('rf_raw', 'rf_canonical');
do $$
begin
  begin
    insert into rf_canonical.rf_cnaes (dataset_version_id, code, description)
    values ('${datasetId}', 'INVALID', 'failure injection');
    raise exception 'constraint failure injection did not fail closed';
  exception when check_violation then
    null;
  end;
end $$;
select 'RF_POC_RESULT|constraint_failure_injection|PASS';
rollback;
`;

  const output = runPsql(container, setup + csvBlock + afterFirstCopy + csvBlock + afterSecondCopy);
  const metrics = parseResults(output);
  const verification = parseResults(runPsql(container, String.raw`
\pset tuples_only on
\pset format unaligned
select 'RF_POC_RESULT|post_rollback_dataset_rows|' || count(*) from rf_canonical.rf_dataset_versions where id = '${datasetId}';
select 'RF_POC_RESULT|post_rollback_staging_rows|' || count(*) from rf_raw.rf_import_staging_rows where dataset_version_id = '${datasetId}';
select 'RF_POC_RESULT|post_rollback_canonical_rows|' || count(*) from rf_canonical.rf_cnaes where dataset_version_id = '${datasetId}';
`));
  const interruptedDatasetId = "030a0000-0000-4000-8000-000000000003";
  const interruption = runPsqlRaw(container, `
begin;
insert into rf_canonical.rf_dataset_versions (
  id, dataset_version, competence_month, source, status, manifest_hash, file_count
) values (
  '${interruptedDatasetId}', 'RF03A-INTERRUPTED', '2026-04-01',
  'RF03A_FAILURE_INJECTION', 'VALIDATING', '${hash("rf03a-interrupted")}', 1
);
insert into rf_raw.rf_import_staging_rows (
  dataset_version_id, entity_type, source_row_number, raw_payload, source_record_hash
) values (
  '${interruptedDatasetId}', 'CNAE', 1, '{"code":"0111301"}', '${hash("interrupted-row")}'
);
select 1 / 0;
`);
  if (interruption.status === 0) throw new Error("Interrupted load injection did not fail");
  const interruptionVerification = parseResults(runPsql(container, String.raw`
\pset tuples_only on
\pset format unaligned
select 'RF_POC_RESULT|interrupted_dataset_rows|' || count(*) from rf_canonical.rf_dataset_versions where id = '${interruptedDatasetId}';
select 'RF_POC_RESULT|interrupted_staging_rows|' || count(*) from rf_raw.rf_import_staging_rows where dataset_version_id = '${interruptedDatasetId}';
`));

  const idempotent = metrics.first_staging_rows === metrics.second_staging_rows
    && metrics.first_canonical_rows === metrics.second_canonical_rows;
  const rolledBack = verification.post_rollback_dataset_rows === 0
    && verification.post_rollback_staging_rows === 0
    && verification.post_rollback_canonical_rows === 0;
  if (!idempotent) throw new Error("Database idempotency check failed");
  if (!rolledBack) throw new Error("POC cleanup verification failed");
  if (interruptionVerification.interrupted_dataset_rows !== 0 || interruptionVerification.interrupted_staging_rows !== 0) {
    throw new Error("Interrupted load left database residue");
  }

  return {
    ...metrics,
    ...verification,
    ...interruptionVerification,
    copy_rows_per_second: Math.round(maxRows / (metrics.copy_ms / 1000)),
    idempotency: "PASS",
    rollback_cleanup: "PASS",
    load_interruption_failure_injection: "PASS",
  };
}
