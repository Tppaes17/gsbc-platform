# RF-03B.2 Versioning Architecture

## Decision

Select **Model A: `dataset_version_id` on canonical entities**, evolving the current 0043-0046 model. Use declarative list partitioning by dataset version for high-volume canonical/staging tables in the future RF-03B.3 migration. Do not create one schema per competence.

| Concern | A: version column + partitions | B: schema/table per version |
| --- | --- | --- |
| Existing fit | Native to current model/FKs | Requires parallel catalog/migration model |
| Query API | Stable tables with version predicate | Dynamic schema routing |
| Atomic publish | Metadata swap (`ACTIVE`) | Search path/view swap |
| Rollback | Metadata transaction | View/schema switch |
| Retention | Drop/detach version partitions | Drop schema |
| Indexes/vacuum | Per partition | Per schema/table |
| Complexity | Moderate | High, repeated DDL and grants |

Target lifecycle: `DISCOVERED -> STAGED -> VALIDATING -> READY -> ACTIVE -> RETIRED -> EXPIRED`, plus `FAILED`. Current `PUBLISHED + is_current` maps to target `ACTIVE`; a future migration must be backward-compatible and transactional.

At most one ACTIVE version per source. A competence is complete only when all 37 expected files/groups reconcile to one manifest; files within a competence are partitions, not replacement versions.

All global RF entities carry the same `dataset_version_id`. Tenant interpretations remain in `public.*` links protected by RLS. No `tenant_id` is added to RF canonical data.
