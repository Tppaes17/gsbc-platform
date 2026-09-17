# RF-03A.2B.1 - Recovery Architecture Owner Decision

Status: **OWNER DECISION READY**  
Date: 2026-09-17  
Scope: GSBC Operational Core only

## 1. Current State

The latest successful provider observation for project `zjtuvsgigymgludplghd` reported `walg_enabled=true`, `pitr_enabled=false`, `backups=null` and no enumerated physical recovery point. A read-only recheck during RF-03A.2B did not return a conclusive result; current remote state is therefore UNKNOWN, while disabled PITR remains the last OBSERVED state.

The repository has a daily logical JSON export with intended 14-day retention in private `db-backups`. It is TESTED only for JSON readability and selected table-array presence. It is not transactionally consistent, reads tables/Auth separately, covers `public` rather than the complete platform, shares the provider/account/project failure domain and cannot recreate DDL, indexes, constraints, RLS, grants, functions, triggers, extensions, Auth/configuration completeness or Storage objects.

No production backup has been restored to an isolated target. Current recovery readiness is PARTIAL and the RF-03A.2B gate remains NO-GO.

Evidence labels in this document mean `TESTED`, `OBSERVED`, `PROVIDER-DOCUMENTED`, `PROJECTED`, `ASSUMED` or `UNKNOWN`. Provider capability is never represented as project enablement.

## 2. Critical Data

| Class | Representative data | Nature | Loss impact |
| --- | --- | --- | --- |
| Identity and tenancy | tenants, users/profiles, memberships, roles, delegations, private contacts | Irreconstructible operational authority | Cross-tenant access ambiguity, lockout, privacy exposure |
| Contracts and configuration | instruments, clauses, collective-instrument settings, policies, validated classifications, obligations | Human/legal/business decisions | Incorrect obligations, collection rules and decisions |
| Financial state | collections, receivables/charges, payments, settlements, splits, compensation and reconciliation | Irreconstructible, externally coupled | Duplicate/missing collection, ledger divergence, financial loss |
| Evidence and governance | delivery evidence, audit logs, decision events, legal records, dispute/negotiation history | Evidentiary and audit trail | Inability to prove what happened or reconcile action |
| Reconstructible outputs | caches, projections and some derived classifications | Recomputable when sources/version are preserved | Service degradation and rebuild time, not primary truth loss |

### Loss Window Impact

| Data loss | Expected impact |
| --- | --- |
| 5 minutes | Potential loss of in-flight payment/webhook, user, audit and human-decision events; requires provider reconciliation |
| 15 minutes | Material reconciliation workload but bounded enough for a documented incident response; still not zero loss |
| 1 hour | Multiple collection/payment cycles and operator actions may diverge; high financial and evidentiary risk |
| 4 hours | Broad operational reconstruction, customer communication and external-event replay; likely unacceptable for normal incidents |
| 24 hours | Loss of a business day of financial, identity and legal/audit activity; unacceptable for the operational core |

Not every table has equal criticality, but transaction integrity crosses tables. A backup policy cannot safely protect only `pagamentos` while omitting the charge, reconciliation, webhook, audit and tenant context that gives it meaning.

## 3. RPO Options

| Option | Mechanism | PITR | Backup | Cost/complexity | Residual risk | GSBC fit |
| --- | --- | --- | --- | --- | --- | --- |
| A - <=5 min | Continuously archived WAL/PITR, monitored lag and tested selected-point restore | REQUIRED | Native base/physical plus independent copy | PITR cost; strongest monitoring/on-call burden | Last WAL interval, external side effects and provider failure | High resilience; stronger than current demonstrated need |
| B - <=15 min | PITR with monitored recovery window/lag and reconciliation | REQUIRED | Native physical plus periodic independent logical backup | Moderate; same PITR retention fee as finer points | Up to 15 minutes accepted plus replay/reconciliation | **RECOMMENDED** balance for financial/audit core |
| C - <=1 h | PITR or verified hourly independent snapshots | RECOMMENDED; practically preferred | Complete independent backup required | Custom hourly automation can exceed PITR complexity | One hour of financial/audit divergence | Weak for payment and human-decision traffic |
| D - <=24 h | Daily managed backup | NOT REQUIRED for the target itself | Daily complete backup | Lowest | Up to one business day lost | NOT ADEQUATE for operational core |

Supabase documents PITR restoration with up-to-seconds selection granularity. That is PROVIDER-DOCUMENTED capability, not a guaranteed achieved RPO. Actual lag/window must be observed and alerted. The recommendation adopts **RPO-B <=15 minutes** as an engineering target requiring owner approval and a successful drill.

## 4. RTO Options

RTO starts at incident impact, not at the restore button. It includes detection, authority/decision, containment, target provisioning, physical restore/WAL replay, secrets and configuration, disabling outbound jobs, database/application validation, DNS/config cutover, smoke tests and reconciliation.

| Target | Feasibility | Required controls | Assessment |
| --- | --- | --- | --- |
| <=1 h | UNKNOWN and likely unrealistic before automation/benchmarks | Fast detection, pre-authorized response, small known dataset, automated validation/cutover | Aspirational high-resilience objective only |
| <=4 h | PROJECTED; not demonstrated | PITR, rehearsed isolated restore, named owners, automated checks and cutover plan | **RECOMMENDED target**, subject to drill |
| <=8 h | More operational margin | Same architecture with less aggressive response automation | Conservative initial commitment if 4 h drill fails |
| <=24 h | Technically easier | Manual recovery may suffice | Too slow for core financial/identity workflows |

Recommendation: **RTO-B <=4 hours** as the target. Until a full drill measures it, the achieved RTO remains UNKNOWN and must not be marketed or contracted as an SLA.

## 5. PITR Analysis

| RPO option | PITR classification | Reason |
| --- | --- | --- |
| <=5 min | REQUIRED | Daily/hourly backups cannot provide the required recovery-point granularity |
| <=15 min | REQUIRED | Continuous WAL-based recovery is the proportionate managed mechanism |
| <=1 h | RECOMMENDED | Custom hourly consistent backups are possible but add significant operational failure modes |
| <=24 h | OPTIONAL | Daily complete backups can satisfy nominal RPO, subject to timing and successful restore |

Official Supabase documentation reviewed on 2026-09-17 states:

- Pro/Team/Enterprise projects receive daily managed backups with 7/14/up-to-30-day retention respectively.
- PITR is a paid add-on on paid plans, requires at least Small compute and replaces daily backups while enabled.
- PITR supports selection within the observed recovery window with up-to-seconds granularity; actual latest point may lag when there is no activity.
- Restoration downloads a physical base and replays WAL; project downtime depends on database size.
- PITR retention is about USD 100/month for 7 days, USD 200 for 14 days and USD 400 for 28 days.

Recommended PITR window: **7 days initially**. This provides a bounded response window at the lowest documented PITR tier. It does not protect against corruption discovered after seven days or project/account deletion, so it must be paired with independent retention.

## 6. Current Backup

```text
What exists: custom logical JSON export
Frequency: daily by repository cron design; production execution continuity not proven
Retention: intended 14 days
Encryption: provider transport/storage behavior not independently evidenced for this artifact
Failure domain: same provider/account/project as primary
Restore path: custom JSON parsing only; no complete database restore path
Granularity: per-table separate reads plus Auth listing; no common transaction point
```

It may help inspect or selectively reconstruct some `public` data. It does not qualify as the primary recovery mechanism and must not be used as evidence of a restorable database.

## 7. Independent Backup

| Option | Risk/security | Restore complexity | Retention/automation | Deletion protection | Assessment |
| --- | --- | --- | --- | --- | --- |
| BI-A provider-only | Simple but common provider/account/project domain | Lowest | Native | Provider docs state project deletion removes associated backups | Insufficient alone |
| BI-B independent logical (`pg_dump` -> encrypted objects) | Separates project failure; requires keys and complete dump discipline | Medium/high; configuration/Storage handled separately | Automatable with lifecycle | Depends on destination account and immutability | Good supplement |
| BI-C cross-account/cross-provider | Strongest common-mode separation | Highest egress, identity and restore burden | Automatable but operationally heavier | Strong when delete credentials are separated | High-resilience option |
| BI-D hybrid PITR + independent periodic backup | Fast granular recovery plus long-tail/common-mode protection | Two tested recovery paths | PITR plus scheduled encrypted lifecycle | Strong if destination credentials/failure domain are independent | **RECOMMENDED** |

The independent artifact should be a complete, restorable PostgreSQL logical backup or another verified format, not the current table JSON export. Storage objects and provider configuration need separate inventories/exports because database backups/clones do not fully reproduce them.

## 8. Retention

No legal retention obligation is inferred. The following is an operational proposal for owner/compliance review:

| Layer | Proposed retention | Purpose | Evidence status |
| --- | --- | --- | --- |
| PITR | 7 rolling days | Fast granular recovery from recent operator/application error | PROVIDER-DOCUMENTED capability; not enabled |
| Independent daily logical | 14 rolling days | Common-mode supplement and daily investigation points | PROJECTED policy |
| Independent weekly | 8 rolling weeks | Detect corruption discovered after PITR window | PROJECTED policy |
| Independent monthly | 12 rolling months | Longer incident/audit investigation baseline | PROJECTED policy; compliance must approve |
| Restore-drill evidence | 12 months or until superseded plus incident policy | Demonstrate recoverability over time | PROJECTED policy |

The policy should be recalculated after measuring database growth and storage cost. Retention alone is not immutability; lifecycle deletion credentials must be separated from backup-write credentials, and legal/compliance may shorten or extend classes based on actual obligations.

## 9. Failure Domain

| Asset/control | Current/proposed domain | Common-mode exposure |
| --- | --- | --- |
| Primary database | Supabase project/account/region `eu-west-1` | Provider, region, account, project and privileged identity |
| Native backup/PITR | Same provider and project lifecycle | Project deletion/provider/account events; docs state deletion removes associated backups |
| Current JSON bucket | Same provider/account/project | Can fail with primary; not independent |
| Proposed independent backup | Separate account and preferably separate provider/region | Reduced common mode; still depends on backup credentials/keys |
| Restore credentials | Independently controlled secret store/break-glass access | Compromise can block or corrupt recovery if shared |

Answers:

- One provider/account incident could currently affect primary and recovery: **YES**.
- Project deletion could currently affect recovery: **YES**, based on provider documentation and same-project storage.
- Compromised privileged credentials could affect backups: **YES**, unless write/delete/restore identities and immutable retention are separated.

## 10. Security

Independent backup requirements:

- TLS in transit and provider-side encryption at rest; customer-managed key only if its recovery lifecycle is separately solved.
- Dedicated least-privilege backup writer with no production mutation and no lifecycle-policy administration.
- Separate restore/break-glass identity; no application runtime access to backup objects.
- Object versioning or immutable retention where available, with deletion protection and MFA/dual control for destructive policy changes.
- Lifecycle rules matching approved retention and data minimization.
- Access/deletion logs exported outside the protected bucket.
- Credential rotation and an offline recovery-access procedure.
- Restore validation without exposing PII in logs/evidence.
- Region/data-processing and LGPD review before cross-provider/cross-region replication; no legal conclusion is inferred here.

## 11. Restore Strategy

```text
INCIDENT
-> detect, declare and assign Incident Commander
-> freeze/contain risky writes and preserve incoming external events
-> identify last-known-good point and external side effects
-> choose PITR/native/independent recovery source
-> restore to isolated target, never over production for the drill
-> disable outbound cron, webhooks, email and payment side effects
-> validate database, Auth, RLS, grants, functions, triggers and invariants
-> run tenant-isolation, payment-idempotency and financial reconciliation tests
-> reapply/rotate configuration and secrets
-> measure data-loss interval and end-to-end elapsed time
-> human cutover/repair/abandon decision
-> monitored service restoration and post-incident review
```

The sequence and validation checklist are DOCUMENTED. The provider source, isolated target, credentials, full validation, cutover and duration are UNTESTED/UNKNOWN.

## 12. Restore Drill Plan

**Objective:** prove that a real production recovery point can create an isolated, safe and usable operational core within the approved RPO/RTO.

**Target:** new paid Supabase project in the same region for the first drill, with matching compute/disk attributes and no production aliases. Provider restore-to-new-project is currently documented as database-only and creates a billable project.

**Source:** a verified physical/PITR recovery point after protection is enabled. A second exercise should restore the independent logical artifact to test common-mode recovery.

**Data handling:** production-derived data only in an approved isolated environment with production-equivalent access controls; evidence contains aggregates/hashes, never PII.

**Validations:** schemas, migration baseline, extensions, tables/counts, constraints/indexes, RLS/grants, functions/triggers, Auth users, Vault/encryption behavior, Storage inventory, tenant isolation, service role, audit continuity, charge/payment/webhook idempotency, reconciliation, outbound-job suppression and application smoke.

**Metrics:** detection/decision time (simulated separately), target provision time, base restore, WAL replay, configuration, validation, cutover rehearsal, total elapsed time, selected/latest recovery point, actual data-loss interval, failures/retries and operator effort.

**Expected time:** UNKNOWN until measured; planning window 2-8 hours is ASSUMED only for scheduling, not an RTO claim.

**Cost:** temporary compute/disk billed while target exists, plus any PITR/egress/storage. Exact amount UNKNOWN until source attributes and duration are inspected.

**Cleanup:** retain redacted evidence and corrective actions; rotate temporary secrets; remove routes/integrations; delete target only after owner/security sign-off and cost capture.

The drill is a separately authorized phase. This document does not authorize it.

## 13. Costs

Official references checked 2026-09-17:

| Item | Cost | Classification |
| --- | --- | --- |
| Supabase Pro | from USD 25/month; includes 7-day daily backups and 8 GB disk | KNOWN provider list price |
| Small compute | about USD 15/month; paid plans include USD 10 monthly compute credit at organization level | KNOWN provider list price |
| PITR 7 days | about USD 100/month | KNOWN provider list price |
| PITR 14 days | about USD 200/month | KNOWN provider list price |
| PITR 28 days | about USD 400/month | KNOWN provider list price |
| Restore target | matching project compute/disk billed for its lifetime | KNOWN billing model; amount UNKNOWN |
| Independent object storage | capacity, requests, versioning, region and egress dependent | UNKNOWN |
| Backup automation/monitoring | worker/runtime/log destination dependent | UNKNOWN |

Illustrative Balanced provider floor is approximately **USD 130/month** for Pro + one Small project + 7-day PITR after one USD 10 compute credit, before taxes, existing-plan offsets, disk/egress, independent storage and automation. This is ESTIMATED, not a quote; the current billing plan/allocation remains UNKNOWN.

Sources: [Supabase pricing](https://supabase.com/pricing), [database backups and PITR](https://supabase.com/docs/guides/platform/backups), [compute usage](https://supabase.com/docs/guides/platform/manage-your-usage/compute), [restore to a new project](https://supabase.com/docs/guides/platform/clone-project).

## 14. Architecture Packages

### Recovery Option 1 - Minimal

- Paid-plan native daily backups, nominal 7-day retention.
- No PITR, no independent complete backup.
- Manual restore and validation.
- Nominal RPO up to 24 hours; RTO UNKNOWN/likely up to 24 hours.
- Lowest cost, but common-mode/project deletion and late corruption remain material.
- **Not adequate for GSBC operational core.**

### Recovery Option 2 - Balanced

- Target RPO <=15 minutes and RTO <=4 hours.
- 7-day PITR with monitored latest/earliest point and lag.
- Native physical recovery plus encrypted independent complete logical backup.
- Proposed daily/weekly/monthly lifecycle, separate account/failure domain.
- Mandatory initial restore drill and at least semiannual drills after stabilization; frequency is a proposal for owner approval.
- Named incident, database, security, application and business owners.
- **Technical recommendation.**

### Recovery Option 3 - High Resilience

- Target RPO <=5 minutes and RTO <=1 hour.
- 14-28-day PITR, cross-account/cross-provider immutable backup and stronger retention.
- More frequent drills, automated validation/cutover preparation and 24/7 alert ownership.
- Highest cost and operational burden; <=1 hour remains unproven and may require architectural availability controls beyond backup/restore.

## 15. Decision Matrix

| Criterion | Minimal | Balanced | High Resilience |
| --- | --- | --- | --- |
| RPO | <=24 h nominal | <=15 min target | <=5 min target |
| RTO | <=24 h target/UNKNOWN | <=4 h target/UNKNOWN until drill | <=1 h target/UNKNOWN |
| PITR | no | 7 days | 14-28 days |
| Independent backup | no | encrypted periodic, separate domain | immutable cross-account/provider |
| Failure-domain protection | weak | good for project/account; provider choice determines residual | strongest proposed |
| Restore complexity | medium/manual | medium; two recovery paths | high; multiple paths/automation |
| Operational burden | low | moderate | high/on-call maturity |
| Estimated monthly cost | Pro baseline from USD 25; actual UNKNOWN | provider floor ~USD 130 + independent storage/automation | provider floor ~USD 230-430 + storage/automation/on-call |
| Residual risk | high | moderate | lower, never zero |

## 16. Technical Recommendation

Choose **Recovery Option 2 - Balanced**, **RPO-B <=15 minutes**, **RTO-B <=4 hours**, **BI-D hybrid independent backup**, and authorize a separate restore-drill phase after cost review.

**Why:** GSBC holds irreconstructible multi-tenant, financial, audit and human-decision state. Daily recovery permits too much loss; high-resilience <=1-hour recovery is not currently evidenced and may require broader availability engineering.

**Risk reduced:** recent logical/operator corruption through PITR; project/account/common-mode loss through independent backup; unusable-backup risk through drills; silent lag through monitoring.

**Cost:** estimated provider floor near USD 130/month under stated assumptions, plus independent storage, automation, egress and temporary drill target. Exact cost requires billing/project inspection and vendor selection.

**Not solved:** provider/region live availability, external PSP/email/webhook side effects, Storage object recovery, compromised keys, application bugs, RF infrastructure/capacity or guaranteed four-hour recovery.

**Must be tested:** actual PITR window/lag, physical isolated restore, independent logical restore, configuration/Storage reconstruction, full security/financial validation and measured end-to-end RTO.

## 17. Residual Risks

- `P0-RCV-001` and `P1-RCV-002/003` remain open until implementation and proof, regardless of owner selection.
- PITR and native backup remain within the provider/project lifecycle.
- An independent dump may be incomplete or unusable unless its restore is exercised.
- RTO <=4 hours is PROJECTED and may fail due to target provisioning, database size, configuration or validation time.
- Database recovery does not undo payment, email, webhook or storage side effects.
- Provider clone restores database content but requires manual reconfiguration and does not copy Storage objects; restored external jobs may start unless explicitly contained.
- Retention and cross-region design require security, privacy and compliance review.
- This phase does not decide RF database placement, worker, object storage, capacity or ingestion.

## 18. Owner Decisions

Record one choice for each item:

```text
DECISION 1 - RPO
A <=5m
B <=15m  [TECHNICAL RECOMMENDATION]
C <=1h
D <=24h
OTHER: __________

DECISION 2 - RTO
A <=1h
B <=4h   [TECHNICAL RECOMMENDATION]
C <=8h
D <=24h
OTHER: __________

DECISION 3 - RECOVERY ARCHITECTURE
OPTION 1 - MINIMAL
OPTION 2 - BALANCED  [TECHNICAL RECOMMENDATION]
OPTION 3 - HIGH RESILIENCE
CUSTOM: __________

DECISION 4 - INDEPENDENT BACKUP
YES  [TECHNICAL RECOMMENDATION]
NO - ACCEPT RISK
DEFER

DECISION 5 - RESTORE DRILL
AUTHORIZE NEXT PHASE  [TECHNICAL RECOMMENDATION; STILL REQUIRES COST/SCOPE PREFLIGHT]
DEFER
```

No selection is inferred from this document. Owner acceptance chooses architecture but does not itself enable PITR, purchase resources or authorize a production restore.

## Gate

```text
RF-03A.2B.1: OWNER DECISION READY
RECOVERY READY: NO
RF-03A.2B: NO-GO
RF-03B: BLOCKED
CHANGES APPLIED TO INFRASTRUCTURE: NONE
```

After owner choices, implementation/provisioning and restore testing require separately controlled phases.
