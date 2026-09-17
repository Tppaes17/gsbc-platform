# Isolated Restore Runbook

## Preconditions

1. Authorized incident/drill owner selects a success-marked point.
2. Target is disposable, isolated and has no production routes/secrets.
3. Outbound email, PSP, webhook, cron and Storage writes are disabled.
4. Key access is break-glass and audited; checksum/manifest verify before decryption.

## POC Flow

```text
verify marker -> verify manifest -> verify encrypted SHA-256
-> decrypt AES-256-GCM -> extract bundle
-> create disposable database -> restore without managed/global ACLs
-> replay GSBC schema ACLs -> validate -> destroy target
```

## Validation

- Schema/table/sequence/index/constraint/view/function/trigger presence.
- Migration baseline and extensions.
- RLS-enabled tables and application grants.
- Auth user records; separately reconstruct Auth providers/redirects/SMTP/keys.
- Storage metadata; separately restore physical object bytes.
- Tenant isolation, service-role, authentication, audit and financial/idempotency tests before any future cutover.
- Inventory external payment/email/webhook side effects; database restore does not reverse them.

## Production Boundary

The POC used only local Supabase and a disposable database in its local container. A future full-platform drill needs a separately authorized Supabase target, object backup, platform configuration and application smoke tests. Never restore over production to test recoverability.
