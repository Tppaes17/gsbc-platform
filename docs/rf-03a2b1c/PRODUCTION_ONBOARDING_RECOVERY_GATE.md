# Production Onboarding Recovery Gate

```text
PRODUCTION CLIENT ONBOARDING = BLOCKED
UNTIL RECOVERY ARCHITECTURE REVIEW PASSES
```

This gate is triggered by the first real client, live charge/payment, authoritative reconciliation, or irreconstructible legal/delivery/audit evidence. It has no calendar expiry.

## Mandatory Review

- Confirm paid plan and PITR/equivalent against approved production RPO/RTO.
- Observe recovery window/lag and complete/independent backup retention.
- Restore a real production recovery point to an isolated target.
- Validate Auth login/config, Storage object bytes, RLS/tenant isolation, grants/service role, audit and financial idempotency/reconciliation.
- Confirm independent failure domain, key recovery, deletion protection and monitoring ownership.
- Measure full application RTO including provisioning, config, validation and cutover.
- Review DR, capacity, region/provider/account failure and incident roles.
- Record explicit owner authorization before onboarding/go-live.

The daily pre-production baseline cannot satisfy this gate and must never be cited as production readiness.
