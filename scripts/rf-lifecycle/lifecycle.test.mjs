import assert from "node:assert/strict";
import test from "node:test";

import { assertSingleActive, diffSnapshots, doubleCheckHistory, evaluateAnomalies, publishVersion, rollbackVersion } from "./lifecycle.mjs";

const groupHash = "official-groups-v1";
const record = (key, status, extra = {}) => ({ key, registration_status: status, ...extra });
const snapshot = (id, period, records, extra = {}) => ({ id, period, records, manifest_complete: true, quality_status: "PASS", expected_groups_hash: groupHash, ...extra });
const version = (id, period, status, extra = {}) => ({ id, period, status, full_snapshot: true, quality_status: "PASS", manifest_complete: true, diff_complete: true, ...extra });
const state = (versions) => ({ versions, publication_events: [], diff_events: [] });

test("single ACTIVE invariant and atomic failed publish", () => {
  assert.throws(() => assertSingleActive([version("a", "2026-08", "ACTIVE"), version("b", "2026-09", "ACTIVE")]), /MULTIPLE_ACTIVE/);
  const original = state([version("a", "2026-08", "ACTIVE")]);
  assert.throws(() => publishVersion(original, version("b", "2026-09", "READY", { quality_status: "FAIL" })), /PUBLISH_PRECONDITION/);
  assert.equal(original.versions[0].status, "ACTIVE");
  assert.equal(original.publication_events.length, 0);
});

test("publish retains N/N-1/N-2 and expires N-3 only after success", () => {
  const original = state([version("n3", "2026-06", "RETIRED"), version("n2", "2026-07", "RETIRED"), version("n1", "2026-08", "ACTIVE")]);
  const published = publishVersion(original, version("n", "2026-09", "READY"));
  assert.equal(published.versions.find((item) => item.id === "n").status, "ACTIVE");
  assert.equal(published.versions.find((item) => item.id === "n3").status, "EXPIRED");
  assert.equal(published.versions.filter((item) => ["ACTIVE", "RETIRED"].includes(item.status)).length, 3);
});

test("legal hold prevents N-3 expiration", () => {
  const original = state([version("n3", "2026-06", "RETIRED", { legal_hold: true }), version("n2", "2026-07", "RETIRED"), version("n1", "2026-08", "ACTIVE")]);
  const published = publishVersion(original, version("n", "2026-09", "READY"));
  assert.equal(published.versions.find((item) => item.id === "n3").status, "RETIRED");
});

test("rollback is audited and preserves diff history", () => {
  const original = state([version("n1", "2026-08", "RETIRED"), version("n", "2026-09", "ACTIVE")]);
  original.diff_events.push({ id: "immutable-diff" });
  const rolled = rollbackVersion(original, "n1", { reason: "quality incident", actor: "owner" });
  assert.equal(rolled.versions.find((item) => item.id === "n1").status, "ACTIVE");
  assert.deepEqual(rolled.diff_events, original.diff_events);
  assert.equal(rolled.publication_events[0].type, "ROLLBACK");
});

test("diff is deterministic for first seen, changes, disappearance and reversal", () => {
  const alpha = "00ABC000E08G12";
  const august = snapshot("aug", "2026-08", [record(alpha, "ACTIVE", { legal_name: "ALFA" }), record("00000000000191", "ACTIVE")]);
  const september = snapshot("sep", "2026-09", [record(alpha, "INACTIVE", { legal_name: "ALFA BRASIL" }), record("00000000000272", "ACTIVE")]);
  const first = diffSnapshots({ previous: august, candidate: september });
  const retry = diffSnapshots({ previous: august, candidate: september });
  assert.deepEqual(first, retry);
  assert(first.some((event) => event.entity_key === alpha && event.change_type === "REGISTRATION_STATUS_CHANGED"));
  assert(first.some((event) => event.change_type === "COMPANY_FIRST_SEEN"));
  const removed = first.find((event) => event.change_type === "COMPANY_REMOVED_FROM_SNAPSHOT");
  assert.equal(removed.metadata.legal_conclusion, false);
  const october = snapshot("oct", "2026-10", [record(alpha, "ACTIVE", { legal_name: "ALFA" })]);
  const reversal = diffSnapshots({ previous: september, candidate: october });
  assert(reversal.some((event) => event.entity_key === alpha && event.old_value === "INACTIVE" && event.new_value === "ACTIVE"));
});

test("manifest, quality and anomaly gates block unsafe diff/publish", () => {
  const base = snapshot("a", "2026-08", [record("00000000000191", "ACTIVE")]);
  assert.throws(() => diffSnapshots({ previous: base, candidate: snapshot("b", "2026-09", [], { manifest_complete: false }) }), /MANIFEST_INCOMPLETE/);
  assert.throws(() => diffSnapshots({ previous: base, candidate: snapshot("b", "2026-09", [], { quality_status: "FAIL" }) }), /QUALITY_GATE/);
  const anomaly = evaluateAnomalies({ baseline: { records: 1000 }, candidate: { records: 500, removals: 500, rejection_ratio: 0 }, thresholds: { max_removal_ratio: 0.1, max_record_delta_ratio: 0.2, max_rejection_ratio: 0.01 } });
  assert.equal(anomaly.status, "BLOCK");
  assert.deepEqual(anomaly.reasons, ["REMOVAL_SPIKE", "RECORD_COUNT_DELTA"]);
});

test("double-check history preserves alpha CNPJ and three competencies", () => {
  const key = "00ABC000E08G12";
  const snapshots = [snapshot("jul", "2026-07", [record(key, "ACTIVE")]), snapshot("aug", "2026-08", [record(key, "INACTIVE")]), snapshot("sep", "2026-09", [record(key, "ACTIVE")])];
  const events = [...diffSnapshots({ previous: snapshots[0], candidate: snapshots[1] }), ...diffSnapshots({ previous: snapshots[1], candidate: snapshots[2] })];
  const history = doubleCheckHistory(snapshots, events, key);
  assert.equal(history.cnpj, key);
  assert.equal(history.current_status, "ACTIVE");
  assert.equal(history.previous_status, "INACTIVE");
  assert.equal(history.status_two_competencies_ago, "ACTIVE");
  assert.equal(Object.hasOwn(history, "tenant_id"), false);
});
