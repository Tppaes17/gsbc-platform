# Deployment Flow - Current State

Observed on 2026-09-17. No configuration was changed during this audit.

## Chain

```text
local commit
  -> direct push to unprotected main is possible
  -> Vercel Git integration receives commit
  -> production build is created automatically
  -> READY deployment receives production aliases automatically
  -> gsbc-platform.vercel.app serves the new commit
```

## Repository And GitHub

- Repository: `Tppaes17/gsbc-platform`, public.
- Default branch: `main`.
- `main` protection: absent (`protected=false`).
- Required status checks: off/empty.
- Repository rulesets visible through the public API: none.
- Recent commits on `main`: one-parent, unsigned commits by the owner; no PR association appears in the Vercel Git metadata for the audited deployment.
- Versioned GitHub Actions workflows: none.
- GitHub Apps/webhooks beyond the proven Vercel integration: unknown without authenticated repository-administration access.

## Vercel

- Team: `GSBC` (`gsbc`).
- Project: `gsbc-platform` (`prj_UBtDKkjpJy5B6SLfxBe29w2RGoHI`).
- Connected repository: `Tppaes17/gsbc-platform`.
- Production branch: `main`.
- `autoAssignCustomDomains`: true.
- Git comments: enabled for commits and pull requests.
- Production domain: `gsbc-platform.vercel.app`.
- Additional aliases: `gsbc-platform-gsbc.vercel.app`, `gsbc-platform-git-main-gsbc.vercel.app`.
- Custom user domain: none observed.
- Public production health at audit: HTTP 200.

## Causality Evidence

| Git SHA | Commit scope | Vercel deployment | Source/target | Created/ready UTC | Production aliases assigned |
| --- | --- | --- | --- | --- | --- |
| `a10b7f93f0754e8a0624c87fe8579991044929a1` | documentation/ADRs only | `dpl_25Ki8EhtFydhZMck2cvQbiDj5gRV` | git / production | 16:39:00 / 16:39:31 | yes |
| `0fec3737582ea87ba16ace4f35507d0e6ee96b93` | RF probe/tooling | `dpl_CBe2JQ9kEYzB7KQpXUQU5o7ReS1A` | git / production | 15:58:24 / 15:58:57 | historical production deployment |
| `1bac472405157ec2e74250c1ab14619275fcf8f3` | documentation only | `dpl_GRTz18tX8QetDpjG3iRbhUjTXPVu` | git / production | 13:10:01 / 13:10:34 | historical production deployment |

The latest deployment detail reports `gitSource.ref=main`, the exact commit SHA, `prId=null`, `target=production`, `aliasAssigned=true`, and the three production aliases. This confirms both push-to-main auto-production and docs-only production promotion.

## Environments

Only six project variables were observed, all scoped exclusively to `production`: Supabase URL/anon key, Supabase service role, application URL, cron secret and mock-provider webhook secret. Values were not read or printed.

No Preview-scoped environment variables were observed. Therefore Preview does not receive the configured production service role or cron/payment secret. This is a positive isolation control, but Preview operability and non-production backend isolation remain untested.

## Migrations

No GitHub workflow or Vercel build command applying Supabase migrations was found. Application deployment and database migration are operationally separate today, but the separation is procedural rather than enforced by a protected release workflow.

