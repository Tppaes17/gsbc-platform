# Deployment Flow - Target State

Status: **PROPOSED - OWNER APPROVAL REQUIRED**.

## Recommended Model: B

Keep `main` as the Vercel Production Branch, but disable automatic assignment of production domains. Vercel may build commits from `main` as staged production candidates; only an explicit human Promote action moves production aliases.

```text
feature branch / PR
  -> CI checks
  -> isolated Preview where configured
  -> review and approval
  -> merge to protected main
  -> Vercel staged production build (no production alias)
  -> candidate verification
  -> explicit owner promotion
  -> production alias moves
  -> health/log verification and release record
```

This uses Vercel's documented staged-production capability and preserves the exact production build artifact. It requires changing `autoAssignCustomDomains` from true to false after owner authorization.

## Main Protection Proposal

- Require pull request before merge.
- Require at least one approval; dismiss stale approval after new commits.
- Require successful `typecheck`, `lint`, focused tests and Vercel build/check.
- Block force push and branch deletion.
- Limit bypass to a documented break-glass owner path with audit record.
- Prefer squash or merge commits consistently; signed commits are desirable but not a Phase 2 prerequisite.
- CODEOWNERS for migrations, payments/security and release configuration is recommended when a second qualified reviewer is available.

## Preview Policy

- Non-production branches may continue generating Preview deployments.
- Never attach production service-role, cron, payment or email secrets to Preview.
- Add dedicated non-production Supabase/environment values only after an isolated backend is approved.
- Keep outbound payment/email/webhook integrations disabled or sandboxed.
- A Preview without safe backend configuration may be UI/build-only and must fail closed for mutating routes.

## Model Comparison

| Model | Human production gate | Complexity | Auditability | Assessment |
| --- | --- | --- | --- | --- |
| A. main auto-production | none beyond push/merge | low | weak | reject |
| B. main staged, manual promotion | explicit Vercel Promote | low-medium | strong deployment/alias record | recommended |
| C. release branch auto-production | release branch push remains authority | medium | medium | viable, but branch push still acts as release |
| D. CI + protected environment | explicit GitHub environment approval | high | strongest and programmable | future option when team/process grows |

## Exact Phase 2 Changes Proposed

1. Capture current project and branch settings.
2. In Vercel Production Environment / Branch Tracking, disable **Auto-assign Custom Production Domains** while retaining `main` as Production Branch.
3. Configure GitHub `main` protection/ruleset with PR, one approval, required checks, no force push/deletion and restricted bypass.
4. Establish required CI checks before making them mandatory; do not create a protection rule that cannot pass.
5. Verify non-main Preview behavior and confirm it has no production credentials.
6. Create a staged `main` candidate and prove the public production alias does not move.
7. Promote only after explicit release approval, then verify production and record metadata.

## Reversibility

Vercel auto-assignment can be re-enabled to restore the previous alias behavior. GitHub rules can be relaxed by an authorized owner. These reversals reduce safety and must themselves be recorded as production-governance changes.

## Docs-Only Changes

Do not add a fragile path-based skip rule in Phase 2 initially. A docs-only commit can affect build inputs, generated metadata or Next.js routes. Under Model B it may create a candidate build but cannot change production without promotion, eliminating the release risk while retaining evidence. Build-cost optimization can be evaluated separately with tested ignore rules.

