# RF-03A.2B - Recovery Test Register

| Test ID | Date | Scenario/source | Isolated target | Result | Duration | Validation | RPO/RTO conclusion | Finding | Owner | Next due |
| --- | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- |
| RT-001 | 2026-09-17 | Local logical JSON backup route | Local Supabase; temporary table; rollback | PASS, LIMITED | 16.0 s suite / 9.4 s test | Seven critical table arrays present and parseable | No production RPO/RTO inference | Does not restore schema, data, Auth, RLS, grants, functions, triggers or indexes | Engineering | After backup format changes |
| RT-002 | 2026-09-17 | Supabase physical backup inventory | Read-only Management API | PASS as audit; recovery absent | 19.6 s | `backups=null`, `pitr_enabled=false`, `walg_enabled=true` | No provider recovery point available | P0-RCV-001 | Owner/SRE | After plan/protection decision |
| RT-003 | 2026-09-17 | Production backup to isolated restore target | Not created | NOT EXECUTED | N/A | Paid physical clone/restore unavailable in current observed state | RTO unknown | P0-RCV-001 | Owner/SRE | Required before RF-03B |
| RT-004 | 2026-09-17 | PITR recovery to selected point | Not created | NOT EXECUTED | N/A | PITR disabled | Critical RPO not achievable | P1-RCV-002 | Owner/SRE | Required before RF-03B |
| RT-005 | 2026-09-17 | RF active-version rollback and rebuild | No national dataset/target | NOT EXECUTED | N/A | Architecture only | RF RTO unknown | P1-RCV-004 | RF owner | After isolated RF infrastructure exists |
| RT-006 | 2026-09-17 | Official source double discovery | Metadata-only VPN execution | PASS | 24.6 s | 37 ZIPs; 7,758,926,262 bytes; equal hashes | Source discovery only | Production worker reachability remains open | RF owner | From production worker before RF-03B |

No test used production writes, a production restore, production data export, or paid infrastructure.

