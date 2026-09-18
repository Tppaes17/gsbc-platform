# Recovery Coverage Matrix

| Asset | Recovery source | Current state | Production-onboarding requirement |
| --- | --- | --- | --- |
| Public/RF schemas, data, sequences, constraints, indexes, views, functions, triggers, RLS | RECOVER FROM BACKUP | PROTECTED in local POC | Repeat against authorized production recovery point |
| Application grants | RECOVER FROM BACKUP | PROTECTED/tested | Validate effective grants and service role |
| Migrations, policies, application code, recovery scripts/runbooks | RECOVER FROM GIT | PROTECTED/versioned | Protected release/governance and clean rebuild test |
| Roles inventory | RECOVER FROM BACKUP + PLATFORM | PARTIAL | Replay custom roles; platform recreates managed roles |
| Auth users | RECOVER FROM BACKUP | PROTECTED in DB test | Full isolated Auth login/reset test |
| Auth providers/redirects/SMTP/API/JWT config | RECOVER FROM PLATFORM CONFIG | MANUAL | Versioned non-secret inventory and secret recovery drill |
| Storage metadata | RECOVER FROM BACKUP | PROTECTED in DB test | Validate buckets/policies |
| Storage object bytes | Separate object recovery | NOT PROTECTED | Mandatory independent object backup/versioning and restore |
| Managed schemas/extensions/default ACLs | RECOVER FROM PLATFORM CONFIG + migrations | PARTIAL | Full clean-project bootstrap test |
| Vercel env, PSP, mail/webhook secrets | MANUAL RECONSTRUCTION from secret systems | MANUAL | Independent secret inventory/rotation; never Git |
| RF public source data | Official source + manifests + deterministic transforms | RECONSTRUCTIBLE where source retained | Preserve manifest/provenance/loader; isolated capacity required |
| GSBC tenant/financial/legal/audit state | PITR/backup plus reconciliation | NOT PRODUCTION-READY | PITR/equivalent, independent copy and full restore gate |

No secret value is versioned. `.env.example` is a template, not a recovery source for secrets.
