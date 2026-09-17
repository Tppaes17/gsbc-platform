# Backup Retention Proposal

Status: proposal only; no lifecycle was installed.

| Tier | Proposed retention | Selection rule |
| --- | --- | --- |
| Half-hourly | 48 hours | Keep every verified point |
| Daily | 14 days | Keep newest valid point per UTC day |
| Weekly | 8 weeks | Keep newest valid point per UTC week |
| Monthly | 12 months | Keep newest valid point per UTC month |

Only points with valid success marker, manifest hash and encrypted-file checksum are eligible. Deletion must never remove the sole verified point needed by an active incident or drill.

The retention selector is unit-tested. Actual lifecycle execution, immutability, legal retention and storage cost remain unimplemented/owner-controlled. Full-dump growth makes the policy unsuitable at scale unless benchmark and incremental/PITR strategy are revisited.
