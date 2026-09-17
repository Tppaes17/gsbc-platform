# RF-03A.2B - RF Database Placement Decision

## Decision Status

**Option D recommended; owner approval and provider selection required.** No infrastructure was created.

| Option | Blast radius | Recovery independence | Capacity/scaling | Complexity/cost | Decision |
| --- | --- | --- | --- | --- | --- |
| A. Current PostgreSQL, separate schemas | Unacceptable: RF shares disk, WAL, locks, vacuum, CPU, memory, pool and restore with Auth/financial core | None | Current headroom unknown | Lowest | REJECT for national ingestion |
| B. Dedicated RF PostgreSQL | Good DB isolation; raw source still external | Independent backup/PITR | Independently scalable | Medium | Viable, incomplete without durable raw objects |
| C. Dedicated object storage, canonical in current DB | Raw recoverability improves; canonical load still threatens core | Partial | Shared DB remains limiting | Medium | NOT RECOMMENDED |
| D. Dedicated versioned object storage + dedicated RF PostgreSQL | Best separation of operational core and RF workload | Independent backup/PITR and rebuild path | Independently scalable | Highest | RECOMMENDED, OWNER APPROVAL REQUIRED |

## Evidence

- The operational database contains Auth-adjacent, tenant, collections, payment, reconciliation and audit state.
- RF schemas already exist in that database but are empty; schema separation does not isolate infrastructure.
- Managed backups are not enumerated and PITR is disabled.
- The measured input is 7,758,926,262 compressed bytes, already larger than common entry-tier database allocations before extraction, normalization, indexes, WAL and staging.
- National PostgreSQL size and peak working set remain unbenchmarked.

## Conditions For Acceptance

Owner must approve provider, region, budget, retention, RPO/RTO and operating owner. The selected design must prove production-worker Receita reachability, object versioning, independent backup/PITR, isolated restore, capacity headroom, monitoring and cleanup controls before RF-03B.

