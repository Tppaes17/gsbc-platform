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
| RLS policies | 140 |
| Functions | 52 |
| Application grants | 1,163 |
| Auth users | 2 |
| Storage metadata rows | 2 |
| Migration records | 46 |
| Tenant-visible own tenants | 1 |
| Tenant-visible foreign tenants | 0 |
| Full restore time | 2,321 ms |

The target used no production URL, secret, email, PSP, webhook or Storage destination. It was dropped after validation.

## Limitations

- Auth rows are restored; providers, redirects, SMTP, signing/API keys and platform config remain manual.
- Storage metadata is restored; physical object bytes are not protected.
- Managed Supabase schemas/extensions/default ACLs are reconstructed by platform baseline, not replayed wholesale.
- No application E2E smoke ran against a separately bootstrapped full Supabase project.
- Small local data cannot establish production restore duration.

Therefore RTO <=24 hours is **PARTIAL**, not proven end-to-end.
