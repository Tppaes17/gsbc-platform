# RF-03B.2 Diff Engine Specification

Compare complete ACTIVE N-1 with validated STAGING N by `(entity_type, entity_key)`. Event identity is a deterministic hash of entity, change type, field, old/new values and from/to versions, making retry idempotent.

Supported initial events: first seen, removed from snapshot, registration status, CNAE, address, trade name, legal name, legal nature, share capital, Simples and MEI changes. Other fields use an explicitly registered change type, never an opaque overwrite.

`REMOVED_FROM_SNAPSHOT` means absence in that official snapshot only. Its metadata must carry `legal_conclusion=false` and `requires_review=true`; it cannot declare closure, inactivity, irregularity or trigger collections/financial/legal action.

Diff preconditions:

- both manifests complete and group hashes equal;
- row reconciliation and quality PASS;
- parser/schema compatibility approved;
- anomaly checks pass;
- no missing partitions/files;
- diff writes and completion marker commit together.

Events are append-only. Reversal creates a new event (for example ACTIVE -> INACTIVE -> ACTIVE); prior events remain. Long-term views derive current, previous, two-competence status, first/last seen and last change without rewriting history.

Local fixture result: **PASS** for inserts, updates, status changes, disappearance semantics, reversal, idempotency and alphanumeric CNPJ preservation.
