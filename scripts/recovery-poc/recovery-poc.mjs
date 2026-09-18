#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { createRecoveryPoint, decodeKey, decryptFile, verifiedRecoveryPoints } from "./recovery-lib.mjs";

const root = process.cwd();
const mode = process.argv[2] ?? "run";
const container = process.env.RECOVERY_POC_DB_CONTAINER ?? "supabase_db_GSBC_2_-_Claude";
const output = resolve(process.env.RECOVERY_POC_OUTPUT ?? join(root, ".recovery-poc"));
const independent = resolve(process.env.RECOVERY_POC_INDEPENDENT_DIR ?? join(output, "independent-copy"));
const lock = join(output, "backup.lock");
const failurePath = join(output, "last-failure.json");
const backupPath = join(output, "last-backup.json");
const restorePath = join(output, "last-restore.json");

function recoveryKey() {
  return decodeKey(process.env.RECOVERY_POC_KEY_BASE64);
}

function run(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: options.stdio ?? ["ignore", "pipe", "pipe"], ...options });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => { stdout += chunk; });
    child.stderr?.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolvePromise(stdout) : reject(new Error(`${command} exited ${code}: ${stderr}`)));
  });
}

async function dumpToFile(args, destination) {
  const child = spawn("docker", ["exec", container, ...args], { stdio: ["ignore", "pipe", "pipe"] });
  const file = createWriteStream(destination, { flags: "wx" });
  let stderr = "";
  child.stdout.pipe(file);
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const processDone = new Promise((resolvePromise, reject) => {
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolvePromise() : reject(new Error(`dump exited ${code}: ${stderr}`)));
  });
  const fileDone = new Promise((resolvePromise, reject) => {
    file.on("close", resolvePromise);
    file.on("error", reject);
  });
  await Promise.all([processDone, fileDone]);
}

async function backup() {
  const started = performance.now();
  const work = await mkdtemp(join(tmpdir(), "gsbc-recovery-backup-"));
  const id = new Date().toISOString().replace(/[:.]/g, "-");
  try {
    const dbDump = join(work, "database.dump");
    const roles = join(work, "roles.sql");
    const dumpStarted = performance.now();
    await dumpToFile([
      "pg_dump", "-U", "postgres", "-d", "postgres", "--format=custom", "--no-owner",
      "--exclude-schema=realtime", "--exclude-schema=_realtime", "--exclude-schema=supabase_functions",
      "--exclude-schema=net", "--exclude-schema=graphql", "--exclude-schema=graphql_public",
      "--exclude-schema=vault", "--exclude-schema=pgbouncer", "--exclude-schema=pgsodium",
      "--exclude-extension=supabase_vault",
    ], dbDump);
    await dumpToFile(["pg_dumpall", "-U", "postgres", "--roles-only"], roles);
    const dumpMs = performance.now() - dumpStarted;
    const containerDump = `/tmp/gsbc-recovery-${process.pid}.dump`;
    await run("docker", ["cp", dbDump, `${container}:${containerDump}`]);
    const restoreList = await run("docker", ["exec", container, "pg_restore", "--list", containerDump]);
    const applicationAcl = restoreList.split("\n").filter((line) =>
      line.startsWith(";") ||
      (line.includes(" ACL ") && !line.includes("DEFAULT ACL") && [" public ", " rf_raw ", " rf_canonical "].some((schema) => line.includes(schema))),
    ).join("\n");
    await writeFile(join(work, "application-acl.list"), `${applicationAcl}\n`);
    await run("docker", ["exec", container, "rm", "-f", containerDump]);
    const dbSize = Number((await run("docker", ["exec", container, "psql", "-U", "postgres", "-d", "postgres", "-Atc", "select pg_database_size(current_database())"])).trim());
    const metadata = { databaseBytes: dbSize, dumpBytes: (await stat(dbDump)).size, dumpDurationMs: Math.round(dumpMs) };
    await writeFile(join(work, "source.json"), `${JSON.stringify(metadata)}\n`);
    const bundle = join(work, "backup.tar");
    await run("tar", ["-cf", bundle, "-C", work, "database.dump", "roles.sql", "source.json", "application-acl.list"]);
    const result = await createRecoveryPoint({
      bundlePath: bundle,
      independentDir: independent,
      lockDir: lock,
      key: recoveryKey(),
      id,
      sourceMetadata: metadata,
      injectFailureAt: process.env.RECOVERY_POC_INJECT_FAILURE,
    });
    const completed = { ...result, backupTotalMs: Math.round(performance.now() - started) };
    await writeFile(backupPath, `${JSON.stringify({ at: new Date().toISOString(), result: completed })}\n`);
    await rm(failurePath, { force: true });
    return completed;
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

async function restore() {
  const started = performance.now();
  const points = await verifiedRecoveryPoints(independent);
  if (points.length === 0) throw new Error("No verified recovery point exists");
  const point = points[0];
  const work = await mkdtemp(join(tmpdir(), "gsbc-recovery-restore-"));
  const database = `recovery_poc_${process.pid}_${Date.now()}`;
  const containerDump = `/tmp/${database}.dump`;
  const containerAcl = `/tmp/${database}.acl.list`;
  try {
    const bundle = join(work, "backup.tar");
    const decryptStarted = performance.now();
    await decryptFile(point.backupPath, bundle, recoveryKey());
    const decryptMs = performance.now() - decryptStarted;
    await run("tar", ["-xf", bundle, "-C", work]);
    const dbDump = join(work, "database.dump");
    const aclList = join(work, "application-acl.list");
    await run("docker", ["cp", dbDump, `${container}:${containerDump}`]);
    await run("docker", ["cp", aclList, `${container}:${containerAcl}`]);
    await run("docker", ["exec", container, "createdb", "-U", "postgres", database]);
    const restoreStarted = performance.now();
    await run("docker", ["exec", container, "pg_restore", "-U", "postgres", "-d", database, "--no-owner", "--no-privileges", "--exit-on-error", containerDump]);
    await run("docker", ["exec", container, "pg_restore", "-U", "postgres", "-d", database, "--no-owner", "--exit-on-error", "--use-list", containerAcl, containerDump]);
    const restoreMs = performance.now() - restoreStarted;
    const validationSql = [
      "select json_build_object(",
      "'public_tables',(select count(*) from pg_tables where schemaname='public'),",
      "'public_rows',(select coalesce(sum(n_live_tup),0)::bigint from pg_stat_user_tables where schemaname in ('public','rf_raw','rf_canonical')),",
      "'rls_tables',(select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relrowsecurity),",
      "'rls_policies',(select count(*) from pg_policies where schemaname='public'),",
      "'constraints',(select count(*) from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname in ('public','rf_raw','rf_canonical')),",
      "'indexes',(select count(*) from pg_indexes where schemaname in ('public','rf_raw','rf_canonical')),",
      "'functions',(select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'),",
      "'triggers',(select count(*) from information_schema.triggers where trigger_schema in ('public','rf_raw','rf_canonical')),",
      "'extensions',(select count(*) from pg_extension),",
      "'auth_users',(select count(*) from auth.users),",
      "'storage_metadata',(select count(*) from storage.objects),",
      "'application_grants',(select count(*) from information_schema.table_privileges where table_schema='public' and grantee in ('anon','authenticated','service_role')),",
      "'migrations',(select count(*) from supabase_migrations.schema_migrations)",
      ");",
    ].join("");
    const validation = JSON.parse((await run("docker", ["exec", container, "psql", "-U", "postgres", "-d", database, "-Atc", validationSql])).trim());
    const tenantProbeSql = [
      "begin; set local role authenticated;",
      "select set_config('request.jwt.claims','{\"sub\":\"30000000-0000-0000-0000-000000000002\",\"role\":\"authenticated\"}',true);",
      "select json_build_object('visible_tenants',(select count(*) from public.tenants),'foreign_tenants',(select count(*) from public.tenants where id <> '00000000-0000-0000-0000-000000000002'));",
      "rollback;",
    ].join(" ");
    const tenantProbeOutput = await run("docker", ["exec", container, "psql", "-U", "postgres", "-d", database, "-Atc", tenantProbeSql]);
    const tenantIsolation = JSON.parse(tenantProbeOutput.split("\n").findLast((line) => line.startsWith("{")) ?? "{}");
    validation.tenant_isolation = tenantIsolation;
    if (validation.public_tables < 1 || validation.public_rows < 1 || validation.rls_tables < 1 || validation.rls_policies < 1 || validation.constraints < 1 || validation.indexes < 1 || validation.functions < 1 || validation.triggers < 1 || validation.extensions < 1 || validation.application_grants < 1 || validation.migrations < 46 || tenantIsolation.visible_tenants !== 1 || tenantIsolation.foreign_tenants !== 0) {
      throw new Error(`Restore validation failed: ${JSON.stringify(validation)}`);
    }
    const result = {
      recoveryPoint: point.marker.id,
      validation,
      decryptMs: Math.round(decryptMs),
      restoreMs: Math.round(restoreMs),
      restoreTotalMs: Math.round(performance.now() - started),
      externalSideEffects: "LOCAL_SUPABASE_ONLY",
    };
    await writeFile(restorePath, `${JSON.stringify({ at: new Date().toISOString(), result })}\n`);
    return result;
  } finally {
    await run("docker", ["exec", container, "dropdb", "-U", "postgres", "--if-exists", database]).catch(() => {});
    await run("docker", ["exec", container, "rm", "-f", containerDump, containerAcl]).catch(() => {});
    await rm(work, { recursive: true, force: true });
  }
}

async function status() {
  const points = await verifiedRecoveryPoints(independent);
  const last = points[0] ?? null;
  let lastFailure = null;
  let lastBackup = null;
  let lastRestore = null;
  try { lastFailure = JSON.parse(await readFile(failurePath, "utf8")); } catch {}
  try { lastBackup = JSON.parse(await readFile(backupPath, "utf8")); } catch {}
  try { lastRestore = JSON.parse(await readFile(restorePath, "utf8")); } catch {}
  return {
    independentDirectory: independent,
    verifiedRecoveryPoints: points.length,
    lastSuccessAt: last?.marker.completedAt ?? null,
    backupAgeMs: last ? Date.now() - new Date(last.marker.completedAt).getTime() : null,
    encryptedBytes: last?.manifest.files[0].bytes ?? null,
    backupDurationMs: lastBackup?.result?.backupTotalMs ?? null,
    checksumVerified: Boolean(last),
    copyVerified: Boolean(last),
    lastFailure,
    lastRestoreAt: lastRestore?.at ?? null,
    lastRestoreDurationMs: lastRestore?.result?.restoreTotalMs ?? null,
    lastRestoreResult: lastRestore?.result ? "PASS" : null,
  };
}

try {
  await mkdir(output, { recursive: true });
  const results = {};
  if (mode === "backup" || mode === "run") results.backup = await backup();
  if (mode === "restore" || mode === "run") results.restore = await restore();
  if (mode === "status") results.status = await status();
  console.log(JSON.stringify(results, null, 2));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  await mkdir(output, { recursive: true }).catch(() => {});
  await writeFile(failurePath, `${JSON.stringify({ at: new Date().toISOString(), mode, message })}\n`).catch(() => {});
  console.error(message);
  process.exitCode = 1;
}
