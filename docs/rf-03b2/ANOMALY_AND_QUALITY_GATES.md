# RF-03B.2 Anomaly And Quality Gates

Hard gates before diff/publish:

- stable complete official manifest and expected group hash;
- all partitions/files verified;
- source/parsed/staged/accepted/rejected reconciliation;
- schema/parser compatibility;
- referential consistency within one version;
- zero unexplained duplicate inflation;
- no critical quality failure;
- diff completed idempotently;
- disk/WAL headroom remains above calibrated abort limits.

Anomaly categories: record-count delta, disappearance/removal spike, rejection spike, registration-status spike, missing reference table, file-size/hash change and diff-volume/type shift. Thresholds must be learned per group from at least three accepted competences or explicit owner baseline; none are hardcoded as universal truth.

An anomaly produces `BLOCK`, never automatic legal interpretation. Missing partitions and partial publication always block removal events. Override requires owner identity, reason, evidence and audit record; it cannot bypass manifest incompleteness.

Synthetic tests proved manifest mismatch, quality failure and configured removal/count anomalies block processing while leaving ACTIVE unchanged.
