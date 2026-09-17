# ADR-REL-001 - Production Deployment Governance

**Status:** PROPOSED - OWNER APPROVAL REQUIRED  
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
