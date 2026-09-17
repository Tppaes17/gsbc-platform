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

No lower-cost architecture is currently proven to achieve RPO <=15 minutes. Pro native daily backups plus independent backup is the best defensible lower-cost option, but its effective RPO is up to 24 hours and it is **not technically equivalent** to PITR.

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
2. **Upgrade to Pro without PITR:** daily native backup allows a nominal RPO up to 24 hours; effective RTO remains UNKNOWN until drill. Independent backup improves failure domain/retention but not 15-minute granularity.

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

A temporary Pro-without-PITR state can be considered only if all of the following are enforced:

- no live payment collection, receivable settlement or authoritative reconciliation;
- no irreplaceable customer, legal, delivery or audit evidence;
- data is synthetic/disposable or independently reconstructible;
- daily native backup and an independent complete backup are actually configured;
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
| C. Deferred PITR | Free or Pro state selected explicitly | USD 0 or 300 floor + unknowns | Free/current UNKNOWN; Pro <=24 h nominal | UNKNOWN | Temporary high risk; prohibited for live financial operation | Future remediation/drill | Reversible prospectively only |
| D. Other architecture | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Migration/platform risk not costed | Migration and dual-run UNKNOWN | Potentially difficult |

## Technical Recommendation

**Recommendation A - PROCEED WITH BALANCED + PITR 7D**, subject to owner approval of the reconciled budget and a separate controlled implementation phase.

Reasons:

- It is the lowest-cost architecture in current evidence with a defensible path to RPO <=15 minutes.
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
Allowed only under controlled pre-revenue constraints and expiry
Free/current RPO/RTO: UNKNOWN; Pro daily: <=24 h / UNKNOWN
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
