# Restore Test Report

Date: 2026-09-17  
Mode: local/disposable Supabase database

## Measured Result

| Metric | Result |
| --- | ---: |
| Source database | 17,796,243 bytes |
| Custom dump | 823,235 bytes |
| Encrypted bundle | 853,028 bytes |
| Dump phase | 787 ms |
| Full backup pipeline | 1,241 ms |
| Decrypt | 2 ms |
| PostgreSQL restore | 1,250 ms |
| Full restore pipeline | 1,769 ms |

Validation after isolated restore:

```text
public tables: 56
RLS-enabled public tables: 56
public functions: 52
Auth users: 2
Storage metadata rows: 2
application grants: 1,163
migration records: 46
```

External side-effect isolation: PASS for the local environment; no production endpoints or credentials were used.

## Interpretation

Database restore: **PASS for the local POC dataset**. RLS/application grants: PASS. Auth database records: PASS, full Auth recovery PARTIAL. Storage metadata: PASS, physical object recovery FAIL/not tested. Full platform reconstruction and application readiness were not executed.

The source is only about 17.8 MB and cannot predict production duration, DB load or growth behavior. The measured 1.8-second local restore is not a production RTO. Target RTO <=4 hours is **PARTIAL / NOT PROVEN end-to-end**.

## Restore Failures Discovered And Corrected

1. Full dump attempted to recreate managed `realtime` function settings and failed on reserved privileges. Managed schemas were explicitly classified/reconstructed separately.
2. `supabase_vault` and extension/default ACLs owned by managed roles failed in a blank DB. Vault was classified as platform-managed; GSBC object ACLs were replayed separately and validated.

These are material platform-recovery dependencies, not cosmetic test fixes.
