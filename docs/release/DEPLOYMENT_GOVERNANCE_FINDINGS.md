# Deployment Governance Findings

Observed on 2026-09-17. Phase 1 was read-only with respect to GitHub and Vercel configuration.

## P1-REL-001 - Push To Main Releases Production Without Explicit Approval

**Severity:** P1  
**Status:** Open

The Vercel Git integration tracks `main` as the Production Branch and has automatic production-domain assignment enabled. Deployment `dpl_25Ki8EhtFydhZMck2cvQbiDj5gRV` was created from `main` SHA `a10b7f93f0754e8a0624c87fe8579991044929a1`, targeted Production and automatically received production aliases. The deployment metadata has `prId=null`. Versioning therefore acts as release authorization, contrary to GSBC governance.

**Remediation:** Adopt Target Model B: retain `main` as Production Branch, disable automatic production-domain assignment, and require explicit human promotion of a verified candidate.

## P2-REL-002 - Main Has No Enforced Change-Control Gate

**Severity:** P2  
**Status:** Open

GitHub reports `main` as unprotected, with no required checks and no public rulesets. Direct push is possible; force-push/deletion prevention, PR approval and stale-approval dismissal are not enforced.

**Remediation:** Add a ruleset/branch protection after working CI checks exist: PR required, one approval, stale dismissal, required checks, no force push/deletion and restricted documented bypass.

## P2-REL-003 - Documentation-Only Changes Trigger Production Release

**Severity:** P2  
**Status:** Open

SHA `a10b7f9` changed only documentation/ADRs, yet produced and promoted a Production deployment. SHA `1bac472` supplies a second documentation-only example. This adds unnecessary cost/noise and demonstrates that the production alias is moved independently of runtime impact.

**Remediation:** Model B removes release impact. Evaluate a tested ignored-build rule later; do not begin with a broad path rule that could suppress real application inputs.

## P2-REL-004 - Rollback Has Not Been Exercised

**Severity:** P2  
**Status:** Open

Prior deployments, SHAs and Vercel rollback/promotion capability are visible, but no controlled rollback and alias verification was performed. There was no project runbook before this audit.

**Remediation:** Use `ROLLBACK_RUNBOOK.md` and perform an approved exercise after hardening. Keep application and database rollback decisions separate.

## P2-REL-005 - Release Authorization Is Not Bound To The Artifact

**Severity:** P2  
**Status:** Open

No protected deployment environment, manual promotion gate or versioned production workflow records who approved a specific deployment/SHA. A Git push is the effective release event.

**Remediation:** Record release ID, SHA, deployment ID, approver and timestamp at explicit Vercel promotion; consider a protected GitHub environment when workflow maturity warrants Model D.

## P3-REL-006 - Preview Is Credential-Safe But Not Operationally Proven

**Severity:** P3  
**Status:** Open

All six observed Vercel environment variables are Production-only, so configured production Supabase service-role, cron and webhook secrets are not assigned to Preview. However, no isolated Preview backend or end-to-end Preview deployment was verified. Preview isolation is therefore conditional, and mutating Preview routes may be inoperable by design.

**Remediation:** Keep production secrets excluded. Before relying on Preview for full-flow validation, provide isolated non-production services and sandbox/disabled outbound integrations, then test tenant and side-effect boundaries.

## Counts

| Severity | Count |
| --- | ---: |
| P0 | 0 |
| P1 | 1 |
| P2 | 4 |
| P3 | 1 |
