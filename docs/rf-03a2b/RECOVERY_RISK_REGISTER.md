# RF-03A.2B - Recovery Risk Register

| ID | Severity | Finding/evidence | Impact | Required remediation | Owner/status |
| --- | --- | --- | --- | --- | --- |
| P0-RCV-001 | P0 | Management API returned `backups=null`, PITR disabled, and no isolated production restore exists | Critical operational data has no proven recoverable point | Approve managed protection, then restore a real backup to an isolated target and validate full database/app invariants | Owner/SRE - OPEN |
| P1-RCV-002 | P1 | Proposed critical RPO is <=15m; PITR is disabled | Daily or unobserved JSON export cannot satisfy financial/audit RPO | Owner approves RPO and PITR/equivalent protection; verify recovery window | Owner - OPEN/BLOCKING |
| P1-RCV-003 | P1 | Logical backup is separate PostgREST reads, public-schema-only, same provider bucket, 14-day deletion | Inconsistent point, missing schemas/DDL/RLS/grants/functions/triggers/storage objects; account/project loss can remove primary and backup | Replace as primary recovery mechanism; retain only as supplemental export; add independent encrypted copy | SRE - OPEN/BLOCKING |
| P1-RCV-004 | P1 | RF schemas share operational PostgreSQL; national peak is unbenchmarked | Storage/WAL/IOPS/locks/vacuum/pool exhaustion can impact Auth, collections and payments | Approve Option D and benchmark isolated RF infrastructure | Owner/RF - OPEN/BLOCKING |
| P1-RCV-005 | P1 | Production disk allocation, free space, IOPS and peak RF working set are unknown | No defensible headroom or restore-duration estimate | Capacity export plus representative multi-entity benchmark and restore test | Owner/RF - OPEN/BLOCKING |
| P1-RCV-006 | P1 | Production worker network path does not exist; VPN reachability is user-local | Source may be unreachable from future executor | Run metadata probe from selected production worker before RF-03B | RF owner - OPEN/BLOCKING |
| P2-RCV-007 | P2 | No cross-account/cross-region backup or project-deletion survival observed | Provider/account compromise or deletion may remove both data and backups | Decide independent encrypted export/retention/failure domain | Security/Owner - OPEN |
| P2-RCV-008 | P2 | Backup failure event exists, but no demonstrated alert owner/SLA or restore-age alert | Silent backup/restore-readiness degradation | Alert on backup/PITR health, archive lag and last successful restore test | SRE - OPEN |
| P2-RCV-009 | P2 | RF atomic publish, previous-version rollback and rebuild are designed but untested nationally | Defective publish recovery time unknown | Implement and test only after RF infrastructure authorization | RF owner - OPEN |
| P3-RCV-010 | P3 | Current recovery documents and older ADR numbering overlap requested artifact labels | Governance ambiguity | Preserve existing IDs and record explicit mapping in report | Architecture - RESOLVED IN DOCS |

Counts: P0 `1`, P1 `5`, P2 `3`, P3 `1`.

