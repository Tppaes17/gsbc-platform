import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, mkdtemp, readFile, rm, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { acquireDatasetLock, cleanupControlledArtifacts, createCuratedPackage, evaluateCapacity, heartbeatDatasetLock, releaseDatasetLock, selectControlledRecords, validateCuratedPackage } from "./controlled-lib.mjs";

const records = [
  { cnpj_canonical: "00000000000191", cnpj_root: "00000000", state: "SP", municipality_code: "3550308", main_cnae_code: "6201501", simples_option: true, mei_option: false },
  { cnpj_canonical: "00ABC000E08G12", cnpj_root: "00ABC000", state: "RJ", municipality_code: "3304557", main_cnae_code: "6202300", simples_option: false, mei_option: true },
];
const policy = { cnpjs: ["00.ABC.000/E08G-12"], roots: [], states: [], municipalities: [], cnaes: [], max_records: 10 };

test("selection is deterministic, relevance-bound and alphanumeric-safe", () => {
  assert.deepEqual(selectControlledRecords([...records].reverse(), policy), selectControlledRecords(records, policy));
  assert.equal(selectControlledRecords(records, policy)[0].cnpj_canonical, "00ABC000E08G12");
  assert.throws(() => selectControlledRecords(records, { max_records: 10 }), /RELEVANCE_SELECTOR/);
  assert.throws(() => selectControlledRecords(records, { ...policy, states: ["SP"], max_records: 1 }), /EXCEEDS_LIMIT/);
});

test("curated package is idempotent apart from generation time and preserves provenance", () => {
  const input = { datasetVersion: "2026-09-pilot", sourceReferenceDate: "2026-09-01", sourceManifestHash: "abc", parserVersion: "git:123", policy, records };
  const first = createCuratedPackage({ ...input, generatedAt: "2026-09-18T00:00:00Z" });
  const retry = createCuratedPackage({ ...input, generatedAt: "2026-09-19T00:00:00Z" });
  assert.equal(first.manifest.package_sha256, retry.manifest.package_sha256);
  assert.equal(first.manifest.records_sha256, retry.manifest.records_sha256);
  assert.equal(validateCuratedPackage(first), true);
  assert.throws(() => validateCuratedPackage({ ...first, records: [...first.records, records[0]] }), /MANIFEST_INTEGRITY/);
});

test("validation catches a genuinely valid package built for the wrong dataset version", () => {
  const input = { datasetVersion: "2026-08", sourceReferenceDate: "2026-08-01", sourceManifestHash: "abc", parserVersion: "git:123", policy, records };
  const augustPackage = createCuratedPackage(input);
  assert.equal(validateCuratedPackage(augustPackage), true, "integrity alone passes: nothing was tampered with");
  assert.throws(() => validateCuratedPackage(augustPackage, { expectedDatasetVersion: "2026-09" }), /CURATED_DATASET_VERSION_MISMATCH/);
  assert.equal(validateCuratedPackage(augustPackage, { expectedDatasetVersion: "2026-08" }), true);
});

test("cleanup is bounded, verified and fails closed outside its root", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "rf-controlled-cleanup-"));
  const scratch = path.join(root, "scratch");
  try {
    await mkdir(scratch); await writeFile(path.join(scratch, "temporary.json"), "{}\n");
    assert.deepEqual(await cleanupControlledArtifacts(root, [scratch]), { status: "PASS", removed: 1 });
    await assert.rejects(cleanupControlledArtifacts(root, [path.dirname(root)]), /OUTSIDE_CONTROLLED_ROOT/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("capacity guard reserves headroom and stops uncontrolled RF growth", () => {
  assert.equal(evaluateCapacity({ capacityBytes: 10_000, currentDatabaseBytes: 4_000, currentRfBytes: 200, estimatedAdditionalBytes: 300 }).status, "PASS");
  assert.equal(evaluateCapacity({ capacityBytes: 10_000, currentDatabaseBytes: 6_900, currentRfBytes: 200, estimatedAdditionalBytes: 200 }).status, "STOP_EXPANSION");
  assert.throws(() => evaluateCapacity({}), /CAPACITY_EVIDENCE_REQUIRED/);
});

test("capacity guard handles boundary and degenerate inputs without misclassifying", () => {
  // Negative and non-finite inputs must fail closed, never be silently coerced.
  assert.throws(() => evaluateCapacity({ capacityBytes: -1, currentDatabaseBytes: 0, currentRfBytes: 0, estimatedAdditionalBytes: 0 }), /CAPACITY_EVIDENCE_REQUIRED/);
  assert.throws(() => evaluateCapacity({ capacityBytes: 10, currentDatabaseBytes: NaN, currentRfBytes: 0, estimatedAdditionalBytes: 0 }), /CAPACITY_EVIDENCE_REQUIRED/);
  assert.throws(() => evaluateCapacity({ capacityBytes: 10, currentDatabaseBytes: Infinity, currentRfBytes: 0, estimatedAdditionalBytes: 0 }), /CAPACITY_EVIDENCE_REQUIRED/);
  // reserveRatio is boundary-inclusive at both documented ends (25% and 50%).
  assert.equal(evaluateCapacity({ capacityBytes: 10_000, currentDatabaseBytes: 0, currentRfBytes: 0, estimatedAdditionalBytes: 0, reserveRatio: 0.25 }).status, "PASS");
  assert.equal(evaluateCapacity({ capacityBytes: 10_000, currentDatabaseBytes: 0, currentRfBytes: 0, estimatedAdditionalBytes: 0, reserveRatio: 0.5 }).status, "PASS");
  assert.throws(() => evaluateCapacity({ capacityBytes: 10_000, currentDatabaseBytes: 0, currentRfBytes: 0, estimatedAdditionalBytes: 0, reserveRatio: 0.249999 }), /CAPACITY_RESERVE_INVALID/);
  assert.throws(() => evaluateCapacity({ capacityBytes: 10_000, currentDatabaseBytes: 0, currentRfBytes: 0, estimatedAdditionalBytes: 0, reserveRatio: 0.500001 }), /CAPACITY_RESERVE_INVALID/);
  // Zero capacity must fail closed rather than dividing/comparing against a degenerate zero budget.
  assert.equal(evaluateCapacity({ capacityBytes: 0, currentDatabaseBytes: 0, currentRfBytes: 0, estimatedAdditionalBytes: 1 }).status, "STOP_EXPANSION");
  assert.equal(evaluateCapacity({ capacityBytes: 0, currentDatabaseBytes: 0, currentRfBytes: 0, estimatedAdditionalBytes: 0 }).status, "PASS", "zero capacity with zero projected use is not itself a breach");
  // Exactly at the overall reserve boundary must pass; one byte over must stop. Pre-existing
  // non-RF usage is what approaches the 70% operational threshold here, while the RF-specific
  // 10% cap (estimatedAdditionalBytes against currentRfBytes) is kept comfortably clear, so this
  // isolates the OPERATIONAL_RESERVE_BREACHED boundary from the separate CONTROLLED_RF_LIMIT check.
  const exact = evaluateCapacity({ capacityBytes: 10_000, currentDatabaseBytes: 6_500, currentRfBytes: 0, estimatedAdditionalBytes: 500, reserveRatio: 0.30 });
  assert.equal(exact.status, "PASS");
  const overByOne = evaluateCapacity({ capacityBytes: 10_000, currentDatabaseBytes: 6_500, currentRfBytes: 0, estimatedAdditionalBytes: 501, reserveRatio: 0.30 });
  assert.equal(overByOne.status, "STOP_EXPANSION");
  assert.deepEqual(overByOne.reasons, ["OPERATIONAL_RESERVE_BREACHED"], "must trip on the reserve boundary alone, not the RF-specific cap");

  // Symmetric check for the RF-specific 10%-of-capacity (or 500 MiB) cap in isolation: kept well
  // clear of the overall reserve, so only CONTROLLED_RF_LIMIT_BREACHED can fire.
  const rfExact = evaluateCapacity({ capacityBytes: 10_000, currentDatabaseBytes: 0, currentRfBytes: 0, estimatedAdditionalBytes: 1_000, reserveRatio: 0.30 });
  assert.equal(rfExact.status, "PASS");
  const rfOverByOne = evaluateCapacity({ capacityBytes: 10_000, currentDatabaseBytes: 0, currentRfBytes: 0, estimatedAdditionalBytes: 1_001, reserveRatio: 0.30 });
  assert.deepEqual(rfOverByOne.reasons, ["CONTROLLED_RF_LIMIT_BREACHED"]);
});

test("dataset lock excludes duplicates, supports heartbeat and stale recovery", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "rf-controlled-lock-"));
  try {
    const lock = await acquireDatasetLock(root, "2026-09", { executor: "test-a", now: 1_000 });
    await assert.rejects(acquireDatasetLock(root, "2026-09", { executor: "test-b", now: 2_000 }), /DATASET_VERSION_LOCKED/);
    const live = await heartbeatDatasetLock(lock, 3_000); assert.equal(live.executor, "test-a");
    const recovered = await acquireDatasetLock(root, "2026-09", { executor: "test-b", staleAfterMs: 1_000, now: 5_000 });
    await releaseDatasetLock(recovered);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("concurrent stale-lock reclaim never allows two racers to both believe they hold the lock", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "rf-controlled-race-"));
  try {
    const lockPath = path.join(root, "2026-09.lock");
    await writeFile(lockPath, `${JSON.stringify({ lock_id: "old", dataset_version: "2026-09", executor: "old", heartbeat_at: new Date(0).toISOString() })}\n`);
    const now = Date.now();
    const racers = 40;
    const results = await Promise.allSettled(
      Array.from({ length: racers }, (_, i) => acquireDatasetLock(root, "2026-09", { executor: `racer-${i}`, now })),
    );
    const succeeded = results.filter((r) => r.status === "fulfilled");
    const onDisk = JSON.parse(await readFile(lockPath, "utf8"));
    assert.equal(succeeded.length, 1, "exactly one concurrent reclaimer must win the stale lock");
    assert.equal(succeeded[0].value.lock_id, onDisk.lock_id, "the sole winner's belief must match what is actually persisted");
    for (const failure of results.filter((r) => r.status === "rejected")) {
      assert.match(failure.reason.message, /DATASET_VERSION_LOCKED/, "every loser must fail closed, not silently succeed");
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("an abandoned steal-mutex from a crashed reclaimer is recovered, a fresh one is not", async () => {
  const abandonedRoot = await mkdtemp(path.join(os.tmpdir(), "rf-controlled-mutex-abandoned-"));
  const freshRoot = await mkdtemp(path.join(os.tmpdir(), "rf-controlled-mutex-fresh-"));
  try {
    const abandonedLock = path.join(abandonedRoot, "2026-09.lock");
    await writeFile(abandonedLock, `${JSON.stringify({ lock_id: "old", dataset_version: "2026-09", executor: "old", heartbeat_at: new Date(0).toISOString() })}\n`);
    const stuckMutex = `${abandonedLock}.steal-mutex`;
    await writeFile(stuckMutex, "");
    const old = new Date(Date.now() - 60_000);
    await utimes(stuckMutex, old, old);
    const recovered = await acquireDatasetLock(abandonedRoot, "2026-09", { executor: "recoverer", now: Date.now() });
    assert.equal(recovered.executor, "recoverer");

    const freshLock = path.join(freshRoot, "2026-09.lock");
    await writeFile(freshLock, `${JSON.stringify({ lock_id: "old", dataset_version: "2026-09", executor: "old", heartbeat_at: new Date(0).toISOString() })}\n`);
    await writeFile(`${freshLock}.steal-mutex`, "");
    await assert.rejects(acquireDatasetLock(freshRoot, "2026-09", { executor: "blocked", now: Date.now() }), /DATASET_VERSION_LOCKED/);
  } finally {
    await rm(abandonedRoot, { recursive: true, force: true });
    await rm(freshRoot, { recursive: true, force: true });
  }
});
