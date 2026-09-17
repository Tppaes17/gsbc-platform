# Backup Coverage Matrix

| Component | Classification | POC evidence / recovery dependency |
| --- | --- | --- |
| `public` schema/data/sequences/indexes/constraints/views/functions/triggers/RLS | BACKED UP BY PG_DUMP | Restored locally; 56 tables with RLS and 52 functions observed |
| `rf_raw`, `rf_canonical` | BACKED UP BY PG_DUMP | Included; current data is empty/small and national scale untested |
| Application object grants | BACKED UP BY PG_DUMP | ACL list filtered/replayed; 1,163 effective public grants validated |
| Default ACLs owned by `supabase_admin` | MANUAL RECOVERY REQUIRED | Managed-role ACL replay is forbidden; migrations/platform baseline must reconstruct |
| Roles | BACKED UP SEPARATELY | `pg_dumpall --roles-only` included, but not replayed because managed roles already exist locally |
| Extensions `pgcrypto`, `uuid-ossp` | BACKED UP BY PG_DUMP | Restored in disposable DB |
| Managed schemas/extensions (`realtime`, `vault`, GraphQL, `net`, functions) | RECONSTRUCTIBLE FROM PLATFORM/IAC | Explicitly excluded after privileged restore failures |
| `auth.users` and Auth DB records | BACKED UP BY PG_DUMP | Two users restored and counted |
| Auth providers, redirects, SMTP, API/JWT keys | MANUAL RECOVERY REQUIRED | Not database-complete; config inventory/reapply required |
| Storage metadata (`storage.objects`, buckets) | BACKED UP BY PG_DUMP | Two metadata rows restored |
| Storage object bytes | NOT YET PROTECTED | Database backup does not contain physical objects |
| Migration state | BACKED UP BY PG_DUMP | 46 migration records restored |
| DB jobs in excluded managed schemas | MANUAL RECOVERY REQUIRED | Must inventory/recreate with outbound actions disabled |
| Vercel environment variables | MANUAL RECOVERY REQUIRED | Values intentionally not exported |
| Edge Functions/deploy artifacts | RECONSTRUCTIBLE FROM GIT/IAC | Runtime settings/secrets require separate recovery |
| PSP, email, webhook credentials/config | MANUAL RECOVERY REQUIRED | Secret manager/provider inventory required; values not logged |

Critical coverage is **CONDITIONAL/FAIL for production recovery** because Storage bytes and full platform configuration are not protected/restored. No critical UNKNOWN is silently treated as covered.
