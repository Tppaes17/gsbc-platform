# Restore Verification Report

Date: 2026-09-18  
Source: local Supabase development database  
Target: disposable database in local Supabase container  
Encrypted copy location: existing OneDrive File Provider directory

## Result

Database restore and validation: **PASS**. Full platform restore: **PARTIAL**.

| Validation | Result |
| --- | ---: |
| Public tables / RLS tables | 56 / 56 |
| Estimated application/RF rows | 95 |
| RLS policies | 140 |
| Constraints | 418 |
| Indexes | 216 |
| Functions | 52 |
| Triggers | 48 |
| Extensions | 4 |
| Application grants | 1,163 |
| Auth users | 2 |
| Storage metadata rows | 2 |
| Migration records | 46 |
| Tenant-visible own tenants | 1 |
| Tenant-visible foreign tenants | 0 |
| PostgreSQL restore | 2,149 ms |
| Full restore/validation | 3,308 ms |

The target used no production URL, secret, email, PSP, webhook or Storage destination. It was dropped after validation.

## Limitations

- Auth rows are restored; providers, redirects, SMTP, signing/API keys and platform config remain manual.
- Storage metadata is restored; physical object bytes are not protected.
- Managed Supabase schemas/extensions/default ACLs are reconstructed by platform baseline, not replayed wholesale.
- No application E2E smoke ran against a separately bootstrapped full Supabase project.
- Small local data cannot establish production restore duration.

Therefore RTO <=24 hours is **PARTIAL**, not proven end-to-end.

The successful recovery point was completed at `2026-09-18T10:09:45.230Z`; isolated validation completed at `2026-09-18T10:09:48.542Z`. The ephemeral test key was not persisted, so this point is execution evidence rather than an operationally retained recovery point.
