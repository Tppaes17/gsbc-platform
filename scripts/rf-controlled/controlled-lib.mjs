import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, open, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { canonicalizeCnpjInput } from "../../src/lib/cnpj/cnpj.ts";

const MAX_CONTROLLED_BYTES = 500 * 1024 * 1024;

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, nested]) => [key, stable(nested)]));
  return value;
}

export function stableJson(value) {
  return JSON.stringify(stable(value));
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizedSet(values = [], cnpj = false) {
  return new Set(values.map((value) => cnpj ? canonicalizeCnpjInput(String(value)) : String(value).trim().toUpperCase()).filter(Boolean));
}

export function selectControlledRecords(records, policy) {
  const selectors = {
    cnpjs: normalizedSet(policy.cnpjs, true), roots: normalizedSet(policy.roots, true),
    states: normalizedSet(policy.states), municipalities: normalizedSet(policy.municipalities), cnaes: normalizedSet(policy.cnaes),
  };
  if (!Object.values(selectors).some((set) => set.size)) throw new Error("CONTROLLED_SELECTION_REQUIRES_RELEVANCE_SELECTOR");
  const maxRecords = policy.max_records;
  if (!Number.isSafeInteger(maxRecords) || maxRecords < 1 || maxRecords > 50_000) throw new Error("CONTROLLED_SELECTION_MAX_RECORDS_INVALID");
  const selected = records.filter((record) => {
    const cnpj = record.cnpj_canonical ? canonicalizeCnpjInput(record.cnpj_canonical) : "";
    const root = record.cnpj_root ? canonicalizeCnpjInput(record.cnpj_root) : cnpj.slice(0, 8);
    return selectors.cnpjs.has(cnpj) || selectors.roots.has(root) || selectors.states.has(String(record.state ?? "").toUpperCase()) || selectors.municipalities.has(String(record.municipality_code ?? "")) || selectors.cnaes.has(String(record.main_cnae_code ?? ""));
  }).map((record) => ({ ...record, cnpj_canonical: record.cnpj_canonical ? canonicalizeCnpjInput(record.cnpj_canonical) : undefined, cnpj_root: record.cnpj_root ? canonicalizeCnpjInput(record.cnpj_root) : undefined }));
  selected.sort((left, right) => `${left.cnpj_canonical ?? left.cnpj_root ?? ""}:${stableJson(left)}`.localeCompare(`${right.cnpj_canonical ?? right.cnpj_root ?? ""}:${stableJson(right)}`));
  if (selected.length > maxRecords) throw new Error(`CONTROLLED_SELECTION_EXCEEDS_LIMIT:${selected.length}`);
  return selected;
}

export function createCuratedPackage({ datasetVersion, sourceReferenceDate, sourceManifestHash, parserVersion, policy, records, generatedAt = new Date().toISOString() }) {
  if (!datasetVersion || !sourceReferenceDate || !sourceManifestHash || !parserVersion) throw new Error("CURATED_PROVENANCE_INCOMPLETE");
  const selected = selectControlledRecords(records, policy);
  const recordsHash = sha256(stableJson(selected));
  const identity = { dataset_version: datasetVersion, source_reference_date: sourceReferenceDate, source_manifest_hash: sourceManifestHash, parser_version: parserVersion, selection_policy: policy, record_count: selected.length, records_sha256: recordsHash };
  return { manifest: { ...identity, generated_at: generatedAt, package_sha256: sha256(stableJson(identity)) }, records: selected };
}

export function validateCuratedPackage(curated, { expectedDatasetVersion } = {}) {
  if (!curated?.manifest || !Array.isArray(curated.records)) throw new Error("CURATED_PACKAGE_INVALID");
  const packageSha256 = curated.manifest.package_sha256;
  const identity = Object.fromEntries(Object.entries(curated.manifest).filter(([key]) => !["generated_at", "package_sha256"].includes(key)));
  if (curated.records.length !== identity.record_count || sha256(stableJson(curated.records)) !== identity.records_sha256 || sha256(stableJson(identity)) !== packageSha256) throw new Error("CURATED_MANIFEST_INTEGRITY_FAILED");
  // Integrity alone only proves the package was not tampered with; it says nothing about whether
  // it is the package the operator actually meant to import. Without this, a genuinely valid
  // package for the wrong competence (e.g. importing 2026-08 while intending 2026-09) would pass
  // silently. Require the caller to state which dataset version it expects whenever one is known.
  if (expectedDatasetVersion && curated.manifest.dataset_version !== expectedDatasetVersion) {
    throw new Error(`CURATED_DATASET_VERSION_MISMATCH:expected=${expectedDatasetVersion}:actual=${curated.manifest.dataset_version}`);
  }
  return true;
}

export function evaluateCapacity({ capacityBytes, currentDatabaseBytes, currentRfBytes, estimatedAdditionalBytes, reserveRatio = 0.30 }) {
  for (const value of [capacityBytes, currentDatabaseBytes, currentRfBytes, estimatedAdditionalBytes]) if (!Number.isFinite(value) || value < 0) throw new Error("CAPACITY_EVIDENCE_REQUIRED");
  if (reserveRatio < 0.25 || reserveRatio > 0.5) throw new Error("CAPACITY_RESERVE_INVALID");
  const controlledLimit = Math.min(capacityBytes * 0.10, MAX_CONTROLLED_BYTES);
  const projectedDatabaseBytes = currentDatabaseBytes + estimatedAdditionalBytes;
  const reasons = [];
  if (projectedDatabaseBytes > capacityBytes * (1 - reserveRatio)) reasons.push("OPERATIONAL_RESERVE_BREACHED");
  if (currentRfBytes + estimatedAdditionalBytes > controlledLimit) reasons.push("CONTROLLED_RF_LIMIT_BREACHED");
  return { status: reasons.length ? "STOP_EXPANSION" : "PASS", reasons, capacity_bytes: capacityBytes, reserve_bytes: capacityBytes * reserveRatio, controlled_rf_limit_bytes: controlledLimit, projected_database_bytes: projectedDatabaseBytes };
}

export async function acquireDatasetLock(lockRoot, datasetVersion, { executor, staleAfterMs = 6 * 60 * 60 * 1000, now = Date.now() } = {}) {
  if (!executor || !datasetVersion.match(/^[A-Za-z0-9._-]+$/)) throw new Error("LOCK_IDENTITY_INVALID");
  await mkdir(lockRoot, { recursive: true });
  const lockPath = path.join(lockRoot, `${datasetVersion}.lock`);
  const payload = { lock_id: randomUUID(), dataset_version: datasetVersion, executor, acquired_at: new Date(now).toISOString(), heartbeat_at: new Date(now).toISOString() };
  try {
    const handle = await open(lockPath, "wx", 0o600); await handle.writeFile(`${JSON.stringify(payload)}\n`); await handle.close();
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    const existing = JSON.parse(await readFile(lockPath, "utf8"));
    if (now - Date.parse(existing.heartbeat_at) <= staleAfterMs) throw new Error(`DATASET_VERSION_LOCKED:${existing.executor}`);
    // Stale-lock reclaim is a steal, not a fresh create, and a plain read-then-rm-then-recreate (or
    // even a check-then-rename) leaves a window where two concurrent reclaimers can both believe
    // they won: rename() only guarantees the destination is never briefly absent, not that we are
    // the only writer racing to occupy it. The one primitive that IS a true atomic mutual-exclusion
    // gate here is open(path, "wx"): it already proved race-free for the fresh-lock case above.
    // Reuse it to guard the steal itself via a short-lived, dedicated mutex file, so exactly one
    // reclaimer ever performs the swap; every other concurrent reclaimer fails closed instead of
    // silently believing it holds a lock it does not.
    const stealMutexPath = `${lockPath}.steal-mutex`;
    const stealMutexMaxAgeMs = 30_000; // the critical section below is a handful of local fs calls
    let mutexHandle;
    try {
      mutexHandle = await open(stealMutexPath, "wx", 0o600);
    } catch (mutexError) {
      if (mutexError.code !== "EEXIST") throw mutexError;
      // The mutex itself can be abandoned if its holder crashed mid-steal. It must never require
      // manual intervention to recover from, but reclaiming it needs the same atomicity discipline
      // as the primary lock: verify age, then remove-and-recreate, and let a genuine EEXIST loss
      // here simply mean another reclaimer is legitimately active right now.
      const mutexStat = await stat(stealMutexPath).catch(() => null);
      if (!mutexStat || now - mutexStat.mtimeMs <= stealMutexMaxAgeMs) throw new Error(`DATASET_VERSION_LOCKED:${existing.executor}`);
      await rm(stealMutexPath, { force: true });
      try {
        mutexHandle = await open(stealMutexPath, "wx", 0o600);
      } catch (retryError) {
        if (retryError.code === "EEXIST") throw new Error(`DATASET_VERSION_LOCKED:${existing.executor}`);
        throw retryError;
      }
    }
    try {
      await mutexHandle.close();
      // Re-read inside the mutex: the lock may have been reclaimed by someone else between our
      // initial read and winning the mutex.
      const recheck = JSON.parse(await readFile(lockPath, "utf8"));
      if (now - Date.parse(recheck.heartbeat_at) <= staleAfterMs) throw new Error(`DATASET_VERSION_LOCKED:${recheck.executor}`);
      const tempPath = `${lockPath}.steal-${payload.lock_id}`;
      await writeFile(tempPath, `${JSON.stringify(payload)}\n`, { mode: 0o600 });
      await rename(tempPath, lockPath);
    } finally {
      await rm(stealMutexPath, { force: true });
    }
  }
  return { ...payload, lock_path: lockPath };
}

export async function heartbeatDatasetLock(lock, now = Date.now()) {
  const existing = JSON.parse(await readFile(lock.lock_path, "utf8"));
  if (existing.lock_id !== lock.lock_id) throw new Error("LOCK_OWNERSHIP_LOST");
  const updated = { ...existing, heartbeat_at: new Date(now).toISOString() };
  await writeFile(lock.lock_path, `${JSON.stringify(updated)}\n`, { mode: 0o600 }); return { ...updated, lock_path: lock.lock_path };
}

export async function releaseDatasetLock(lock) {
  const existing = JSON.parse(await readFile(lock.lock_path, "utf8"));
  if (existing.lock_id !== lock.lock_id) throw new Error("LOCK_OWNERSHIP_LOST");
  await rm(lock.lock_path);
}

export async function cleanupControlledArtifacts(root, artifacts) {
  const canonicalRoot = path.resolve(root);
  for (const artifact of artifacts) {
    const target = path.resolve(artifact);
    if (target === canonicalRoot || !target.startsWith(`${canonicalRoot}${path.sep}`)) throw new Error("CLEANUP_PATH_OUTSIDE_CONTROLLED_ROOT");
    await rm(target, { recursive: true, force: true });
    await lstat(target).then(() => { throw new Error("CLEANUP_VERIFICATION_FAILED"); }, (error) => { if (error.code !== "ENOENT") throw error; });
  }
  return { status: "PASS", removed: artifacts.length };
}
