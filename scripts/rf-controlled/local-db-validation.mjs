import { execFileSync } from "node:child_process";

const containerFlag = process.argv.indexOf("--container");
const container = containerFlag >= 0 ? process.argv[containerFlag + 1] : "supabase_db_GSBC_2_-_Claude";
if (!container) throw new Error("CONTAINER_NAME_REQUIRED");
const dataset = "03b2b000-0000-4000-8000-000000000001";
const sql = String.raw`
\set ON_ERROR_STOP on
begin;
insert into rf_canonical.rf_dataset_versions(id,dataset_version,competence_month,source,status,manifest_hash,file_count,metadata)
values ('${dataset}','RF03B2B-MODE-A-FIXTURE','2026-09-01','RECEITA_FEDERAL_CNPJ_OPEN_DATA','VALIDATING',repeat('a',64),1,'{"mode":"PRE_REVENUE","fixture":true}')
on conflict(source,dataset_version) do nothing;
insert into rf_canonical.rf_companies(dataset_version_id,cnpj_root,legal_name,source_record_hash) values
('${dataset}','00000000','EMPRESA NUMERICA','company-numeric'),('${dataset}','00ABC000','EMPRESA ALFANUMERICA','company-alpha') on conflict do nothing;
insert into rf_canonical.rf_establishments(dataset_version_id,rf_company_id,cnpj_root,cnpj_order,cnpj_dv,cnpj_canonical,branch_type,trade_name,registration_status_code,main_cnae_code,state,municipality_code,source_record_hash)
select '${dataset}',id,cnpj_root,case when cnpj_root='00000000' then '0001' else 'E08G' end,'12',cnpj_root||case when cnpj_root='00000000' then '0001' else 'E08G' end||'12','MATRIZ',legal_name,'02',case when cnpj_root='00000000' then '6201501' else '6202300' end,case when cnpj_root='00000000' then 'SP' else 'RJ' end,case when cnpj_root='00000000' then '3550308' else '3304557' end,'est-'||cnpj_root
from rf_canonical.rf_companies where dataset_version_id='${dataset}' on conflict do nothing;
insert into rf_canonical.rf_simples_mei(dataset_version_id,cnpj_root,simples_option,simples_option_start_date,mei_option,source_record_hash)
values ('${dataset}','00000000',true,'2020-01-01',false,'simples-numeric'),('${dataset}','00ABC000',false,null,true,'simples-alpha') on conflict do nothing;
-- Idempotent retry.
insert into rf_canonical.rf_companies(dataset_version_id,cnpj_root,legal_name,source_record_hash) values ('${dataset}','00000000','EMPRESA NUMERICA','company-numeric') on conflict do nothing;
select 'RESULT|idempotent|'||(count(*)=2) from rf_canonical.rf_companies where dataset_version_id='${dataset}';
select 'RESULT|exact_cnpj|'||(count(*)=1) from rf_canonical.rf_establishments where dataset_version_id='${dataset}' and cnpj_canonical='00ABC000E08G12';
select 'RESULT|company_name|'||(count(*)=1) from rf_canonical.rf_companies where dataset_version_id='${dataset}' and legal_name like 'EMPRESA ALFA%';
select 'RESULT|cnae|'||(count(*)=1) from rf_canonical.rf_establishments where dataset_version_id='${dataset}' and main_cnae_code='6201501';
select 'RESULT|territory|'||(count(*)=1) from rf_canonical.rf_establishments where dataset_version_id='${dataset}' and state='RJ' and municipality_code='3304557';
select 'RESULT|simples_mei|'||(count(*)=2) from rf_canonical.rf_simples_mei where dataset_version_id='${dataset}' and (simples_option or mei_option);
select 'RESULT|company_est_join|'||(count(*)=2) from rf_canonical.rf_companies c join rf_canonical.rf_establishments e on e.rf_company_id=c.id where c.dataset_version_id='${dataset}';
select 'RESULT|company_simples_join|'||(count(*)=2) from rf_canonical.rf_companies c join rf_canonical.rf_simples_mei s on s.dataset_version_id=c.dataset_version_id and s.cnpj_root=c.cnpj_root where c.dataset_version_id='${dataset}';
create temp table controlled_prospect(cnpj_canonical text primary key,evidence jsonb,qualification_status text,promoted_company_id uuid) on commit drop;
insert into controlled_prospect select e.cnpj_canonical,jsonb_build_object('source','RF','dataset_version','RF03B2B-MODE-A-FIXTURE','reference_date','2026-09-01'),'HUMAN_REVIEW',null from rf_canonical.rf_establishments e where e.dataset_version_id='${dataset}' and e.cnpj_canonical='00ABC000E08G12';
update controlled_prospect p set promoted_company_id=e.rf_company_id from rf_canonical.rf_establishments e where e.dataset_version_id='${dataset}' and e.cnpj_canonical=p.cnpj_canonical;
select 'RESULT|prospect_flow|'||(count(*)=1) from controlled_prospect where qualification_status='HUMAN_REVIEW' and promoted_company_id is not null and evidence->>'source'='RF';
do $$begin begin insert into rf_canonical.rf_companies(dataset_version_id,cnpj_root,legal_name,source_record_hash) values ('${dataset}','BAD','INVALID','bad'); raise exception 'invalid CNPJ accepted'; exception when check_violation then null; end; end$$;
select 'RESULT|failed_load_closed|'||(count(*)=0) from rf_canonical.rf_companies where dataset_version_id='${dataset}' and source_record_hash='bad';
rollback;
select 'RESULT|residue_dataset|'||(count(*)=0) from rf_canonical.rf_dataset_versions where id='${dataset}';
select 'RESULT|residue_company|'||(count(*)=0) from rf_canonical.rf_companies where dataset_version_id='${dataset}';
select 'RESULT|residue_establishment|'||(count(*)=0) from rf_canonical.rf_establishments where dataset_version_id='${dataset}';
select 'RESULT|residue_simples|'||(count(*)=0) from rf_canonical.rf_simples_mei where dataset_version_id='${dataset}';
`;
const output = execFileSync("docker", ["exec", "-i", container, "psql", "-U", "postgres", "-d", "postgres", "-At"], { input: sql, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
const results = Object.fromEntries(output.split("\n").filter((line) => line.startsWith("RESULT|")).map((line) => { const [, key, value] = line.split("|"); return [key, value]; }));
const failed = Object.entries(results).filter(([, value]) => value !== "true");
if (failed.length || Object.keys(results).length !== 14) throw new Error(`LOCAL_DB_VALIDATION_FAILED:${JSON.stringify({ results, failed })}`);
process.stdout.write(`${JSON.stringify({ status: "PASS", environment: "LOCAL_DISPOSABLE_TRANSACTION", results, production_changed: false, national_ingestion: false }, null, 2)}\n`);
