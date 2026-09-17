# Deployment Governance Hardening Report

Audit date: 2026-09-17  
Phase: 1, read-only configuration audit  
Decision status: **OWNER APPROVAL REQUIRED**

## 1. Executive Summary

GSBC deployment governance is **UNSAFE**. GitHub `main` is unprotected, Vercel treats it as the Production Branch, and automatic production-domain assignment is enabled. Historical metadata proves that a push to `main`, including a documentation-only commit, creates a Production deployment and moves public aliases without a separate human release action. Production was healthy (HTTP 200) during the audit; no P0 is open, but P1-REL-001 blocks RF-03B.

Target Model B is recommended: Vercel builds `main` as a staged production candidate, but an authorized human explicitly promotes the exact verified deployment. No GitHub/Vercel setting, alias, workflow, secret or environment variable was changed in Phase 1.

## 2. Trigger For Audit

RF-03A.2B observed a deployment shortly after a docs-only push. The audit was opened to determine whether correlation represented automatic release and whether version control was improperly serving as production authorization.

## 3. Scope

The audit covered local Git state, GitHub repository/default branch/protection, Vercel Git linkage, deployment history and SHA correlation, Production domains/aliases, environment scoping, release options, rollback, migration separation and traceability. It did not alter external settings or execute a release/rollback.

## 4. Repository State

- Local branch: `main`.
- Audited HEAD: `a10b7f93f0754e8a0624c87fe8579991044929a1`.
- Remote: `https://github.com/Tppaes17/gsbc-platform.git`.
- Pre-existing untracked RF evidence directories were left untouched.
- Repository: public; default branch `main`.
- No versioned `.github` deployment workflow exists.

## 5. GitHub Integration

Vercel project metadata confirms a GitHub link to `Tppaes17/gsbc-platform`. Public GitHub API evidence and Vercel deployment metadata were used because GitHub CLI/admin-authenticated settings were unavailable. Other installed GitHub Apps or administrative webhooks are **UNKNOWN**; this does not weaken proof of the active Vercel integration.

## 6. Branch Protection

`main` protection is **ABSENT**: GitHub reports `protected=false`; status-check enforcement is off/empty; public rulesets return none. PR requirement, approvals, stale-dismissal, force-push/deletion blocks, admin bypass and merge queue are not configured through a branch/ruleset control. Recent commits are unsigned; signed commits are desirable but not the immediate blocker.

## 7. Vercel Project State

- Team: `GSBC` (`gsbc`).
- Project: `gsbc-platform`, ID `prj_UBtDKkjpJy5B6SLfxBe29w2RGoHI`.
- Git source: GitHub `Tppaes17/gsbc-platform`.
- Production domain auto-assignment: enabled.
- Deploy hooks: none observed.
- Git comments: enabled.
- Node.js: 24; framework: Next.js.

## 8. Production Branch

Vercel `productionBranch` is `main`. Under current settings, a commit received from this branch is built with `target=production`, not merely as a Preview.

## 9. Deployment History

Recent deployments repeatedly show source `git`, ref `main` and target `production`. Relevant examples are:

| Deployment | Git SHA | Commit scope | Result |
| --- | --- | --- | --- |
| `dpl_25Ki8EhtFydhZMck2cvQbiDj5gRV` | `a10b7f9` | docs/ADRs only | READY; production aliases assigned |
| `dpl_CBe2JQ9kEYzB7KQpXUQU5o7ReS1A` | `0fec373` | RF probe/tooling | Production deployment |
| `dpl_GRTz18tX8QetDpjG3iRbhUjTXPVu` | `1bac472` | docs only | Production deployment |

## 10. Git SHA Correlation

Latest deployment metadata gives exact SHA `a10b7f93f0754e8a0624c87fe8579991044929a1`, ref `main`, `prId=null`, `target=production`, `aliasAssigned=true`, creation `2026-09-17T16:39:00.071Z` and ready time `2026-09-17T16:39:31.730Z`. `git show` confirms the commit changed only 12 documentation/ADR files. This proves both automatic Production deployment and docs-only promotion.

## 11. Production Domains/Aliases

- Public production domain: `gsbc-platform.vercel.app` (verified, HTTP 200 during audit).
- Additional production aliases: `gsbc-platform-gsbc.vercel.app` and `gsbc-platform-git-main-gsbc.vercel.app`.
- Deployment-specific URL: `gsbc-platform-7c29qoalj-gsbc.vercel.app` for the latest audited deployment.
- No user custom domain was observed.

A deployment-specific URL existing is not itself a release. The unsafe event is automatic reassignment of production aliases to that deployment.

## 12. Preview Environment

No Preview-scoped project environment variable was observed. Production Supabase service-role, cron and webhook secrets are therefore not assigned to Preview. No representative Preview deployment with an isolated backend was exercised, so Preview isolation is **CONDITIONAL**, not a full pass.

## 13. Production Environment

Six variables were observed, all Production-only: `CRON_SECRET`, `MOCK_PROVIDER_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Values were not read or printed. Only `.env.example` is tracked locally.

## 14. Preview-To-Production Risk

No evidence shows Preview receiving the configured Production service-role or sensitive secrets. This is a positive fail-closed boundary. The residual risk is operational: Preview has no verified isolated data plane, payment/email sandbox or end-to-end guardrail evidence. It must not be represented as a production-like validation environment until those controls are tested.

## 15. Current Deployment Flow

```text
local commit -> possible direct push to unprotected main
-> Vercel Git integration -> automatic Production build
-> automatic alias assignment -> public production changes
```

The detailed map is in `docs/release/DEPLOYMENT_FLOW_CURRENT_STATE.md`.

## 16. Root Cause

The root cause is the interaction of two controls: Vercel tracks `main` as Production and automatically assigns production domains, while GitHub allows direct/unreviewed changes to `main`. The absence of a distinct promote/approval event collapses versioning and release into one operation.

## 17. Findings

- P1-REL-001: push to `main` releases Production without explicit approval.
- P2-REL-002: `main` has no enforced change-control gate.
- P2-REL-003: docs-only changes trigger Production release.
- P2-REL-004: rollback has not been exercised.
- P2-REL-005: release authorization is not bound to the artifact.
- P3-REL-006: Preview is credential-safe but not operationally proven.

Counts: P0=0, P1=1, P2=4, P3=1. Full evidence and remediation are in `docs/release/DEPLOYMENT_GOVERNANCE_FINDINGS.md`.

## 18. Release Model Options

| Model | Gate | Complexity | Decision |
| --- | --- | --- | --- |
| A - main auto-production | push/merge only | low | reject |
| B - staged `main`, manual promotion | explicit Vercel promotion | low-medium | recommend |
| C - dedicated release branch | release-branch push | medium | viable, weaker separation |
| D - CI/CD protected environment | workflow approval | high | future maturity option |

## 19. Recommended Target State

Adopt Model B. Keep `main` as Production Branch, disable automatic production-domain assignment, protect `main`, build candidates without moving the public alias, and require explicit promotion by an authorized owner. Details, preview policy, reversibility and exact proposed changes are in `docs/release/DEPLOYMENT_FLOW_TARGET_STATE.md`.

## 20. Rollback Model

Identify a last-known-good deployment by project, ID and SHA; confirm database compatibility; explicitly roll back/promote it; verify aliases and health; then reconcile external side effects. Capability is **PARTIAL** because the mechanism and targets exist but were not execution-tested. See `docs/release/ROLLBACK_RUNBOOK.md`.

## 21. Migration Governance

Application promotion and production database migration are separate authorizations. No audited workflow automatically applies Supabase migrations during Vercel build. Preserve that separation, use backward-compatible expand/contract sequencing, and require recovery readiness, RLS/grant review and explicit production-migration authorization.

## 22. Owner Decisions Required

1. Approve or reject Target Model B.
2. Approve the proposed `main` protection baseline and identify authorized bypass owners.
3. Designate release approver/operator roles and the release record location.
4. Decide whether/when to fund an isolated non-production backend for full Preview testing.
5. Approve a later controlled rollback exercise.

## 23. Remediation Plan

After owner authorization only: capture settings; disable automatic production-domain assignment; establish passing CI checks; protect `main`; verify Preview does not receive production secrets; prove a `main` candidate cannot move the production alias; explicitly promote one approved candidate; record metadata; execute a later rollback exercise. No docs-only ignore rule is proposed initially.

## 24. Verification Plan

- Non-production change: cannot promote Production implicitly.
- Preview: remains non-production and receives no production credentials.
- Production gate: candidate requires explicit human Promote.
- Alias: public domain moves only after approval.
- Main: direct push and unsafe bypass are blocked.
- Rollback: previous version is identifiable and a controlled exercise validates alias movement.
- Traceability: release ID, SHA, deployment ID, approver, timestamp, URL, migration baseline, health and rollback target are recorded.

## 25. RF-03B Impact

RF-03B remains **BLOCKED** throughout Phase 1 and remediation. It may be reconsidered only after `GO - DEPLOYMENT GOVERNANCE HARDENED` and the independent RF-03A.2B production-recovery gate are both satisfied. It must not start automatically.

## 26. Gate

```text
AUTO-PRODUCTION: CONFIRMED
DEPLOYMENT GOVERNANCE: UNSAFE
RECOMMENDED MODEL: B
OWNER DECISION REQUIRED: YES
CHANGES APPLIED TO GITHUB/VERCEL: NONE
PHASE 2: NOT STARTED
RF-03B: BLOCKED
```
