# Backup Security Model

## POC Controls

- AES-256-GCM authenticated encryption with a random 32-byte key supplied only by environment variable.
- Random nonce per artifact; authentication tag rejects wrong key and corruption.
- SHA-256 verifies the encrypted local/copy artifact before manifest and marker creation.
- Canonical manifest plus separately hashed success marker prevents incomplete points from selection.
- Atomic lock directory prevents overlap; stale locks are recovered only after the configured age.
- Partial or failed artifacts are removed and never receive a marker.
- POC output lives under `/tmp`; no key or backup was written to Git.

## Production Requirements Not Proven

- Store encryption key in an independently recoverable secret manager, separate from backup data and application runtime.
- Dedicated least-privilege backup writer without production mutation or lifecycle administration.
- Separate break-glass restore identity and tested key rotation/recovery.
- TLS upload, provider encryption at rest, versioning/immutability, deletion protection and access/deletion audit logs.
- Independent account/provider failure domain and approved region/LGPD posture.
- No PII, secrets or raw backup contents in logs/evidence.

The local `/tmp` copy proves cryptographic/copy semantics only. It is not durable, independent or protected from host loss.
