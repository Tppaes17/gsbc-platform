# ADR-REL-001 - Production Deployment Governance

**Status:** DECLINED BY OWNER - CURRENT STATE RETAINED  
**Date:** 2026-09-17

## Context

The Vercel project tracks `main` as its Production Branch and automatically assigns production domains. GitHub `main` is unprotected. Historical metadata proves that a direct docs-only commit created a Production deployment and moved public aliases without a distinct release approval.

## Proposed Decision

Adopt Model B:

- keep `main` as the Vercel Production Branch;
- disable automatic assignment of custom/production domains;
- treat successful `main` deployments as staged production candidates;
- require an authorized human to promote the exact verified candidate;
- protect `main` with PR approval and working required checks;
- keep production migration authorization separate from application promotion.

## Consequences

Code can be versioned without being released. Vercel retains build provenance and an explicit promotion record. Releases gain one deliberate operational step. A failed or missed promotion delays release rather than changing production implicitly.

Preview deployments remain useful only within their configured environment isolation. Model D, using a protected GitHub deployment environment, remains an evolution path for richer policy automation.

## Reversibility

An authorized owner can restore automatic production-domain assignment or relax GitHub protection. Such changes reduce governance and must be recorded as production changes.

## Current Decision

No setting has been changed. Owner acceptance and a separately authorized Phase 2 are required before implementation.

## Owner Decision (2026-09-17)

Presented with Model B (disable `autoAssignCustomDomains`, then protect `main` once CI checks exist) and the option to authorize only the domain-assignment change, the owner explicitly chose to **keep the current state**: `main` remains the Vercel Production Branch with automatic production-domain assignment enabled, and GitHub `main` remains unprotected. The owner asked that this decision be recorded as their own.

No GitHub or Vercel setting was changed as a result of this ADR. P1-REL-001 and the P2 findings in `docs/release/DEPLOYMENT_GOVERNANCE_FINDINGS.md` remain factually open — this decision accepts that residual risk rather than remediating it. The audit trail (`docs/DEPLOYMENT_GOVERNANCE_HARDENING_REPORT.md`, `docs/release/`) remains valid reference material if the owner revisits this later; Phase 2 is not scheduled.
