# POC Findings Register

| ID | Severity | Finding | Evidence | Blocks candidate? | Remediation |
| --- | --- | --- | --- | --- | --- |
| P1-POC-001 | P1 | Independent durable failure domain not tested | Copy stayed under `/tmp` on same host | YES | Authorized external encrypted/versioned destination and verified round trip |
| P1-POC-002 | P1 | Storage physical objects are not protected/restored | Only `storage` metadata restored | YES | Separate object export/versioning plus restore validation |
| P1-POC-003 | P1 | Full platform/Auth/config reconstruction incomplete | Auth rows pass; providers, redirects, SMTP, keys, managed schemas/config are manual | YES | Versioned config inventory, secret recovery and full-platform drill |
| P1-POC-004 | P1 | RPO/scheduler/scale not proven | One small local run; no 30-minute scheduler or load benchmark | YES | Non-production repeated benchmark, monitoring and growth test |
| P2-POC-005 | P2 | Managed schema/ACL dump is not directly portable | `realtime`, Vault and managed default ACL restore failures | NO if platform baseline is reconstructed and tested | Codify platform bootstrap and validate effective grants |
| P2-POC-006 | P2 | Key durability/rotation not tested | Ephemeral environment key only | YES for production | Independent secret manager and break-glass recovery drill |
| P3-POC-007 | P3 | Retention logic is tested but not integrated with immutable lifecycle | Unit test only | NO | Implement only in separately authorized phase |

Counts: P0=0, P1=4, P2=2, P3=1.

No P0 exists because the POC did not claim or alter production recovery. Four blocking P1s prevent `PASS — CANDIDATE FOR CONTROLLED PRODUCTION IMPLEMENTATION`.
