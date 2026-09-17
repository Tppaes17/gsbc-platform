# RF-03A.2B Final Recovery Gate Review

Review date: 2026-09-17  
Mode: audit, evidence and decision support only

## Executive Summary

RF-03A.2B remains **NO-GO** and RF-03B remains **BLOCKED**. Independent review found no evidence that the recovery blockers recorded in RF-03A.2B were remediated. The latest successful provider observation reported no enumerated physical backup and PITR disabled; no production backup has ever been restored to an isolated target; the proposed critical RPO and operational RTO are not achievable/demonstrated; RF still shares the operational database failure domain; and national capacity has not been benchmarked.

The daily JSON export is a useful supplemental artifact, but it is not a transactionally consistent database backup and cannot recreate the complete database. The technical placement recommendation remains Option D: dedicated versioned object storage plus dedicated RF PostgreSQL. Provider, region, sizing, budget and operating ownership require explicit owner decisions.

Deployment governance is not counted as a blocker in this review. `ADR-REL-001` records the owner's decision to retain and accept the current auto-production risk. No application code, migration, production resource, provider setting, restore, ingestion, commit or push was performed.

## Evidence Reviewed

| Evidence | Classification | Review conclusion |
| --- | --- | --- |
| Supabase response `backups=null`, `physical_backup_data={}`, `pitr_enabled=false`, `walg_enabled=true` on 2026-09-17 | OBSERVED | Valid historical project observation; not proof of current improvement |
| Local/remote migrations `0001`-`0046` aligned during RF-03A.2B | TESTED | Valid baseline; migration 0046 exists locally |
| Current read-only Supabase CLI recheck | UNKNOWN | Commands did not return a result within the review window; no inference made |
| Local JSON backup smoke test, 1/1 in 16.0 seconds | TESTED | Proves limited JSON readability only, not database restore |
| Production isolated restore | NOT EXECUTED | No source backup or target exists in evidence |
| RF official WebDAV discovery, period `2026-09`, 37 ZIPs, 7,758,926,262 bytes | TESTED | Measured source metadata; no dataset download |
| Extracted/canonical/index/WAL/temp sizing | PROJECTED | Planning envelope only; no national benchmark |
| Supabase backup/PITR/clone capabilities and prices | PROVIDER-DOCUMENTED | Capability documentation does not prove project enablement |
| Recovery objectives | PROJECTED / OWNER APPROVAL REQUIRED | Engineering targets, not achieved service levels |
| RF recovery/version model and placement D | PROJECTED / PROPOSED | Architecture is documented but unimplemented |

Primary evidence reviewed:

- `docs/RF_03A2B_PRODUCTION_RECOVERY_READINESS_REPORT.md`
- `docs/rf-03a2b/PRODUCTION_RECOVERY_RUNBOOK.md`
- `docs/rf-03a2b/RECOVERY_TEST_REGISTER.md`
- `docs/rf-03a2b/RPO_RTO_MATRIX.md`
- `docs/rf-03a2b/RF_DATABASE_PLACEMENT_DECISION.md`
- `docs/rf-03a2b/CAPACITY_AND_RECOVERY_SIZING.md`
- `docs/rf-03a2b/RECOVERY_RISK_REGISTER.md`
- ADR-RF-013 through ADR-RF-018 as applicable, plus RF-03A.1/RF-03A.2A.1 reports and migration 0046

## Backup

**Current backup: PARTIAL.**

The last provider observation enumerated no physical backup. The repository implements a daily logical JSON export to private `db-backups` with intended 14-day deletion. It reads `public` tables through separate requests and Auth users separately, so it is not a consistent point-in-time snapshot. It omits non-public RF schemas, DDL, constraints, indexes, RLS, grants, functions, triggers, extensions, role material and Storage objects. The artifact resides in the same provider/account/project failure domain and its independent recovery was not demonstrated.

Provider-managed daily backup capability is PROVIDER-DOCUMENTED, but current project entitlement, retention and an actual recovery point are UNKNOWN after the unsuccessful read-only recheck. Historical absence remains the latest observed state.

```text
Backup exists: PARTIAL (supplemental JSON only)
Managed physical backup exists: UNKNOWN CURRENTLY; NOT ENUMERATED IN LAST OBSERVATION
Retention: 14 days intended for JSON; managed retention UNKNOWN
Restore granularity: JSON/table export only; no proven full-database granularity
Failure domain: same provider/account/project for primary and JSON artifact
```

## PITR

**PITR: DISABLED in the last successful provider observation; current remote recheck UNKNOWN.**

WAL-G being enabled does not establish an enabled, retained or usable PITR recovery window. No evidence shows a subsequent plan change, PITR enablement, recovery-window validation or restore to a selected timestamp. The proposed critical RPO of no more than 15 minutes is therefore **NOT ACHIEVABLE IN CURRENT STATE**.

## Restore Proof

The four required facts remain distinct:

| Fact | Result |
| --- | --- |
| Backup exists | PARTIAL: supplemental JSON; no enumerated physical recovery point in latest observation |
| Restore feature exists | PROVIDER-DOCUMENTED for eligible paid configurations |
| Restore procedure documented | YES, project runbook exists but is partial |
| Restore actually tested | NO |

```text
Isolated restore test: NOT EXECUTED
Restore source: NONE SELECTED / NO PROVEN PRODUCTION PHYSICAL BACKUP
Restore target: NOT CREATED
Measured duration: UNKNOWN
Validation performed: local JSON parsing and temporary-table count smoke only
```

The 16-second local smoke test does not restore schema, production rows, Auth, RLS, grants, functions, triggers, indexes or Storage and cannot establish production RPO/RTO.

## RPO/RTO Achievability

| Class | Proposed objective | Current conclusion |
| --- | --- | --- |
| Financial transactions and audit | RPO <=15 min; RTO <=4 h | RPO NOT ACHIEVABLE; RTO NOT DEMONSTRATED |
| Tenants/users/configuration | RPO <=1 h; RTO <=4 h | NOT DEMONSTRATED |
| RF manifest/provenance/links | RPO <=1 h; RTO <=8 h | PARTIAL design only |
| RF canonical active/previous | RPO <=24 h; RTO <=24 h | NOT READY / untested |
| RF raw official objects | RPO <=24 h; RTO <=48 h | Source rediscovery possible; production retention/recovery absent |
| Derived indexes/projections | no data RPO; RTO <=72 h | DESIGN ONLY |

**Critical RPO:** proposed <=15 minutes; not achievable in current state.  
**Operational Core RTO:** proposed <=4 hours; not measured or demonstrated.  
**RPO/RTO achievable current state:** NO.

## Failure Domain

**Failure domain: UNACCEPTABLE.**

The supplemental backup shares provider/account/project exposure with the primary. Project deletion, account compromise or provider/region failure lacks a proven independently protected copy. RF schemas share PostgreSQL disk, WAL, IOPS, CPU/memory, connections, locks, vacuum, backup and restore with Auth, collections, payments and audit. Schema separation is not infrastructure isolation.

## Database Placement

| Option | Blast radius and recovery | Capacity/operations | Conclusion |
| --- | --- | --- | --- |
| A - operational PostgreSQL + RF schemas | Shared core failure domain and restore | Lowest cost, unacceptable national-load risk | REJECT |
| B - dedicated RF PostgreSQL | Good database isolation; raw recovery still depends on source/other retention | Medium complexity and cost | VIABLE WITH DURABLE RAW STRATEGY |
| C - object storage + RF canonical in operational DB | Raw recoverability improves; canonical workload still threatens core | Shared DB remains limiting | NOT RECOMMENDED |
| D - object storage + dedicated RF PostgreSQL | Best workload and recovery separation; independent backup/PITR and rebuild path | Highest cost/operational burden; requires sizing | TECHNICAL RECOMMENDATION |

**RF Database Placement: OWNER DECISION REQUIRED.** Technical recommendation: **D**, subject to provider/region selection, representative benchmark, recovery controls, budget and named operator.

## Capacity/Headroom

Measured evidence is limited to:

```text
Reference: 2026-09
ZIPs: 37
Compressed bytes: 7,758,926,262
```

Extracted bytes, heap, indexes, two-version overlap, WAL, temp space, vacuum behavior, throughput and restore duration are PROJECTED or UNKNOWN. The 155-555 GB planning range is deliberately broad and must not be used as procurement sizing. Current production allocation, free disk and IOPS were not proven. A 7.76 GB compressed source does not prove PostgreSQL headroom.

**Capacity Headroom: FAIL for RF-03B.** The exact requirement remains UNKNOWN, but there is no evidence supporting a safe national load and the current shared placement is unacceptable independently of nominal free space.

## Runbook

**Recovery Runbook: PARTIAL.**

The runbook has roles, containment, isolated-restore discipline, validation, reconciliation and ten disaster scenarios. It correctly states that guidance is not evidence. It cannot be complete operationally until there is a real recovery point, authorized isolated target, tested credentials, cutover path, measured validation, independent backup and assigned alert/incident owners.

## Findings

### P0-RCV-001

- **Severity:** P0
- **Evidence:** OBSERVED no enumerated physical backup and PITR disabled on 2026-09-17; TESTED local JSON smoke only; isolated production restore NOT EXECUTED.
- **Risk:** critical operational, financial, tenant and audit data have no proven recoverable point.
- **Status:** OPEN.
- **Blocks RF-03B?:** YES.
- **Remediation:** establish approved managed/equivalent protection, observe a real recovery point, restore it to an isolated target and validate full invariants.
- **Owner decision required?:** YES.

### P1-RCV-002

- **Severity:** P1
- **Evidence:** proposed critical RPO <=15 minutes; PITR disabled in latest observation; no equivalent window proven.
- **Risk:** unacceptable loss interval for financial and audit data.
- **Status:** OPEN / BLOCKING.
- **Blocks RF-03B?:** YES.
- **Remediation:** owner approves RPO and PITR/equivalent; verify retained window and selected-point restore.
- **Owner decision required?:** YES.

### P1-RCV-003

- **Severity:** P1
- **Evidence:** OBSERVED backup implementation uses separate PostgREST/Auth reads, `public` scope and same-provider bucket with 14-day lifecycle.
- **Risk:** inconsistent/incomplete restore artifact and common-mode loss.
- **Status:** OPEN / BLOCKING.
- **Blocks RF-03B?:** YES.
- **Remediation:** retain JSON only as supplemental export; add complete, consistent and independently protected recovery mechanism.
- **Owner decision required?:** YES, for protection/failure-domain budget.

### P1-RCV-004

- **Severity:** P1
- **Evidence:** OBSERVED RF schemas share operational PostgreSQL; national workload and rollback are unbenchmarked.
- **Risk:** RF load can exhaust disk/WAL/IOPS/connections or extend recovery for Auth, collections and payments.
- **Status:** OPEN / BLOCKING.
- **Blocks RF-03B?:** YES.
- **Remediation:** approve and provision isolated RF placement, technically recommended Option D, then prove recovery.
- **Owner decision required?:** YES.

### P1-RCV-005

- **Severity:** P1
- **Evidence:** production allocation/free disk/IOPS UNKNOWN; only compressed source size is measured; all database expansion factors are PROJECTED.
- **Risk:** no defensible storage, throughput, WAL, temp or restore headroom.
- **Status:** OPEN / BLOCKING.
- **Blocks RF-03B?:** YES.
- **Remediation:** run representative multi-entity benchmark and restore test in isolated RF infrastructure.
- **Owner decision required?:** YES, to provision benchmark resources.

### P1-RCV-006

- **Severity:** P1
- **Evidence:** TESTED official-source reachability only from user VPN; production worker does not exist.
- **Risk:** selected executor may be unable to discover/download the official source.
- **Status:** OPEN / BLOCKING.
- **Blocks RF-03B?:** YES.
- **Remediation:** select/provision worker and run bounded metadata probe from that environment before ingestion.
- **Owner decision required?:** YES.

### P2-RCV-007

- **Severity:** P2
- **Evidence:** no independently protected cross-account/cross-region critical copy observed.
- **Risk:** provider/account/project loss may remove primary and recovery artifacts.
- **Status:** OPEN.
- **Blocks RF-03B?:** NO independently, but contributes to P0/P1 recovery failure.
- **Remediation:** approve encrypted independent retention and test access.
- **Owner decision required?:** YES.

### P2-RCV-008

- **Severity:** P2
- **Evidence:** structured backup-failure events exist; no demonstrated alert owner/SLA or restore-age/PITR-window alert.
- **Risk:** silent degradation of backup/recovery readiness.
- **Status:** OPEN.
- **Blocks RF-03B?:** NO independently.
- **Remediation:** assign owners and alerts for backup, PITR/archive and last successful restore-test age.
- **Owner decision required?:** NO for design; YES if paid monitoring is selected.

### P2-RCV-009

- **Severity:** P2
- **Evidence:** RF N/N+1 atomic publish and rollback are PROPOSED, not nationally implemented/tested.
- **Risk:** defective publish recovery time and correctness remain unknown.
- **Status:** OPEN.
- **Blocks RF-03B?:** NO as an implementation deliverable within later RF work, provided infrastructure hard gates close first.
- **Remediation:** implement and test only after isolated infrastructure authorization; keep publication disabled until validated.
- **Owner decision required?:** YES for infrastructure, not for the architectural invariant.

### P3-RCV-010

- **Severity:** P3
- **Evidence:** historical ADR label overlap was explicitly mapped without repurposing existing decisions.
- **Risk:** governance ambiguity only.
- **Status:** RESOLVED IN DOCUMENTATION.
- **Blocks RF-03B?:** NO.
- **Remediation:** preserve current IDs and references.
- **Owner decision required?:** NO.

Counts remain **P0=1, P1=5, P2=3, P3=1**. Blocking findings: `P0-RCV-001`, `P1-RCV-002`, `P1-RCV-003`, `P1-RCV-004`, `P1-RCV-005`, `P1-RCV-006`.

## Owner Decisions

### DECISION 1

**Question:** What recovery objectives and retention are accepted for each data class?  
**Why now:** Protection and infrastructure cannot be selected or tested without accepted objectives.  
**Option A:** Accept the proposed class-specific matrix, including critical RPO <=15 minutes and operational RTO <=4 hours.  
**Option B:** Approve different explicit objectives based on business impact analysis.  
**Option C:** Leave objectives undefined.  
**Technical recommendation:** A, subject to business confirmation.  
**Risk of each:** A has higher protection cost; B may be valid but can increase tolerated loss/downtime; C makes readiness untestable.  
**Estimated cost:** A/B UNKNOWN until provider/retention are selected; C has unbounded incident exposure.  
**Reversibility:** Objectives can be revised, but lost historical coverage cannot be recreated retroactively.  
**Does it block RF-03B?:** YES.

### DECISION 2

**Question:** Which protection mechanism will make the operational core recoverable?  
**Why now:** No proven critical recovery point or PITR window exists.  
**Option A:** Enable eligible managed backup and PITR meeting the approved RPO.  
**Option B:** Implement an equivalent independently recoverable architecture with demonstrated RPO.  
**Option C:** Retain the JSON export as the only custom protection.  
**Technical recommendation:** A plus an independent copy for common-mode failure; B only if it proves equivalent controls. Reject C as primary recovery.  
**Risk of each:** A has provider/cost dependence; B has higher engineering burden; C cannot meet consistency/completeness/RPO requirements.  
**Estimated cost:** Provider documentation previously indicated about USD 100/month for 7-day PITR plus eligible paid plan/compute; current exact price/configuration must be confirmed. B is UNKNOWN.  
**Reversibility:** Service can be disabled later, but doing so shortens future coverage; historical gaps remain.  
**Does it block RF-03B?:** YES.

### DECISION 3

**Question:** Authorize a paid isolated restore target and production-backup drill?  
**Why now:** Backup existence and procedure are insufficient without actual restore proof and measured duration.  
**Option A:** Authorize provider-supported clone/restore after a valid recovery point exists.  
**Option B:** Authorize an equivalent isolated recovery environment under the selected protection design.  
**Option C:** Defer the drill.  
**Technical recommendation:** A or B according to Decision 2; never restore over production.  
**Risk of each:** A/B incur temporary cost and require strict outbound isolation; C leaves the hard gate open.  
**Estimated cost:** UNKNOWN; provider documents the new project/clone as billable.  
**Reversibility:** Temporary target can be destroyed after evidence retention; drill side effects must remain isolated.  
**Does it block RF-03B?:** YES.

### DECISION 4

**Question:** Approve RF placement, provider, region, budget and operating owner?  
**Why now:** National RF load cannot safely share the operational PostgreSQL and cannot be benchmarked without a target.  
**Option A:** Current operational PostgreSQL plus RF schemas.  
**Option B:** Dedicated RF PostgreSQL with durable raw strategy.  
**Option C:** Dedicated versioned object storage plus dedicated RF PostgreSQL (Option D in the placement analysis).  
**Technical recommendation:** C / placement Option D.  
**Risk of each:** A has unacceptable blast radius; B improves DB isolation but needs durable raw recovery; C has highest cost and operational burden but strongest separation/rebuild path.  
**Estimated cost:** UNKNOWN until provider, compute, storage/IOPS, retention, worker and observability are selected.  
**Reversibility:** Infrastructure can be decommissioned after safe data migration/retention; co-locating first creates avoidable migration and incident risk.  
**Does it block RF-03B?:** YES.

### DECISION 5

**Question:** Approve independent backup/storage retention and recovery observability ownership?  
**Why now:** Same-account/project loss and silent protection failure remain unmitigated.  
**Option A:** Cross-account and, where justified, cross-region encrypted copies with tested restore access and named alerts.  
**Option B:** Same-provider but independently protected account/project with tested deletion survival.  
**Option C:** Retain current same-project bucket and unassigned alerts.  
**Technical recommendation:** A for critical irreconstructible data; B only if its failure-domain limits are explicitly accepted.  
**Risk of each:** A costs more and needs key governance; B retains provider-level correlation; C leaves common-mode and silent-failure risk open.  
**Estimated cost:** UNKNOWN pending volume, retention, region and monitoring selection.  
**Reversibility:** Retention and destination can change; deleting the only independent history is irreversible.  
**Does it block RF-03B?:** YES as part of closing P0/P1 recovery protection.

## RF-03B Preconditions

1. Close `P0-RCV-001` and all five blocking P1 findings.
2. Observe a complete critical backup/recovery point and approved retention.
3. Enable and validate PITR or equivalent protection meeting the approved critical RPO.
4. Restore a real production recovery point to an isolated target and validate schema, Auth, RLS, grants, functions, triggers, data invariants and application behavior.
5. Measure and accept operational RTO and data-loss interval.
6. Approve and provision isolated RF placement with independent recovery controls.
7. Benchmark representative load, two-version overlap, WAL/temp, cleanup and restore to prove capacity headroom.
8. Prove official-source reachability from the selected production worker.
9. Activate recovery/backup/capacity observability with named owners.
10. Obtain separate human authorization to begin RF-03B after these gates close.

## Final Gate

```text
Backup: PARTIAL
PITR: DISABLED IN LAST OBSERVATION; CURRENT RECHECK UNKNOWN
Isolated Restore Proof: NOT EXECUTED
Critical RPO: <=15 MIN PROPOSED; NOT ACHIEVABLE CURRENT STATE
Operational Core RTO: <=4 HOURS PROPOSED; NOT DEMONSTRATED
RPO/RTO Achievable Current State: NO
Failure Domain: UNACCEPTABLE
RF Database Placement: OWNER DECISION REQUIRED
Technical Recommendation: OPTION D
Capacity Headroom: FAIL
Recovery Runbook: PARTIAL
P0: 1
P1: 5
RF-03A.2B Final Gate: NO-GO
RF-03B: BLOCKED
```

This result cannot be classified GO WITH CONDITIONS: restore proof, critical recovery protection, capacity and workload isolation are hard gates. Analysis ends here pending human decisions; it does not authorize remediation or RF-03B.
