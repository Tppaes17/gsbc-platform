# RF-03B.2 Infrastructure Decision Report

## Recommendation

Select **dedicated RF PostgreSQL + private versioned object storage + container batch worker**. Do not place national RF ingest in the current shared GSBC operational PostgreSQL.

| Option | Decision |
| --- | --- |
| Current GSBC PostgreSQL | Reject for national load: shared disk/WAL/locks/autovacuum/recovery blast radius |
| Dedicated RF PostgreSQL | Recommend, provider pending owner/cost/region decision |
| Other managed PostgreSQL | Eligible if PostgreSQL 17 features, partitioning, extensions, backup/restore and network requirements pass |

RAW belongs in encrypted S3-compatible object storage with versioning/lifecycle, not worker disk. Worker disk is scratch only. Keep operational GSBC tenant data/RLS separate from global RF public data.

Open P1 decisions before RF-03B.3:

1. Capacity remains low-confidence until Establishments and Simples bounded benchmarks.
2. Provider/region/budget and production Receita reachability are unapproved/unproven.

No infrastructure was provisioned. Cost envelope is USD 250-1,500/month ESTIMATED/LOW-CONFIDENCE, dominated by dedicated DB/storage/recovery. Owner must approve provider and a measured capacity tier.
