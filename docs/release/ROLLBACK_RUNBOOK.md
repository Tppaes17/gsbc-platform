# Production Rollback Runbook

Status: **DOCUMENTED, NOT EXECUTION-TESTED**.

## Trigger And Authority

Use this runbook when a production release causes material errors, security exposure, tenant-isolation risk, financial inconsistency or loss of a critical workflow. The release owner declares rollback; database recovery requires separate production-migration authorization.

## Before Acting

1. Record incident/release ID, current production deployment ID, Git SHA, aliases, observed failure and decision owner.
2. Freeze additional promotions and identify the last known healthy Vercel deployment by deployment ID and Git SHA.
3. Confirm whether the failed release included a database migration, environment change or external-provider change.
4. Determine compatibility of the previous application with the current database schema. If incompatible, stop and use the database recovery/forward-fix plan.

## Application Rollback

1. In Vercel, inspect the selected prior deployment and verify project, environment, Git SHA, creation time and READY state.
2. Use Vercel's Rollback action, or promote the verified prior deployment to Production, according to the current console capability.
3. Confirm that `gsbc-platform.vercel.app` and all production aliases point to the intended deployment.
4. Record operator, timestamp, source deployment, target deployment and alias result.

No rollback was executed during the read-only audit. CLI equivalents such as `vercel rollback` or `vercel promote` must be confirmed against the installed CLI and approved before use.

## Post-Rollback Validation

- Confirm public-domain health and expected Git SHA/deployment metadata.
- Review runtime errors and critical API responses.
- Smoke-test authentication and a tenant-scoped read.
- For affected areas, verify payments, webhooks, cron and outbound automation are not duplicating work.
- Keep the incident open until data integrity and external side effects are reconciled.

## Database Boundary

Application rollback does not revert database state. Never run a down migration merely because the application was rolled back. Prefer backward-compatible expand/contract migrations and a forward fix. Restore/PITR or compensating SQL requires its own reviewed plan, recovery evidence and explicit production authorization.

## External Side Effects

Alias rollback cannot recall email, payment, webhook or partner API operations already accepted. Reconcile by idempotency key and audit trail before retrying. Pause automations when their current state is uncertain.

## Target Time And Ownership

- Decision owner: designated production/release owner.
- Operator: authorized Vercel project owner.
- Initial application rollback target: 15 minutes after the decision, subject to compatibility review.
- Database RTO/RPO: governed separately by the production recovery plan; no value is inferred by this runbook.

## Capability Assessment

Prior deployments and their exact Git SHAs are identifiable, and Vercel exposes rollback/promotion mechanisms. Because no controlled rollback test was performed in Phase 1, capability is classified **PARTIAL** until a non-incident exercise validates permissions, alias movement and post-rollback checks.
