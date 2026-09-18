import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

function csv(value) {
  const string = String(value ?? "");
  return /[",\r\n]/.test(string) ? `"${string.replaceAll('"', '""')}"` : string;
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function psql(container, input, maxBuffer = 128 * 1024 * 1024) {
  return spawnSync(
    "docker",
    ["exec", "-i", container, "psql", "-U", "postgres", "-d", "postgres", "-X", "--set", "ON_ERROR_STOP=1", "--quiet"],
    { input, encoding: "utf8", maxBuffer },
  );
}

function requireSuccess(result, label) {
  if (result.status !== 0) throw new Error(`${label} failed:\n${result.stdout.trim()}\n${result.stderr.trim()}`);
  return result.stdout;
}

function parseResults(output) {
  return Object.fromEntries(output.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.startsWith("RF_BENCH|"))
    .map((line) => {
      const [, key, value] = line.split("|");
      const number = Number(value);
      return [key, Number.isFinite(number) && value !== "" ? number : value];
    }));
}

function planBetween(output, start, end) {
  const from = output.indexOf(start);
  const to = output.indexOf(end);
  return from >= 0 && to > from ? output.slice(from + start.length, to).trim() : null;
}

export function benchmarkCompanies(records, { container = "supabase_db_GSBC_2_-_Claude" } = {}) {
  if (records.length === 0) throw new Error("Company benchmark requires records");
  const datasetId = "03b10000-0000-4000-8000-000000000001";
  const fileId = "03b10000-0000-4000-8000-000000000002";
  const previousId = "03b10000-0000-4000-8000-000000000003";
  const rows = records.map((record, index) => {
    const payload = JSON.stringify(record);
    return [datasetId, fileId, "EMPRESA", index + 1, payload, record.source_record_hash, "STAGED"].map(csv).join(",");
  }).join("\n") + "\n";
  const setup = String.raw`
\pset tuples_only on
\pset format unaligned
begin;
create temp table rf_bench_state as
select pg_current_wal_lsn() as wal_start,
       coalesce(sum(pg_total_relation_size(format('%I.%I', schemaname, relname))),0)::bigint as bytes_before
from pg_stat_user_tables where schemaname in ('rf_raw','rf_canonical');
create temp table rf_bench_timing(label text primary key, at timestamptz not null);
create temp table rf_bench_queries(ms numeric not null);
create temp table rf_bench_landing (
  dataset_version_id uuid, dataset_file_id uuid, entity_type text,
  source_row_number bigint, raw_payload jsonb, source_record_hash text, load_status text
) on commit drop;
insert into rf_canonical.rf_dataset_versions
  (id,dataset_version,competence_month,source,status,manifest_hash,file_count,published_at)
values
  ('${previousId}','RF03B1-PREVIOUS','2026-08-01','RECEITA_FEDERAL_CNPJ_OPEN_DATA','PUBLISHED','${hash("previous")}',1,now()),
  ('${datasetId}','RF03B1-2026-09-EMPRESAS1','2026-09-01','RECEITA_FEDERAL_CNPJ_OPEN_DATA','VALIDATING','${hash("empresas1")}',1,null);
update rf_canonical.rf_dataset_versions set is_current=true,published_at=now() where id='${previousId}';
insert into rf_canonical.rf_dataset_files
  (id,dataset_version_id,file_type,identifier,status)
values ('${fileId}','${datasetId}','EMPRESA','Empresas1.zip','VERIFIED');
insert into rf_bench_timing values ('copy_start',clock_timestamp());
\copy rf_bench_landing from stdin with (format csv)
`;
  const first = String.raw`\.
insert into rf_bench_timing values ('copy_end',clock_timestamp()),('normalize_start',clock_timestamp());
insert into rf_raw.rf_import_staging_rows
  (dataset_version_id,dataset_file_id,entity_type,source_row_number,raw_payload,source_record_hash,load_status)
select dataset_version_id,dataset_file_id,entity_type,source_row_number,raw_payload,source_record_hash,load_status
from rf_bench_landing on conflict (dataset_version_id,entity_type,source_record_hash) do nothing;
insert into rf_canonical.rf_companies
  (dataset_version_id,cnpj_root,legal_name,legal_nature_code,responsible_qualification_code,share_capital,company_size_code,federative_entity,source_file_id,source_record_hash)
select dataset_version_id,raw_payload->>'cnpj_root',raw_payload->>'legal_name',raw_payload->>'legal_nature_code',
       raw_payload->>'responsible_qualification_code',nullif(raw_payload->>'share_capital','')::numeric,
       raw_payload->>'company_size_code',raw_payload->>'federative_entity',dataset_file_id,source_record_hash
from rf_bench_landing on conflict (dataset_version_id,cnpj_root) do nothing;
update rf_raw.rf_import_staging_rows set load_status='NORMALIZED' where dataset_version_id='${datasetId}';
insert into rf_bench_timing values ('normalize_end',clock_timestamp());
select 'RF_BENCH|first_staged|'||count(*) from rf_raw.rf_import_staging_rows where dataset_version_id='${datasetId}';
select 'RF_BENCH|first_canonical|'||count(*) from rf_canonical.rf_companies where dataset_version_id='${datasetId}';
truncate rf_bench_landing;
\copy rf_bench_landing from stdin with (format csv)
`;
  const finish = String.raw`\.
insert into rf_raw.rf_import_staging_rows
  (dataset_version_id,dataset_file_id,entity_type,source_row_number,raw_payload,source_record_hash,load_status)
select dataset_version_id,dataset_file_id,entity_type,source_row_number,raw_payload,source_record_hash,load_status
from rf_bench_landing on conflict (dataset_version_id,entity_type,source_record_hash) do nothing;
insert into rf_canonical.rf_companies
  (dataset_version_id,cnpj_root,legal_name,legal_nature_code,responsible_qualification_code,share_capital,company_size_code,federative_entity,source_file_id,source_record_hash)
select dataset_version_id,raw_payload->>'cnpj_root',raw_payload->>'legal_name',raw_payload->>'legal_nature_code',
       raw_payload->>'responsible_qualification_code',nullif(raw_payload->>'share_capital','')::numeric,
       raw_payload->>'company_size_code',raw_payload->>'federative_entity',dataset_file_id,source_record_hash
from rf_bench_landing on conflict (dataset_version_id,cnpj_root) do nothing;
select 'RF_BENCH|second_staged|'||count(*) from rf_raw.rf_import_staging_rows where dataset_version_id='${datasetId}';
select 'RF_BENCH|second_canonical|'||count(*) from rf_canonical.rf_companies where dataset_version_id='${datasetId}';
do $$ declare root text; t timestamptz; begin
  for root in select cnpj_root from rf_canonical.rf_companies where dataset_version_id='${datasetId}' limit 100 loop
    t := clock_timestamp(); perform id from rf_canonical.rf_companies where dataset_version_id='${datasetId}' and cnpj_root=root;
    insert into rf_bench_queries values (extract(epoch from (clock_timestamp()-t))*1000);
  end loop;
end $$;
select 'RF_BENCH|query_p50_ms|'||round(percentile_cont(0.50) within group(order by ms)::numeric,6) from rf_bench_queries;
select 'RF_BENCH|query_p95_ms|'||round(percentile_cont(0.95) within group(order by ms)::numeric,6) from rf_bench_queries;
select 'RF_BENCH|query_max_ms|'||round(max(ms),6) from rf_bench_queries;
select 'RF_BENCH|copy_ms|'||round(extract(epoch from ((select at from rf_bench_timing where label='copy_end')-(select at from rf_bench_timing where label='copy_start')))*1000,3);
select 'RF_BENCH|normalize_ms|'||round(extract(epoch from ((select at from rf_bench_timing where label='normalize_end')-(select at from rf_bench_timing where label='normalize_start')))*1000,3);
select 'RF_BENCH|relation_bytes_before|'||bytes_before from rf_bench_state;
select 'RF_BENCH|relation_bytes_during|'||coalesce(sum(pg_total_relation_size(format('%I.%I',schemaname,relname))),0) from pg_stat_user_tables where schemaname in ('rf_raw','rf_canonical');
select 'RF_BENCH|company_table_bytes|'||pg_total_relation_size('rf_canonical.rf_companies');
select 'RF_BENCH|company_index_bytes|'||pg_indexes_size('rf_canonical.rf_companies');
select 'RF_BENCH|wal_bytes|'||pg_wal_lsn_diff(pg_current_wal_lsn(),wal_start)::bigint from rf_bench_state;
do $$ begin
  begin
    insert into rf_canonical.rf_companies(dataset_version_id,cnpj_root,legal_name,source_record_hash)
    values ('${datasetId}','BAD','failure','${hash("invalid") }');
    raise exception 'normalization failure injection did not fail';
  exception when check_violation then null; end;
end $$;
select 'RF_BENCH|normalization_failure|PASS';
update rf_canonical.rf_dataset_versions set status='RETIRED',is_current=false where id='${previousId}';
update rf_canonical.rf_dataset_versions set status='PUBLISHED',is_current=true,published_at=now() where id='${datasetId}';
select 'RF_BENCH|bounded_publish_current|'||count(*) from rf_canonical.rf_dataset_versions where id='${datasetId}' and is_current;
select 'RF_BENCH|previous_retained|'||count(*) from rf_canonical.rf_dataset_versions where id='${previousId}' and status='RETIRED';
\echo RF_LOOKUP_PLAN_START
explain (analyze,buffers) select * from rf_canonical.rf_companies where dataset_version_id='${datasetId}' and cnpj_root=(select cnpj_root from rf_canonical.rf_companies where dataset_version_id='${datasetId}' limit 1);
\echo RF_LOOKUP_PLAN_END
\echo RF_PREFIX_PLAN_START
explain (analyze,buffers) select cnpj_root,legal_name from rf_canonical.rf_companies where dataset_version_id='${datasetId}' and legal_name like 'A%' order by legal_name limit 50;
\echo RF_PREFIX_PLAN_END
rollback;
`;
  const output = requireSuccess(psql(container, setup + rows + first + rows + finish), "Company benchmark");
  const metrics = parseResults(output);
  const verify = parseResults(requireSuccess(psql(container, String.raw`
\pset tuples_only on
\pset format unaligned
select 'RF_BENCH|post_rollback_dataset|'||count(*) from rf_canonical.rf_dataset_versions where id in ('${datasetId}','${previousId}');
select 'RF_BENCH|post_rollback_staging|'||count(*) from rf_raw.rf_import_staging_rows where dataset_version_id='${datasetId}';
select 'RF_BENCH|post_rollback_canonical|'||count(*) from rf_canonical.rf_companies where dataset_version_id='${datasetId}';
`), "Cleanup verification"));
  const interrupted = psql(container, String.raw`
begin;
insert into rf_canonical.rf_dataset_versions(id,dataset_version,competence_month,source,status,manifest_hash,file_count)
values ('${datasetId}','RF03B1-FAILED','2026-09-01','RF03B1_FAILURE','VALIDATING','${hash("failure")}',1);
select 1/0;
`);
  if (interrupted.status === 0) throw new Error("Database load failure injection did not fail");
  const interruptedVerify = parseResults(requireSuccess(psql(container, String.raw`
\pset tuples_only on
\pset format unaligned
select 'RF_BENCH|failed_load_residue|'||count(*) from rf_canonical.rf_dataset_versions where id='${datasetId}';
select 'RF_BENCH|failed_publish_residue|'||count(*) from rf_canonical.rf_dataset_versions where id='${datasetId}' and is_current;
`), "Failed-load cleanup verification"));
  const idempotent = metrics.first_staged === metrics.second_staged && metrics.first_canonical === metrics.second_canonical;
  const cleaned = verify.post_rollback_dataset === 0 && verify.post_rollback_staging === 0 && verify.post_rollback_canonical === 0;
  if (!idempotent) throw new Error("Company load is not idempotent");
  if (!cleaned) throw new Error("Company benchmark left database residue");
  return {
    ...metrics,
    ...verify,
    ...interruptedVerify,
    load_rows_per_second: Math.round(records.length / (metrics.copy_ms / 1000)),
    normalization_rows_per_second: Math.round(records.length / (metrics.normalize_ms / 1000)),
    idempotency: "PASS",
    rollback_cleanup: "PASS",
    load_failure_injection: "PASS",
    no_publish_on_failure: interruptedVerify.failed_load_residue === 0 && interruptedVerify.failed_publish_residue === 0 ? "PASS" : "FAIL",
    lookup_explain_analyze: planBetween(output, "RF_LOOKUP_PLAN_START", "RF_LOOKUP_PLAN_END"),
    prefix_explain_analyze: planBetween(output, "RF_PREFIX_PLAN_START", "RF_PREFIX_PLAN_END"),
  };
}
