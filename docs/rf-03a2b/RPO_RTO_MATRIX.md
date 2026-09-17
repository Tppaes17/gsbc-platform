# RF-03A.2B - RPO/RTO Matrix

Status labels: `OBSERVED`, `TESTED`, `PROVIDER-DOCUMENTED`, `PROJECTED`, `ASSUMED`, `UNKNOWN`.

| Data/service class | Criticality | Recovery method | Proposed RPO | Proposed RTO | Current evidence | Current readiness |
| --- | --- | --- | ---: | ---: | --- | --- |
| Operational transactions: charges, payments, receivables, reconciliations, negotiations | A | PITR/physical restore, then ledger and webhook reconciliation | <= 15 min | <= 4 h | PITR disabled; no isolated production restore | FAIL |
| Governance/audit, human decisions, legal evidence, delivery evidence | A | PITR/physical restore plus immutable/off-provider audit retention | <= 15 min | <= 4 h | Logical JSON is non-transactional; no independent copy observed | FAIL |
| Tenants, users, memberships, policies and configuration | A | PITR/physical restore; controlled config/secrets reapplication | <= 1 h | <= 4 h | Local JSON smoke only; provider backup absent | FAIL |
| RF manifests, provenance, publication decisions and GSBC links | A | Database recovery plus independently retained immutable manifest | <= 1 h | <= 8 h | Manifest exists in Git; production retention/publish audit not implemented | PARTIAL |
| RF raw official objects | B | Redownload from official source or restore versioned object storage | <= 24 h | <= 48 h | Source metadata verified; production object storage absent | NOT READY |
| RF canonical active/previous version | B/A when linked to decisions | Atomic pointer rollback or rebuild from retained raw+manifest+loader | <= 24 h | <= 24 h | Model exists; national version/publish/rollback untested | NOT READY |
| RF staging/extracted | B | Redownload/re-extract/reload | none | <= 48 h | Disposable by design | DESIGN ONLY |
| Search indexes, caches, materialized projections | C | Recompute from canonical | none | <= 72 h | No national implementation | DESIGN ONLY |

## Interpretation

The RPO/RTO values are engineering proposals requiring owner approval. None is currently demonstrated in production. Daily logical execution, even if proven, cannot meet a 15-minute RPO and cannot guarantee a transactionally consistent recovery point.

Operational core, RF recovery, and full-platform restoration must be measured separately. Full-platform RTO also includes Auth/Storage configuration, secrets, networking, application restart, validation, and smoke tests; no measured full-platform RTO exists.

