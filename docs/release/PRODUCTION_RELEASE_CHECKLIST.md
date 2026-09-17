# Production Release Checklist

## Candidate

- [ ] Release ID and exact Git SHA recorded.
- [ ] PR approved; diff and scope reviewed.
- [ ] Vercel candidate ID/URL belongs to the expected project, branch and SHA.
- [ ] Candidate is READY and not already assigned to production domains.
- [ ] Typecheck passes.
- [ ] Lint has no new errors; warnings reviewed.
- [ ] Focused unit/integration/E2E/security tests pass.
- [ ] Migration baseline and drift status are known.
- [ ] Security, tenant isolation, payment and automation implications reviewed.
- [ ] Environment-variable changes are absent or separately approved.
- [ ] Preview/candidate did not use production mutating credentials during validation.
- [ ] Rollback target is identified and still available.

## Database Authorization

- [ ] Database change is separately authorized; app release approval alone is insufficient.
- [ ] Migration reviewed for locks, duration, data loss, RLS/grants and idempotency.
- [ ] Backup/recovery gate appropriate to impact is satisfied.
- [ ] Forward-fix and rollback/restore strategy documented.
- [ ] Migration execution owner and post-migration queries assigned.
- [ ] Compatibility order established: expand -> deploy -> migrate/backfill -> contract.

## Human Promotion

- [ ] Approver identity and approval timestamp recorded against release/SHA.
- [ ] Production health is green before promotion.
- [ ] No unrelated pending deployment can race the candidate.
- [ ] Explicit Vercel Promote action performed by authorized owner.
- [ ] Production aliases now point only to the approved deployment.

## Post-Release

- [ ] Public production URL returns expected health/status.
- [ ] Error logs, cron and critical API paths checked.
- [ ] Auth, tenant isolation and financial smoke checks pass where applicable.
- [ ] Release record contains release ID, SHA, deployment ID, approver, timestamp, URL, migration baseline, health result and rollback target.
- [ ] Failed validation triggers the rollback runbook; app rollback is never represented as database rollback.

