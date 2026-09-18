# Process Deviation — RF Direct Push Without Prior Review

**Date:** 2026-09-18  
**Status:** RECORDED / CONTENT SUBSEQUENTLY REVIEWED AND ACCEPTED

## Event

RF-03B.2B commits were pushed to GitHub without the explicit, scope-specific owner authorization required before push. This was not intentional and must be treated as a process deviation, not as a change to project governance.

The owner subsequently reviewed and accepted the committed content. The existing commits and remote history must therefore remain intact; no revert, history rewrite or force push is authorized.

## Governing Rule Restored

```text
Implementation -> tests -> diff/local commit -> review -> approval -> push
```

Codex or Claude must not push directly to GitHub without explicit and specific owner authorization for that scope. This applies to docs-only changes as well. A simplified docs-only flow may be adopted only through an explicit future owner decision, never by assumption.

For code, database, migrations, RLS, RBAC, security, finance, payments, integrations, infrastructure and RF Data Intelligence, the review gate before push is mandatory.

## Prospective Controls

- Default end state is `NO PUSH — AWAITING REVIEW`.
- Local commits are permitted when requested by the execution artifact or useful for review.
- A prior push authorization does not carry over to a new scope or commit.
- Push requires the owner to identify or approve the exact reviewed scope.
- GitHub/Vercel settings were not changed by this record.
- Existing deployment risk in ADR-REL-001 remains unchanged; operational discipline mitigates but does not technically enforce the gate.

## RF-03B.2B Application

The Zero-Incremental-Cost / Pre-Revenue execution is complete locally and remains governed by ADR-RF-019. National production and procurement remain deferred. Any subsequent RF-03B.3 implementation must finish with local diff/commits and await owner review before push.
