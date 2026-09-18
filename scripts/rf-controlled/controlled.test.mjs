import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { acquireDatasetLock, createCuratedPackage, evaluateCapacity, heartbeatDatasetLock, releaseDatasetLock, selectControlledRecords } from "./controlled-lib.mjs";

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
});

test("capacity guard reserves headroom and stops uncontrolled RF growth", () => {
  assert.equal(evaluateCapacity({ capacityBytes: 10_000, currentDatabaseBytes: 4_000, currentRfBytes: 200, estimatedAdditionalBytes: 300 }).status, "PASS");
  assert.equal(evaluateCapacity({ capacityBytes: 10_000, currentDatabaseBytes: 6_900, currentRfBytes: 200, estimatedAdditionalBytes: 200 }).status, "STOP_EXPANSION");
  assert.throws(() => evaluateCapacity({}), /CAPACITY_EVIDENCE_REQUIRED/);
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
