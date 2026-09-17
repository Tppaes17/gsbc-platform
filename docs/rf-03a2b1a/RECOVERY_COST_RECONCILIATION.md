# RF-03A.2B.1A - Recovery Cost Reconciliation

Status: **COST DECISION READY**  
Date: 2026-09-17  
Currency: USD, excluding taxes unless stated

## Executive Summary

The owner's dashboard establishes the current plan as **Free** and shows 7-day PITR at **USD 100/month plus taxes**. Current official Supabase documentation confirms that PITR requires a paid plan and at least Small compute. Pro starts at USD 25/month, Small compute is about USD 15/month, and paid organizations receive USD 10/month in compute credits.

The realistic provider floor for the approved Balanced architecture is therefore:

```text
Pro plan                         USD 25/month
Small compute                    USD 15/month
Compute credit                  -USD 10/month
PITR 7 days                     USD 100/month
------------------------------------------------
Provider floor                  USD 130/month
```

Independent backup storage, execution/automation, monitoring, egress, taxes and restore-drill resources remain UNKNOWN. The truthful result is **USD 130/month plus unknown variable components**, not a fixed all-in quote. Annual provider floor is **USD 1,560 plus unknowns**.

Relative to a likely Pro/Micro baseline that the SaaS may need independently, recovery adds approximately **USD 105/month**: USD 100 PITR plus USD 5 net incremental compute to move from credit-covered Micro to Small. Independent backup and operations remain additional. Relative to the current Free plan, the total recurring uplift begins at USD 130/month.

No lower-cost architecture is currently proven to achieve RPO <=15 or <=30 minutes. For <=1 hour, a lower-cost temporary candidate exists: Pro native daily backup plus complete encrypted logical backups started every 30 minutes, retained outside the Supabase failure domain and restored in a drill. It reaches a defensible <=1-hour target only if benchmark evidence proves every dump and upload completes within 30 minutes, runs never overlap or silently skip, all critical database/configuration components are covered, and restore validation passes. Until then its effective RPO/RTO remain UNKNOWN. It is not technically equivalent to PITR.

## Evidence And Assumptions

| Item | Value | Classification |
| --- | ---: | --- |
| Current project plan | Free | OBSERVED in owner dashboard, 2026-09-17 |
| PITR 7/14/28 days | USD 100/200/400 monthly | OBSERVED in dashboard and PROVIDER-DOCUMENTED |
| Pro plan | from USD 25/month | PROVIDER-DOCUMENTED |
| Pro automatic daily backup retention | 7 days | PROVIDER-DOCUMENTED |
| Small compute | about USD 15/month | PROVIDER-DOCUMENTED |
| Paid-plan compute credit | USD 10/month per organization | PROVIDER-DOCUMENTED |
| PITR minimum compute | Small | PROVIDER-DOCUMENTED |
| Independent backup size/growth | Not measured | UNKNOWN |
| Current database size/change rate | Not supplied in cost evidence | UNKNOWN |
| Taxes | Excluded by provider UI; jurisdiction/rate not supplied | UNKNOWN, never treated as zero |

Official sources checked on 2026-09-17:

- [Supabase Pricing](https://supabase.com/pricing)
- [Database Backups and PITR](https://supabase.com/docs/guides/platform/backups)
- [Compute Usage and Pricing](https://supabase.com/docs/guides/platform/manage-your-usage/compute)
- [Restore to a New Project](https://supabase.com/docs/guides/platform/clone-project)

Provider documentation states that Pro receives seven days of daily backups; PITR replaces daily backups while enabled, restores from a physical base plus WAL replay, and is priced by retention. Project deletion permanently removes associated provider backups. Restore to a new project is paid-plan/database-only, mirrors source compute/disk attributes, omits Storage objects and several service settings, and can start restored database jobs/extensions. These facts materially affect drill isolation and independent-copy value.

## Balanced Cost Stack

| Component | Monthly | Annual | Cost type | Notes |
| --- | ---: | ---: | --- | --- |
| Supabase Pro base | USD 25 | USD 300 | Recurring/known floor | May be needed for production SaaS independently of recovery |
| Small compute | USD 15 | USD 180 | Recurring/known floor | Required minimum for PITR |
| Compute credit | -USD 10 | -USD 120 | Recurring/provider-documented | Organization-level; assumption: available and not consumed elsewhere |
| PITR 7 days | USD 100 | USD 1,200 | Recurring/known list price | Taxes excluded |
| Independent backup storage | UNKNOWN | UNKNOWN | Variable | Requires measured dump size, versions and retention |
| Backup execution/automation | UNKNOWN | UNKNOWN | Recurring/variable | Worker/runtime and orchestration not selected |
| Backup egress | UNKNOWN | UNKNOWN | Variable | Depends on destination, volume and provider quotas |
| Incremental monitoring | UNKNOWN | UNKNOWN | Recurring/variable | Alert/log destination not selected |
| Taxes | UNKNOWN | UNKNOWN | Variable | Must be added to billing decision |
| Restore-drill target | See drill section | Periodic | One-off/periodic | Requires separate authorization |

```text
MONTHLY RECURRING PROVIDER FLOOR: USD 130 + unknowns + taxes
ANNUAL RECURRING PROVIDER FLOOR: USD 1,560 + unknowns + taxes
INCREMENTAL RECOVERY OVER PRO/MICRO BASELINE: USD 105/month, USD 1,260/year + unknowns + taxes
INCREMENTAL FROM CURRENT FREE STATE: USD 130/month, USD 1,560/year + unknowns + taxes
```

The USD 105 calculation assumes Pro/Micro totals USD 25 after the USD 10 compute credit and that the same credit remains available. If another project consumes the organization credit, the actual allocation changes; invoice-level verification is required before purchase.

## Scenario A - Balanced With Supabase PITR 7 Days

**Architecture:** Pro + Small + seven-day PITR + periodic complete encrypted independent backup + monitored recovery window + separately authorized restore drills.

- Effective RPO: <=15 minutes is a **DEFENSIBLE TARGET**, not yet verified. Provider selection granularity is finer, but actual lag and operational response must be observed.
- Effective RTO: <=4 hours is a **DEFENSIBLE TARGET**, not verified until a complete drill.
- Logical-error recovery: strong within PITR window when the bad point is known; older/late corruption depends on independent retention.
- Failure domain: provider PITR remains provider/project coupled; independent copy reduces common-mode exposure.
- Monthly provider floor: USD 130 plus independent/operational unknowns and taxes.
- Technical equivalence to approved architecture: YES at design level; readiness remains NO until implementation/test.

## Scenario B - Pro Native Backup Plus Independent Backup, No PITR

**Architecture:** Pro daily native backups retained seven days plus complete encrypted independent daily/weekly/monthly logical backups.

- Effective RPO: up to 24 hours for native daily recovery, potentially less only if independent dumps are more frequent and proven.
- Effective RTO: UNKNOWN; <=4 hours is not defensible without restore benchmark and complete configuration/Storage reconstruction.
- Logical-error recovery: daily points may be too coarse; late corruption can use longer independent retention.
- Failure domain: better than provider-only if independent destination and credentials are truly separate.
- Monthly provider floor: approximately USD 25 for Pro with credit-covered Micro, plus independent backup/automation/monitoring/egress/taxes UNKNOWN.
- Savings versus Scenario A provider floor: approximately USD 105/month, USD 1,260/year.
- Risk delta: accepts up to roughly 24 hours of transaction/audit loss rather than a 15-minute target.
- Technical equivalence to PITR: **NO**.

This is the best defensible lower-cost architecture, but it changes the approved recovery objective and therefore requires explicit owner risk acceptance.

## Scenario C - Frequent Independent Logical Backups

Candidate frequencies of 15, 30 and 60 minutes cannot be priced or accepted without measuring database size, dump duration, change rate, CPU/IO impact, overlap, upload time and restore duration.

| Frequency | Nominal schedule loss | Defensible effective RPO | Primary concern |
| --- | ---: | --- | --- |
| 15 min | <=15 min plus dump/upload interval | UNKNOWN | A dump may overlap the next run, load production and still omit service configuration/Storage |
| 30 min | <=30 min plus interval | UNKNOWN | Does not meet <=15 min even nominally |
| 60 min | <=60 min plus interval | UNKNOWN | Material degradation for financial/audit state |

`pg_dump` can provide a database-consistent logical snapshot when correctly executed, but it is not WAL replay. It does not natively offer arbitrary points between dumps, and full-platform recovery still requires roles/configuration, Auth/provider settings, secrets, Storage objects and application validation. A 15-minute schedule is **not presumed equivalent to PITR**. Worker, encrypted storage, egress, monitoring and operator costs are UNKNOWN.

### Schedule Required By Target

For a full snapshot whose recovery point is its transaction start, worst-case RPO is approximately the schedule interval plus the maximum time until the snapshot is durably uploaded. Therefore:

| Target RPO | Candidate schedule | Required maximum dump+encrypt+upload | Current verdict |
| --- | ---: | ---: | --- |
| <=15 min | every 7.5 min or faster | <=7.5 min | Operationally aggressive, unbenchmarked and not defensible for GSBC |
| <=30 min | every 15 min | <=15 min | Possible in principle for a small database, but unproven and high-frequency load |
| <=1 h | every 30 min | <=30 min | Plausible temporary design; must pass benchmark and restore drill |

Any missed run, overlap, retry or upload failure invalidates the target unless alerting and a second valid snapshot remain within the bound. These schedules are design candidates, not achieved service levels.

## Technical Feasibility Of Recovery Mechanisms

### Supabase Native Backups

Pro provides daily managed backups retained for seven days. They offer a complete provider-managed database recovery point, but nominal RPO is up to 24 hours. They do not restore Storage API objects and custom role passwords may require reset. Cost floor is approximately USD 25/month with Micro covered by the organization compute credit. Native daily backup cannot satisfy 15-, 30- or 60-minute RPO.

### Supabase PITR

PITR restores a physical base and replays provider-managed WAL to a selected point within the retained window. It requires a paid plan and at least Small compute. Seven-day PITR gives the lowest currently documented cost path in the existing stack for all three targets, at a provider floor of USD 130/month before independent backup, taxes and operations. Selection granularity does not by itself prove operational RPO; lag/window monitoring and restore testing remain mandatory.

### Customer-Managed External WAL Archive

Supabase documentation exposes logical replication slots but does not document customer access to configure physical `archive_command`, copy provider WAL archive files, run `pg_basebackup`, or build a customer-managed physical WAL archive from the managed primary. Key WAL retention settings such as `wal_keep_size` and `max_slot_wal_keep_size` are described as non-user-facing. The provider uses physical WAL internally for PITR/read replicas; that does not grant the customer an external archive interface.

**Verdict:** customer-managed external physical WAL archiving is **NOT SUPPORTED BY AVAILABLE DOCUMENTATION** and cannot be costed or treated as a PITR substitute. Logical decoding is not a physical WAL archive.

### Logical Replication To External PostgreSQL

Supabase officially supports publications/replication slots and an external PostgreSQL subscriber over a direct connection. It also recommends XL or larger for manual replication tooling and may require paid IPv4. Current Supabase XL compute is about USD 210/month; with Pro and one USD 10 credit, the source alone is roughly USD 225/month before the destination, IPv4, storage, monitoring and backups.

Logical replication can provide low replication lag, but it normally propagates accidental updates/deletes and logical corruption. It does not preserve arbitrary historical points, all DDL/roles/extensions/sequences/large objects/provider settings/Storage are not automatically equivalent, and slot loss/WAL growth require operations. To become a recovery system, the destination needs its own point-in-time history or delayed/versioned backup and a tested promotion process.

**Verdict:** supported for data movement/read models, **not equivalent to PITR**, operationally more expensive than seven-day Supabase PITR under current guidance, and not recommended as the low-cost recovery mechanism.

### Supabase Read Replica

Managed read replicas require Pro, Small or larger compute, PostgreSQL 15+ and physical backups; they inherit the primary compute size. A Small primary plus one Small replica would have a provider floor near USD 45/month after one USD 10 compute credit, excluding other usage. However, the replica follows the primary, is positioned for read scaling/latency, and must be removed for restoration operations. It does not provide a historical point before logical corruption and remains within Supabase's control plane.

**Verdict:** useful for availability/read scale, not an independent backup or a PITR replacement.

### Supabase Pipelines

Pipelines is public alpha and the documented managed destination is BigQuery. It is CDC for analytics/integration, not a complete PostgreSQL recovery target. `TRUNCATE`/resets can propagate. It is excluded from the recovery shortlist.

### Independent Object Storage

Object storage is suitable for encrypted logical artifacts, manifests and restore evidence. Cloudflare R2 publishes 10 GB-month of Standard storage and one million Class A writes per month free, then USD 0.015/GB-month, with no egress fee. Backblaze B2 publishes USD 6.95/TB-month, first 10 GB free and egress up to three times average storage free. Security/region/account suitability still requires owner review.

For a policy retaining 96 half-hourly snapshots (48 hours), 14 daily, 8 weekly and 12 monthly full dumps, approximate stored volume is `130 x D` GB where `D` is compressed dump size in GB. Illustrative R2 storage cost after the 10 GB free tier is:

| Compressed dump D | Approx. retained | Approx. R2 storage/month |
| ---: | ---: | ---: |
| 0.1 GB | 13 GB | USD 0.05 |
| 1 GB | 130 GB | USD 1.80 |
| 5 GB | 650 GB | USD 9.60 |

These are ESTIMATES based on full dumps and current list prices, excluding execution, encryption/key management, source egress, operations and taxes. Actual database/dump size is UNKNOWN.

### Managed PostgreSQL Alternatives

Neon Launch documents usage-based compute at USD 0.14/CU-hour, storage at USD 0.35/GB-month and seven-day instant-restore history priced by retained changes (USD 0.20/GB-month in its current pricing explanation). This can make database-only PITR inexpensive for a small/quiet workload. AWS RDS also provides automated backups/PITR with instance, storage and transfer billing.

Neither is economically comparable to GSBC end-to-end from current evidence. Supabase also supplies Auth, Storage, APIs, Realtime, extensions/configuration and current RLS integration. Migration, dual run, connection/network changes, service replacement and regression testing are unpriced. Neon/RDS usage volumes are unknown, and no target architecture has been validated. They remain candidates for a separate platform TCO study, not low-cost recovery substitutions in this phase.

## Scenario D - Alternative Managed PostgreSQL/Recovery Architecture

No concrete lower-cost equivalent can be recommended from current evidence. Moving the operational database away from Supabase would require migration of Postgres plus analysis/replacement of Auth, Storage, Realtime, APIs, secrets, extensions, RLS behavior and operational tooling. Dual-provider or self-managed WAL archiving can meet short RPO in principle, but adds migration risk, on-call burden and a new restore architecture.

```text
RPO: potentially <=15 min, but UNKNOWN for an unselected design
RTO: UNKNOWN
TCO: UNKNOWN
Migration cost/risk: HIGH/UNKNOWN
Recommendation: do not initiate provider reassessment solely to avoid USD 100/month PITR without a broader platform TCO case
```

Scenario D remains an architectural study, not a costed alternative.

## Scenario E - Deferred PITR

Two temporary states must not be conflated:

1. **Remain Free with current JSON export:** effective RPO/RTO UNKNOWN because production execution continuity, completeness and restore are unproven. This is not an acceptable financial-production protection level.
2. **Upgrade to Pro without PITR:** daily native backup allows a nominal RPO up to 24 hours. Adding complete encrypted logical snapshots every 30 minutes creates a candidate <=1-hour RPO, but only after dump-duration/coverage benchmarks, monitoring and an isolated restore PASS. Effective RTO remains UNKNOWN until that drill.

Deferral is defensible only for a tightly controlled pre-revenue pilot with no live payment collection, no authoritative financial reconciliation, no irreplaceable legal/delivery evidence, synthetic or deliberately disposable data, named expiry and a release control that blocks live financial operation.

Mandatory trigger: **before any live financial operation or storage of irreconstructible customer/audit/legal evidence**, implement the approved protection and pass an isolated restore drill. Calendar backstop proposal: 30 days after explicit deferral acceptance, whichever comes first. The 30-day value is a governance proposal, not a provider limitation or legal rule.

## Truth Table

| Architecture | Achievable RPO | Achievable RTO | PITR | Independent Copy | Logical Error Recovery | Evidence |
| --- | ---: | ---: | --- | --- | --- | --- |
| A. Balanced + PITR 7d | <=15 min target | <=4 h target | yes | yes | selected point within 7d; older via independent copies | DEFENSIBLE ESTIMATE; NOT VERIFIED |
| B. Pro daily + independent | <=24 h nominal | UNKNOWN | no | yes | daily/retained points only | DEFENSIBLE ESTIMATE for RPO; RTO UNKNOWN |
| C. Logical every 15 min | UNKNOWN | UNKNOWN | no | yes | discrete completed dumps only | NOT ACHIEVABLE/UNPROVEN for approved objectives |
| D. Alternative managed design | UNKNOWN | UNKNOWN | design-dependent | design-dependent | design-dependent | UNKNOWN |
| E1. Free + current JSON | UNKNOWN | UNKNOWN | no | no | incomplete daily artifact | NOT ACHIEVABLE |
| E2. Pro + logical every 30 min | <=1 h candidate | UNKNOWN, target <=4-8 h only after drill | no | yes | discrete snapshots; up to retention cadence | DEFENSIBLE ESTIMATE only after benchmark/drill |

No architecture in this table is VERIFIED because no complete isolated restore has been executed.

## Annualization

### Provider Floors, Excluding Unknowns And Taxes

| Horizon | Pro/Micro baseline | Balanced/PITR 7d | Incremental recovery over Pro/Micro |
| --- | ---: | ---: | ---: |
| 12 months | USD 300 | USD 1,560 | USD 1,260 |
| 24 months | USD 600 | USD 3,120 | USD 2,520 |
| 36 months | USD 900 | USD 4,680 | USD 3,780 |

These totals assume unchanged list prices, continuous service, one available USD 10 organization compute credit and Small compute. They exclude taxes, disk/IOPS overage, independent storage, egress, worker, monitoring, drills and staff time.

### PITR Retention Sensitivity

| Retention | PITR monthly | Provider floor with Pro/Small/credit | Annual provider floor |
| --- | ---: | ---: | ---: |
| 7 days | USD 100 | USD 130 | USD 1,560 |
| 14 days | USD 200 | USD 230 | USD 2,760 |
| 28 days | USD 400 | USD 430 | USD 5,160 |

Fourteen days adds USD 1,200/year over seven-day PITR; 28 days adds USD 3,600/year. Longer PITR improves late detection within provider recovery but does not replace an independent failure-domain copy.

## Sensitivity And Unknowns

- Database growth increases logical dump duration, object storage, restore time and possibly compute/disk requirements.
- Higher dump frequency increases CPU/IO, worker runs, egress and overlapping-failure risk.
- Longer independent retention and immutability increase storage but protect against late corruption/deletion.
- Cross-region/provider backup adds egress and data-governance review.
- Quarterly drills provide more current evidence but incur roughly twice the target/runtime cost of semiannual drills and more operator time.
- Source project disk/compute attributes determine clone cost and restore duration.
- PITR 14 days may reduce late-corruption exposure but costs USD 100/month more than seven days.
- Taxes and exchange-rate exposure remain UNKNOWN and must be included in the owner's cash-budget decision.

## Risk Versus Economy

| Scenario | Cost | Data-loss exposure | Downtime | Complexity | Restore confidence | Provider dependence/security |
| --- | --- | --- | --- | --- | --- | --- |
| A Balanced/PITR | Highest known viable provider floor | Target <=15 min | Target <=4 h, unverified | Moderate | Highest after drills | PITR provider-coupled; independent copy offsets |
| B Pro daily + independent | Saves ~USD 105/month | Up to 24 h | UNKNOWN | Moderate | Moderate after both restore paths tested | Independent copy improves common-mode risk |
| C frequent dumps | UNKNOWN; not necessarily cheaper operationally | UNKNOWN/discrete | UNKNOWN | High custom automation | Low until benchmark/drill | Better destination independence, weaker granularity |
| D alternative provider | UNKNOWN | Design-dependent | UNKNOWN | Very high migration/operations | None yet | May diversify or merely move dependence |
| E Free/current JSON | Lowest | UNKNOWN and incomplete | UNKNOWN | Apparently low, incident burden high | Very low | Same-project common mode |

The economy of B is explicit: about USD 1,260/year before independent components. The risk purchased with that saving is also explicit: degradation from a 15-minute target to as much as one day of loss, plus coarser logical-error recovery.

## Stage Strategy

### Pre-Revenue / Controlled Pilot

A temporary **Pro + independent encrypted logical backup every 30 minutes** state can be considered only if all of the following are enforced:

- no live payment collection, receivable settlement or authoritative reconciliation;
- no irreplaceable customer, legal, delivery or audit evidence;
- data is synthetic/disposable or independently reconstructible;
- daily native backup and complete half-hourly independent backup are actually configured;
- benchmark proves dump+encrypt+upload <=30 minutes with no overlap at peak load;
- backup coverage includes schema, data and roles plus separate Auth/Storage/provider-configuration recovery procedures;
- monitoring blocks the pilot when the latest valid independent recovery point exceeds 60 minutes;
- an isolated restore passes before this target is relied upon;
- pilot has an owner, expiry and release gate;
- recovery limitation is visible in the risk register.

Remaining Free with only the current JSON export is not recommended even for a meaningful customer pilot.

### Live Financial Operations

Before live financial operation, require Scenario A implementation, observed PITR window, independent backup, alert ownership and a successful isolated restore drill. This is an objective technical gate, not a calendar aspiration.

## Restore Drill Cost

Supabase documents that restore-to-new-project creates a billable project mirroring source compute/disk and displays costs before execution. With Small compute priced around USD 0.0206/hour:

| Target lifetime | Small compute only | Classification |
| --- | ---: | --- |
| 24 hours | about USD 0.50 | ESTIMATED |
| 72 hours | about USD 1.48 | ESTIMATED |
| 7 days | about USD 3.46 | ESTIMATED |

This is not the all-in drill price. Disk/IOPS, egress, PITR source, object restoration, logs, taxes and staff time are UNKNOWN. A prudent authorization should cap target lifetime and require the dashboard quote immediately before creation. Plausible direct provider spend may be low for a short small target, but no fixed amount is asserted without source attributes.

## Comparable Owner Decision

| Option | Monthly recurring | Annual | RPO | RTO | Risk delta | One-off/periodic | Reversibility |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| A. Balanced + PITR 7d | USD 130 floor + unknowns/tax | USD 1,560 floor + unknowns/tax | <=15 min target | <=4 h target | Baseline recommendation; still requires proof | Restore drill target/effort UNKNOWN | PITR can be disabled; lost coverage cannot be recreated |
| B. Pro daily + independent | USD 25 floor + independent unknowns/tax | USD 300 floor + unknowns/tax | <=24 h nominal | UNKNOWN | Saves ~USD 105/month; accepts up to one-day loss | Two restore paths need drills | PITR can be added later; prior fine-grained history unavailable |
| C. Temporary 1 h candidate | USD 25 provider floor + backup execution/storage/monitoring/tax | USD 300 floor + unknowns/tax | <=1 h only after benchmark/restore PASS | UNKNOWN; measure in drill | Saves ~USD 105/month; discrete points and custom pipeline risk | Benchmark plus both restore paths | PITR can be added later; prior fine-grained history unavailable |
| D. Other architecture | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Migration/platform risk not costed | Migration and dual-run UNKNOWN | Potentially difficult |

## Technical Recommendation

### A) RPO <=15 Minutes

**Recommend Supabase Pro + Small + PITR 7 days + independent encrypted backup.** Provider floor: USD 130/month, USD 1,560/year, plus independent storage/automation/taxes. Frequent dumps cannot currently guarantee the target; logical replication and read replicas propagate corruption and need their own history.

### B) RPO <=30 Minutes

**Recommend the same Supabase PITR architecture.** It has the same documented fixed PITR price as the 15-minute target and materially lower operational risk than 15-minute logical dumps. A dump every 15 minutes is only a future benchmark candidate, not a defensible production commitment.

### C) RPO <=1 Hour

**For the current controlled pre-revenue phase, recommend a temporary modified Balanced architecture:** Pro native daily backups plus complete encrypted logical backups started every 30 minutes to independent object storage, monitored and restore-tested. Provider floor is USD 25/month plus backup execution/storage/monitoring/taxes. R2 storage may be near zero for a small database, but execution and completeness remain UNKNOWN.

This C architecture earns an RPO <=1 hour only after all benchmark and restore conditions pass. Before that, its effective RPO/RTO are UNKNOWN. PITR 7 days becomes a mandatory gate before live or scaled financial operations, authoritative reconciliation, or irreplaceable legal/delivery/audit evidence.

### Best Fit For Current GSBC Phase

**C - temporary <=1-hour candidate** has the best prospective cost/security/complexity ratio for a genuinely controlled pre-revenue phase because it can reduce the provider floor from USD 130 to USD 25/month while adding an independent failure domain. The saving is approximately USD 105/month before custom backup costs.

This recommendation is conditional, not a readiness claim. If the benchmark cannot keep a complete encrypted recovery point under 60 minutes, if full Auth/configuration/Storage recovery is not covered, or if the restore drill fails, select PITR immediately rather than weakening the gate.

Reasons:

- PITR is the lowest-cost architecture in current evidence with a defensible path to RPO <=15 or <=30 minutes.
- The temporary half-hourly logical design is the lowest-cost candidate for <=1 hour, subject to proof.
- Scenario B's USD 105/month saving changes RPO to up to 24 hours and is not equivalent.
- Frequent `pg_dump` is unbenchmarked custom infrastructure and cannot be presumed cheaper or reliable.
- Provider migration has unknown TCO and disproportionate near-term risk.
- The 7-day tier limits recurring PITR cost; independent longer retention addresses older/common-mode recovery.

What remains unknown must be priced before purchase: taxes, current invoice/credit allocation, independent destination, dump size/frequency, worker, monitoring, egress and drill source attributes.

## Owner Decision Required

Choose one:

```text
OPTION A - BALANCED + PITR 7D
Provider floor: USD 130/month, USD 1,560/year + unknowns/taxes
RPO/RTO: <=15 min / <=4 h targets, subject to drill
[TECHNICAL RECOMMENDATION]

OPTION B - PRO NATIVE DAILY + INDEPENDENT BACKUP
Provider floor: USD 25/month, USD 300/year + unknowns/taxes
RPO/RTO: <=24 h nominal / UNKNOWN
Explicitly accepts degradation; not PITR-equivalent

OPTION C - TEMPORARILY DEFER PITR
Use Pro daily + complete encrypted logical backup every 30 min
Provider floor: USD 25/month + execution/storage/monitoring/taxes
RPO <=1 h only after benchmark and restore PASS; RTO remains measured by drill
Allowed only under controlled pre-revenue constraints and expiry
Must block live financial operation until protection and drill pass

OPTION D - REASSESS PROVIDER/ARCHITECTURE
Cost/RPO/RTO: UNKNOWN
Requires separate migration/TCO study
```

Owner selection authorizes neither billing nor implementation. Any upgrade, PITR enablement, backup destination or drill requires its own controlled execution authorization.

## Gate

```text
RF-03A.2B.1A: COST DECISION READY
RECOVERY READY: NO
RF-03A.2B: NO-GO
RF-03B: BLOCKED
INFRASTRUCTURE CHANGES: NONE
BILLING CHANGES: NONE
```
