# RF-03B.2 RAW Retention Cost Model

Baseline: 7.7589 GB compressed per competence.

| Policy | Baseline bytes | +/-25% range | R2 Standard storage estimate |
| --- | ---: | ---: | ---: |
| RAW-6 | 46.55 GB | 34.92-58.19 GB | ~USD 0.55/month after 10 GB free |
| RAW-12 | 93.11 GB | 69.83-116.38 GB | ~USD 1.25/month after 10 GB free |

R2 Standard is provider-documented at USD 0.015/GB-month with 10 GB-month free and no direct egress fee; request costs are negligible at 37-74 monthly objects but remain provider-billed. This is a cost model, not provider approval or provisioning.

RAW-6 is recommended. RAW-12 adds roughly USD 0.70/month at baseline, but cost is not the sole issue: it doubles governance, compromised-object exposure and QSA retention. Lifecycle, encryption, versioning, immutability and account separation remain required.

Database/worker cost dominates and cannot be quoted defensibly before provider, region, measured Establishments/Simples size and backup tier are selected. A broad architecture envelope of **USD 250-1,500/month** for dedicated managed PostgreSQL, monthly worker, storage, monitoring and recovery is ESTIMATED/LOW-CONFIDENCE, not a budget commitment. Current local work cost USD 0 incremental.

Provider evidence: `https://developers.cloudflare.com/r2/pricing/` (accessed 2026-09-18).
