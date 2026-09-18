import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

function csv(value) {
  const string = String(value ?? "");
  return /[",\r\n]/.test(string) ? `"${string.replaceAll('"', '""')}"` : string;
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function run(container, input, maxBuffer = 192 * 1024 * 1024) {
  const result = spawnSync("docker", ["exec", "-i", container, "psql", "-U", "postgres", "-d", "postgres", "-X", "--set", "ON_ERROR_STOP=1", "--quiet"], { input, encoding: "utf8", maxBuffer });
  if (result.status !== 0) throw new Error(`Group DB benchmark failed:\n${result.stdout.trim()}\n${result.stderr.trim()}`);
  return result.stdout;
}

function parse(output) {
  return Object.fromEntries(output.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.startsWith("RF_GROUP|"))
    .map((line) => {
      const [, key, value] = line.split("|");
      const number = Number(value);
      return [key, Number.isFinite(number) && value !== "" ? number : value];
    }));
}

function plan(output, start, end) {
  const from = output.indexOf(start);
  const to = output.indexOf(end);
  return from >= 0 && to > from ? output.slice(from + start.length, to).trim() : null;
}

export function benchmarkEstablishmentsAndSimples(establishments, simples, { container = "supabase_db_GSBC_2_-_Claude" } = {}) {
  if (!establishments.length || !simples.length) throw new Error("Both bounded groups require records");
  const dataset = "03b2a000-0000-4000-8000-000000000001";
  const establishmentFile = "03b2a000-0000-4000-8000-000000000002";
  const simplesFile = "03b2a000-0000-4000-8000-000000000003";
  const roots = [...new Set([...establishments.map((row) => row.cnpj_root), ...simples.map((row) => row.cnpj_root)])];
  const companyCsv = roots.map((root) => [root, `BENCHMARK ${root}`, hash(`company:${root}`)].map(csv).join(",")).join("\n") + "\n";
  const rows = [
    ...establishments.map((record, index) => [dataset, establishmentFile, "ESTABELECIMENTO", index + 1, JSON.stringify(record), record.source_record_hash, "STAGED"].map(csv).join(",")),
    ...simples.map((record, index) => [dataset, simplesFile, "SIMPLES", index + 1, JSON.stringify(record), record.source_record_hash, "STAGED"].map(csv).join(",")),
  ].join("\n") + "\n";
  const setup = String.raw`
\pset tuples_only on
\pset format unaligned
begin;
create temp table rf_group_state as select pg_current_wal_lsn() wal_start, coalesce(sum(pg_total_relation_size(format('%I.%I',schemaname,relname))),0)::bigint bytes_before from pg_stat_user_tables where schemaname in ('rf_raw','rf_canonical');
create temp table rf_group_timing(label text primary key, at timestamptz not null);
create temp table rf_group_queries(kind text, ms numeric not null);
create temp table rf_group_companies(cnpj_root text,legal_name text,source_hash text) on commit drop;
create temp table rf_group_landing(dataset_version_id uuid,dataset_file_id uuid,entity_type text,source_row_number bigint,raw_payload jsonb,source_record_hash text,load_status text) on commit drop;
insert into rf_canonical.rf_dataset_versions(id,dataset_version,competence_month,source,status,manifest_hash,file_count)
values ('${dataset}','RF03B2A-2026-09','2026-09-01','RECEITA_FEDERAL_CNPJ_OPEN_DATA','VALIDATING','${hash("rf03b2a")}',2);
insert into rf_canonical.rf_dataset_files(id,dataset_version_id,file_type,identifier,status) values
('${establishmentFile}','${dataset}','ESTABELECIMENTO','Estabelecimentos7.zip','VERIFIED'),
('${simplesFile}','${dataset}','SIMPLES','Simples.zip','VERIFIED');
\copy rf_group_companies from stdin with(format csv)
`;
  const afterCompanies = String.raw`\.
insert into rf_canonical.rf_companies(dataset_version_id,cnpj_root,legal_name,source_file_id,source_record_hash)
select '${dataset}',cnpj_root,legal_name,'${establishmentFile}',source_hash from rf_group_companies on conflict(dataset_version_id,cnpj_root) do nothing;
insert into rf_group_timing values ('copy_start',clock_timestamp());
\copy rf_group_landing from stdin with(format csv)
`;
  const normalize = String.raw`\.
insert into rf_group_timing values ('copy_end',clock_timestamp()),('est_start',clock_timestamp());
insert into rf_raw.rf_import_staging_rows(dataset_version_id,dataset_file_id,entity_type,source_row_number,raw_payload,source_record_hash,load_status)
select dataset_version_id,dataset_file_id,entity_type,source_row_number,raw_payload,source_record_hash,load_status from rf_group_landing
on conflict(dataset_version_id,entity_type,source_record_hash) do nothing;
insert into rf_canonical.rf_establishments(dataset_version_id,rf_company_id,cnpj_root,cnpj_order,cnpj_dv,cnpj_canonical,branch_type,trade_name,registration_status_code,registration_status_date,registration_status_reason_code,foreign_city,country_code,activity_start_date,main_cnae_code,state,municipality_code,source_file_id,source_record_hash)
select '${dataset}',c.id,r.raw_payload->>'cnpj_root',r.raw_payload->>'cnpj_order',r.raw_payload->>'cnpj_dv',r.raw_payload->>'cnpj_canonical',r.raw_payload->>'branch_type',r.raw_payload->>'trade_name',r.raw_payload->>'registration_status_code',nullif(r.raw_payload->>'registration_status_date','')::date,r.raw_payload->>'registration_status_reason_code',r.raw_payload->>'foreign_city',r.raw_payload->>'country_code',nullif(r.raw_payload->>'activity_start_date','')::date,r.raw_payload->>'main_cnae_code',r.raw_payload->>'state',r.raw_payload->>'municipality_code','${establishmentFile}',r.source_record_hash
from rf_group_landing r join rf_canonical.rf_companies c on c.dataset_version_id='${dataset}' and c.cnpj_root=r.raw_payload->>'cnpj_root'
where r.entity_type='ESTABELECIMENTO' on conflict(dataset_version_id,cnpj_canonical) do nothing;
insert into rf_canonical.rf_establishment_secondary_cnaes(dataset_version_id,rf_establishment_id,cnae_code,source_record_hash)
select '${dataset}',e.id,cnae,encode(digest(e.source_record_hash||':'||cnae,'sha256'),'hex')
from rf_group_landing r join rf_canonical.rf_establishments e on e.dataset_version_id='${dataset}' and e.source_record_hash=r.source_record_hash
cross join lateral jsonb_array_elements_text(r.raw_payload->'secondary_cnae_codes') cnae
where r.entity_type='ESTABELECIMENTO' and cnae ~ '^[0-9]{7}$' on conflict(rf_establishment_id,cnae_code) do nothing;
insert into rf_group_timing values ('est_end',clock_timestamp());
select pg_current_wal_lsn() into temporary table rf_group_est_wal;
insert into rf_group_timing values ('simples_start',clock_timestamp());
insert into rf_canonical.rf_simples_mei(dataset_version_id,cnpj_root,simples_option,simples_option_start_date,simples_option_end_date,mei_option,mei_option_start_date,mei_option_end_date,source_file_id,source_record_hash)
select '${dataset}',raw_payload->>'cnpj_root',(raw_payload->>'simples_option')::boolean,nullif(raw_payload->>'simples_option_start_date','')::date,nullif(raw_payload->>'simples_option_end_date','')::date,(raw_payload->>'mei_option')::boolean,nullif(raw_payload->>'mei_option_start_date','')::date,nullif(raw_payload->>'mei_option_end_date','')::date,'${simplesFile}',source_record_hash
from rf_group_landing where entity_type='SIMPLES' on conflict(dataset_version_id,cnpj_root) do nothing;
update rf_raw.rf_import_staging_rows set load_status='NORMALIZED' where dataset_version_id='${dataset}';
insert into rf_group_timing values ('simples_end',clock_timestamp());
select 'RF_GROUP|first_est_staged|'||count(*) from rf_raw.rf_import_staging_rows where dataset_version_id='${dataset}' and entity_type='ESTABELECIMENTO';
select 'RF_GROUP|first_simples_staged|'||count(*) from rf_raw.rf_import_staging_rows where dataset_version_id='${dataset}' and entity_type='SIMPLES';
select 'RF_GROUP|first_est_canonical|'||count(*) from rf_canonical.rf_establishments where dataset_version_id='${dataset}';
select 'RF_GROUP|first_simples_canonical|'||count(*) from rf_canonical.rf_simples_mei where dataset_version_id='${dataset}';
select 'RF_GROUP|secondary_cnaes|'||count(*) from rf_canonical.rf_establishment_secondary_cnaes where dataset_version_id='${dataset}';
truncate rf_group_landing;
\copy rf_group_landing from stdin with(format csv)
`;
  const finish = String.raw`\.
insert into rf_raw.rf_import_staging_rows(dataset_version_id,dataset_file_id,entity_type,source_row_number,raw_payload,source_record_hash,load_status)
select dataset_version_id,dataset_file_id,entity_type,source_row_number,raw_payload,source_record_hash,load_status from rf_group_landing on conflict(dataset_version_id,entity_type,source_record_hash) do nothing;
insert into rf_canonical.rf_establishments(dataset_version_id,rf_company_id,cnpj_root,cnpj_order,cnpj_dv,cnpj_canonical,branch_type,trade_name,registration_status_code,registration_status_date,registration_status_reason_code,foreign_city,country_code,activity_start_date,main_cnae_code,state,municipality_code,source_file_id,source_record_hash)
select '${dataset}',c.id,r.raw_payload->>'cnpj_root',r.raw_payload->>'cnpj_order',r.raw_payload->>'cnpj_dv',r.raw_payload->>'cnpj_canonical',r.raw_payload->>'branch_type',r.raw_payload->>'trade_name',r.raw_payload->>'registration_status_code',nullif(r.raw_payload->>'registration_status_date','')::date,r.raw_payload->>'registration_status_reason_code',r.raw_payload->>'foreign_city',r.raw_payload->>'country_code',nullif(r.raw_payload->>'activity_start_date','')::date,r.raw_payload->>'main_cnae_code',r.raw_payload->>'state',r.raw_payload->>'municipality_code','${establishmentFile}',r.source_record_hash
from rf_group_landing r join rf_canonical.rf_companies c on c.dataset_version_id='${dataset}' and c.cnpj_root=r.raw_payload->>'cnpj_root' where r.entity_type='ESTABELECIMENTO' on conflict(dataset_version_id,cnpj_canonical) do nothing;
insert into rf_canonical.rf_simples_mei(dataset_version_id,cnpj_root,simples_option,simples_option_start_date,simples_option_end_date,mei_option,mei_option_start_date,mei_option_end_date,source_file_id,source_record_hash)
select '${dataset}',raw_payload->>'cnpj_root',(raw_payload->>'simples_option')::boolean,nullif(raw_payload->>'simples_option_start_date','')::date,nullif(raw_payload->>'simples_option_end_date','')::date,(raw_payload->>'mei_option')::boolean,nullif(raw_payload->>'mei_option_start_date','')::date,nullif(raw_payload->>'mei_option_end_date','')::date,'${simplesFile}',source_record_hash from rf_group_landing where entity_type='SIMPLES' on conflict(dataset_version_id,cnpj_root) do nothing;
select 'RF_GROUP|second_est_staged|'||count(*) from rf_raw.rf_import_staging_rows where dataset_version_id='${dataset}' and entity_type='ESTABELECIMENTO';
select 'RF_GROUP|second_simples_staged|'||count(*) from rf_raw.rf_import_staging_rows where dataset_version_id='${dataset}' and entity_type='SIMPLES';
select 'RF_GROUP|second_est_canonical|'||count(*) from rf_canonical.rf_establishments where dataset_version_id='${dataset}';
select 'RF_GROUP|second_simples_canonical|'||count(*) from rf_canonical.rf_simples_mei where dataset_version_id='${dataset}';
do $$ declare k text;t timestamptz;begin
for k in select cnpj_canonical from rf_canonical.rf_establishments where dataset_version_id='${dataset}' limit 100 loop t:=clock_timestamp();perform id from rf_canonical.rf_establishments where dataset_version_id='${dataset}' and cnpj_canonical=k;insert into rf_group_queries values('EST',extract(epoch from(clock_timestamp()-t))*1000);end loop;
for k in select cnpj_root from rf_canonical.rf_simples_mei where dataset_version_id='${dataset}' limit 100 loop t:=clock_timestamp();perform id from rf_canonical.rf_simples_mei where dataset_version_id='${dataset}' and cnpj_root=k;insert into rf_group_queries values('SIMPLES',extract(epoch from(clock_timestamp()-t))*1000);end loop;
end$$;
select 'RF_GROUP|est_query_p50_ms|'||round(percentile_cont(.5)within group(order by ms)::numeric,6) from rf_group_queries where kind='EST';
select 'RF_GROUP|est_query_p95_ms|'||round(percentile_cont(.95)within group(order by ms)::numeric,6) from rf_group_queries where kind='EST';
select 'RF_GROUP|est_query_max_ms|'||round(max(ms),6) from rf_group_queries where kind='EST';
select 'RF_GROUP|simples_query_p50_ms|'||round(percentile_cont(.5)within group(order by ms)::numeric,6) from rf_group_queries where kind='SIMPLES';
select 'RF_GROUP|simples_query_p95_ms|'||round(percentile_cont(.95)within group(order by ms)::numeric,6) from rf_group_queries where kind='SIMPLES';
select 'RF_GROUP|simples_query_max_ms|'||round(max(ms),6) from rf_group_queries where kind='SIMPLES';
select 'RF_GROUP|copy_ms|'||round(extract(epoch from((select at from rf_group_timing where label='copy_end')-(select at from rf_group_timing where label='copy_start')))*1000,3);
select 'RF_GROUP|est_normalize_ms|'||round(extract(epoch from((select at from rf_group_timing where label='est_end')-(select at from rf_group_timing where label='est_start')))*1000,3);
select 'RF_GROUP|simples_normalize_ms|'||round(extract(epoch from((select at from rf_group_timing where label='simples_end')-(select at from rf_group_timing where label='simples_start')))*1000,3);
select 'RF_GROUP|relation_bytes_before|'||bytes_before from rf_group_state;
select 'RF_GROUP|relation_bytes_during|'||coalesce(sum(pg_total_relation_size(format('%I.%I',schemaname,relname))),0) from pg_stat_user_tables where schemaname in('rf_raw','rf_canonical');
select 'RF_GROUP|est_table_bytes|'||pg_total_relation_size('rf_canonical.rf_establishments');
select 'RF_GROUP|est_index_bytes|'||pg_indexes_size('rf_canonical.rf_establishments');
select 'RF_GROUP|secondary_table_bytes|'||pg_total_relation_size('rf_canonical.rf_establishment_secondary_cnaes');
select 'RF_GROUP|simples_table_bytes|'||pg_total_relation_size('rf_canonical.rf_simples_mei');
select 'RF_GROUP|simples_index_bytes|'||pg_indexes_size('rf_canonical.rf_simples_mei');
select 'RF_GROUP|staging_est_payload_bytes|'||coalesce(sum(pg_column_size(raw_payload)),0) from rf_raw.rf_import_staging_rows where dataset_version_id='${dataset}' and entity_type='ESTABELECIMENTO';
select 'RF_GROUP|staging_simples_payload_bytes|'||coalesce(sum(pg_column_size(raw_payload)),0) from rf_raw.rf_import_staging_rows where dataset_version_id='${dataset}' and entity_type='SIMPLES';
select 'RF_GROUP|wal_bytes|'||pg_wal_lsn_diff(pg_current_wal_lsn(),wal_start)::bigint from rf_group_state;
select 'RF_GROUP|company_est_join_rows|'||count(*) from rf_canonical.rf_companies c join rf_canonical.rf_establishments e on e.rf_company_id=c.id where c.dataset_version_id='${dataset}';
select 'RF_GROUP|company_simples_join_rows|'||count(*) from rf_canonical.rf_companies c join rf_canonical.rf_simples_mei s on s.dataset_version_id=c.dataset_version_id and s.cnpj_root=c.cnpj_root where c.dataset_version_id='${dataset}';
do $$begin begin insert into rf_canonical.rf_establishments(dataset_version_id,rf_company_id,cnpj_root,cnpj_order,cnpj_dv,cnpj_canonical,branch_type,source_record_hash) select '${dataset}',id,'BAD','1','X','BAD','MATRIZ','bad' from rf_canonical.rf_companies where dataset_version_id='${dataset}' limit 1;raise exception 'normalization failure did not fail';exception when check_violation then null;end;end$$;
select 'RF_GROUP|normalization_failure|PASS';
\echo RF_EST_PLAN_START
explain(analyze,buffers) select c.legal_name,e.cnpj_canonical,e.registration_status_code from rf_canonical.rf_companies c join rf_canonical.rf_establishments e on e.rf_company_id=c.id where e.dataset_version_id='${dataset}' and e.cnpj_canonical=(select cnpj_canonical from rf_canonical.rf_establishments where dataset_version_id='${dataset}' limit 1);
\echo RF_EST_PLAN_END
\echo RF_SIMPLES_PLAN_START
explain(analyze,buffers) select c.legal_name,s.simples_option,s.mei_option from rf_canonical.rf_companies c join rf_canonical.rf_simples_mei s on s.dataset_version_id=c.dataset_version_id and s.cnpj_root=c.cnpj_root where s.dataset_version_id='${dataset}' and s.cnpj_root=(select cnpj_root from rf_canonical.rf_simples_mei where dataset_version_id='${dataset}' limit 1);
\echo RF_SIMPLES_PLAN_END
rollback;
`;
  const output = run(container, setup + companyCsv + afterCompanies + rows + normalize + rows + finish);
  const metrics = parse(output);
  const verify = parse(run(container, String.raw`
\pset tuples_only on
\pset format unaligned
select 'RF_GROUP|residue_dataset|'||count(*) from rf_canonical.rf_dataset_versions where id='${dataset}';
select 'RF_GROUP|residue_staging|'||count(*) from rf_raw.rf_import_staging_rows where dataset_version_id='${dataset}';
select 'RF_GROUP|residue_est|'||count(*) from rf_canonical.rf_establishments where dataset_version_id='${dataset}';
select 'RF_GROUP|residue_simples|'||count(*) from rf_canonical.rf_simples_mei where dataset_version_id='${dataset}';
`));
  const idempotent = metrics.first_est_staged === metrics.second_est_staged && metrics.first_simples_staged === metrics.second_simples_staged && metrics.first_est_canonical === metrics.second_est_canonical && metrics.first_simples_canonical === metrics.second_simples_canonical;
  if (!idempotent) throw new Error("Group rerun is not idempotent");
  if (Object.values(verify).some((value) => value !== 0)) throw new Error("Group benchmark left residue");
  return {
    ...metrics, ...verify, idempotency: "PASS", cleanup: "PASS", load_failure: "PASS_BY_TRANSACTION_TEST",
    load_rows_per_second: Math.round((establishments.length + simples.length) / (metrics.copy_ms / 1000)),
    est_normalization_rows_per_second: Math.round(establishments.length / (metrics.est_normalize_ms / 1000)),
    simples_normalization_rows_per_second: Math.round(simples.length / (metrics.simples_normalize_ms / 1000)),
    establishment_explain_analyze: plan(output, "RF_EST_PLAN_START", "RF_EST_PLAN_END"),
    simples_explain_analyze: plan(output, "RF_SIMPLES_PLAN_START", "RF_SIMPLES_PLAN_END"),
  };
}
