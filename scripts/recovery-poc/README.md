# GSBC Recovery POC

Local-only proof for encrypted PostgreSQL backup and isolated restore. It never targets the linked remote project and does not install a scheduler.

```bash
export RECOVERY_POC_KEY_BASE64="$(openssl rand -base64 32)"
export RECOVERY_POC_OUTPUT="/tmp/gsbc-recovery-poc"
node scripts/recovery-poc/recovery-poc.mjs run
```

Modes are `backup`, `restore`, and `run`. The default local DB container is `supabase_db_GSBC_2_-_Claude`; override it only with `RECOVERY_POC_DB_CONTAINER`. Keep the key outside the output and Git. Losing the key makes the backup unrecoverable.

Failure injection stages: `dump`, `encryption`, `copy`, `checksum-mismatch`, and `marker` through `RECOVERY_POC_INJECT_FAILURE`.

The output directory contains an encrypted tar, canonical manifest and success marker. Only points whose marker, manifest and encrypted file hashes verify are selectable. The local second directory simulates the copy protocol; it is not an independent durable failure domain.

Run tests with `npm run test:recovery-poc`.
