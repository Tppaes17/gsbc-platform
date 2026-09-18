import { createHash } from "node:crypto";

const CHANGE_FIELDS = Object.freeze({
  registration_status: "REGISTRATION_STATUS_CHANGED",
  cnae: "CNAE_CHANGED",
  address: "ADDRESS_CHANGED",
  trade_name: "TRADE_NAME_CHANGED",
  legal_name: "LEGAL_NAME_CHANGED",
  legal_nature: "LEGAL_NATURE_CHANGED",
  share_capital: "SHARE_CAPITAL_CHANGED",
  simples_status: "SIMPLES_STATUS_CHANGED",
  mei_status: "MEI_STATUS_CHANGED",
});

function immutable(value) {
  return structuredClone(value);
}

function eventId(event) {
  return createHash("sha256").update(JSON.stringify([
    event.entity_type, event.entity_key, event.change_type, event.field_name,
    event.old_value, event.new_value, event.from_version, event.to_version,
  ])).digest("hex");
}

export function assertSingleActive(versions) {
  const active = versions.filter((version) => version.status === "ACTIVE");
  if (active.length > 1) throw new Error("MULTIPLE_ACTIVE_VERSIONS");
  return active[0] ?? null;
}

export function assertDiffPreconditions({ previous, candidate }) {
  if (!previous?.manifest_complete || !candidate?.manifest_complete) throw new Error("MANIFEST_INCOMPLETE");
  if (previous.quality_status !== "PASS" || candidate.quality_status !== "PASS") throw new Error("QUALITY_GATE_FAILED");
  if (previous.expected_groups_hash !== candidate.expected_groups_hash) throw new Error("MANIFEST_GROUP_MISMATCH");
}

export function diffSnapshots({ previous, candidate, entityType = "COMPANY" }) {
  assertDiffPreconditions({ previous, candidate });
  const before = new Map(previous.records.map((record) => [record.key, record]));
  const after = new Map(candidate.records.map((record) => [record.key, record]));
  const events = [];
  const add = (event) => events.push({ ...event, id: eventId(event) });
  for (const [key, current] of after) {
    const prior = before.get(key);
    if (!prior) {
      const event = { entity_type: entityType, entity_key: key, change_type: `${entityType}_FIRST_SEEN`, field_name: null, old_value: null, new_value: null, from_version: previous.id, to_version: candidate.id, source_reference_period: candidate.period, metadata: {} };
      add(event);
      continue;
    }
    for (const [field, changeType] of Object.entries(CHANGE_FIELDS)) {
      if ((prior[field] ?? null) === (current[field] ?? null)) continue;
      add({ entity_type: entityType, entity_key: key, change_type: changeType, field_name: field, old_value: prior[field] ?? null, new_value: current[field] ?? null, from_version: previous.id, to_version: candidate.id, source_reference_period: candidate.period, metadata: {} });
    }
  }
  for (const key of before.keys()) {
    if (after.has(key)) continue;
    add({ entity_type: entityType, entity_key: key, change_type: `${entityType}_REMOVED_FROM_SNAPSHOT`, field_name: null, old_value: null, new_value: null, from_version: previous.id, to_version: candidate.id, source_reference_period: candidate.period, metadata: { legal_conclusion: false, requires_review: true } });
  }
  return [...new Map(events.map((event) => [event.id, event])).values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function evaluateAnomalies({ baseline, candidate, thresholds }) {
  if (!thresholds) throw new Error("ANOMALY_THRESHOLDS_REQUIRE_BASELINE");
  const removalRatio = baseline.records === 0 ? 0 : candidate.removals / baseline.records;
  const recordDeltaRatio = baseline.records === 0 ? 0 : Math.abs(candidate.records - baseline.records) / baseline.records;
  const reasons = [];
  if (removalRatio > thresholds.max_removal_ratio) reasons.push("REMOVAL_SPIKE");
  if (recordDeltaRatio > thresholds.max_record_delta_ratio) reasons.push("RECORD_COUNT_DELTA");
  if (candidate.rejection_ratio > thresholds.max_rejection_ratio) reasons.push("REJECTION_SPIKE");
  return { status: reasons.length ? "BLOCK" : "PASS", reasons, removal_ratio: removalRatio, record_delta_ratio: recordDeltaRatio };
}

export function publishVersion(state, candidate, { now = new Date().toISOString(), retainFull = 3 } = {}) {
  const original = immutable(state);
  assertSingleActive(original.versions);
  if (candidate.status !== "READY" || candidate.quality_status !== "PASS" || !candidate.manifest_complete || !candidate.diff_complete) {
    throw new Error("PUBLISH_PRECONDITION_FAILED");
  }
  const next = immutable(original);
  const active = assertSingleActive(next.versions);
  if (active) active.status = "RETIRED";
  const existing = next.versions.find((version) => version.id === candidate.id);
  const published = { ...immutable(candidate), status: "ACTIVE", published_at: now };
  if (existing) Object.assign(existing, published);
  else next.versions.push(published);
  const full = next.versions.filter((version) => ["ACTIVE", "RETIRED"].includes(version.status) && version.full_snapshot)
    .sort((a, b) => b.period.localeCompare(a.period));
  for (const version of full.slice(retainFull)) {
    if (!version.legal_hold) version.status = "EXPIRED";
  }
  next.publication_events.push({ type: "PUBLISH", from: active?.id ?? null, to: candidate.id, at: now });
  assertSingleActive(next.versions);
  return next;
}

export function rollbackVersion(state, targetId, { reason, actor, now = new Date().toISOString() }) {
  if (!reason || !actor) throw new Error("ROLLBACK_AUDIT_REQUIRED");
  const next = immutable(state);
  const active = assertSingleActive(next.versions);
  const target = next.versions.find((version) => version.id === targetId);
  if (!active || !target || target.status !== "RETIRED" || !target.full_snapshot) throw new Error("ROLLBACK_TARGET_UNAVAILABLE");
  active.status = "RETIRED";
  target.status = "ACTIVE";
  next.publication_events.push({ type: "ROLLBACK", from: active.id, to: target.id, at: now, reason, actor });
  assertSingleActive(next.versions);
  return next;
}

export function doubleCheckHistory(snapshots, events, key) {
  const ordered = [...snapshots].sort((a, b) => b.period.localeCompare(a.period));
  const values = ordered.map((snapshot) => snapshot.records.find((record) => record.key === key) ?? null);
  const relevant = events.filter((event) => event.entity_key === key).sort((a, b) => a.source_reference_period.localeCompare(b.source_reference_period));
  return {
    cnpj: key,
    current_status: values[0]?.registration_status ?? null,
    previous_status: values[1]?.registration_status ?? null,
    status_two_competencies_ago: values[2]?.registration_status ?? null,
    first_seen_period: [...ordered].reverse().find((snapshot) => snapshot.records.some((record) => record.key === key))?.period ?? null,
    last_seen_period: ordered.find((snapshot) => snapshot.records.some((record) => record.key === key))?.period ?? null,
    last_change_period: relevant.at(-1)?.source_reference_period ?? null,
    last_change_type: relevant.at(-1)?.change_type ?? null,
  };
}
