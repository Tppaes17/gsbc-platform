# RF-03B.2 Retention Policy

## Canonical

Keep exactly three successful full competencies by default:

```text
N   ACTIVE
N-1 RETIRED / rollback eligible
N-2 RETIRED / double-check eligible
N-3 EXPIRED only after N is ACTIVE and verified
```

N-3 expiration requires quality PASS, complete diff, verified ACTIVE N, healthy N-1 rollback, preserved manifest/provenance, successful cleanup preflight and no operational/legal hold. Expiration detaches/drops the version partition; it never deletes long-term events or manifests.

## RAW

Select **RAW-6**: six complete monthly competences in private versioned object storage. RAW-12 costs little in object bytes but doubles sensitive/QSA exposure and lifecycle burden without a demonstrated recovery requirement. Reassess RAW-12 if source availability or reprocessing lead time proves inadequate.

At the current 7.759 GB baseline, RAW-6 is 46.55 GB and RAW-12 is 93.11 GB before growth/version overhead. Use a +/-25% planning sensitivity; never assume constant monthly size.

## Permanent Lightweight Evidence

Retain manifests, URLs, ETag, Content-Length, generated SHA-256, parser/schema versions, quality/publication metadata and diff events for the product/audit lifetime subject to legal policy. Diff payload must minimize personal data.

QSA is excluded until legal basis/privacy review. If later approved, retain at most ACTIVE + previous full QSA competence, keep RAW no longer than operationally necessary, and do not store old/new personal values in long-term diff events unless specifically justified.
