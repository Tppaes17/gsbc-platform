import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  acquireLock,
  canonicalJson,
  createRecoveryPoint,
  decryptFile,
  encryptFile,
  selectRetention,
  verifiedRecoveryPoints,
} from "./recovery-lib.mjs";

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "recovery-poc-test-"));
  const bundle = join(root, "bundle.tar");
  await writeFile(bundle, randomBytes(4096));
  return { root, bundle, independent: join(root, "independent"), lock: join(root, "lock"), key: randomBytes(32) };
}

test("manifest determinism", () => {
  assert.equal(canonicalJson({ z: 1, a: { d: 2, b: 3 } }), canonicalJson({ a: { b: 3, d: 2 }, z: 1 }));
});

test("encryption and decryption round trip", async (t) => {
  const f = await fixture(); t.after(() => rm(f.root, { recursive: true, force: true }));
  const encrypted = join(f.root, "x.enc"); const restored = join(f.root, "x.out");
  await encryptFile(f.bundle, encrypted, f.key); await decryptFile(encrypted, restored, f.key);
  assert.deepEqual(await readFile(restored), await readFile(f.bundle));
});

test("wrong key is rejected", async (t) => {
  const f = await fixture(); t.after(() => rm(f.root, { recursive: true, force: true }));
  const encrypted = join(f.root, "x.enc"); await encryptFile(f.bundle, encrypted, f.key);
  await assert.rejects(decryptFile(encrypted, join(f.root, "out"), randomBytes(32)));
});

test("corrupted encrypted backup is rejected", async (t) => {
  const f = await fixture(); t.after(() => rm(f.root, { recursive: true, force: true }));
  const encrypted = join(f.root, "x.enc"); await encryptFile(f.bundle, encrypted, f.key);
  const bytes = await readFile(encrypted); bytes[30] ^= 0xff; await writeFile(encrypted, bytes);
  await assert.rejects(decryptFile(encrypted, join(f.root, "out"), f.key));
});

test("success marker appears only after verified copy", async (t) => {
  const f = await fixture(); t.after(() => rm(f.root, { recursive: true, force: true }));
  await createRecoveryPoint({ bundlePath: f.bundle, independentDir: f.independent, lockDir: f.lock, key: f.key, id: "ok" });
  assert.equal((await verifiedRecoveryPoints(f.independent)).length, 1);
});

for (const stage of ["dump", "encryption", "copy", "checksum-mismatch", "marker"]) {
  test(`${stage} failure creates no valid recovery point`, async (t) => {
    const f = await fixture(); t.after(() => rm(f.root, { recursive: true, force: true }));
    await assert.rejects(createRecoveryPoint({ bundlePath: f.bundle, independentDir: f.independent, lockDir: f.lock, key: f.key, id: stage, injectFailureAt: stage }));
    assert.equal((await verifiedRecoveryPoints(f.independent)).length, 0);
  });
}

test("duplicate execution is rejected by lock", async (t) => {
  const f = await fixture(); t.after(() => rm(f.root, { recursive: true, force: true }));
  const release = await acquireLock(f.lock);
  await assert.rejects(acquireLock(f.lock), /RECOVERY_POC_LOCKED/);
  await release();
});

test("stale lock is recovered", async (t) => {
  const f = await fixture(); t.after(() => rm(f.root, { recursive: true, force: true }));
  await mkdir(f.lock); await writeFile(join(f.lock, "owner.json"), JSON.stringify({ startedAt: "2000-01-01T00:00:00Z" }));
  const release = await acquireLock(f.lock, 1); await release();
  assert.rejects(readFile(join(f.lock, "owner.json")));
});

test("tampered manifest invalidates success marker", async (t) => {
  const f = await fixture(); t.after(() => rm(f.root, { recursive: true, force: true }));
  const result = await createRecoveryPoint({ bundlePath: f.bundle, independentDir: f.independent, lockDir: f.lock, key: f.key, id: "tamper" });
  await writeFile(result.manifestPath, "{}\n");
  assert.equal((await verifiedRecoveryPoints(f.independent)).length, 0);
});

test("retention keeps recent points and compacts old points", () => {
  const now = new Date("2026-09-17T12:00:00Z");
  const points = [
    { id: "recent", createdAt: "2026-09-17T11:30:00Z" },
    { id: "daily-new", createdAt: "2026-09-14T12:00:00Z" },
    { id: "daily-old", createdAt: "2026-09-14T11:00:00Z" },
    { id: "monthly", createdAt: "2026-05-01T00:00:00Z" },
    { id: "expired", createdAt: "2025-01-01T00:00:00Z" },
  ];
  const keep = selectRetention(points, now);
  assert(keep.has("recent")); assert(keep.has("daily-new")); assert(!keep.has("daily-old")); assert(keep.has("monthly")); assert(!keep.has("expired"));
});
