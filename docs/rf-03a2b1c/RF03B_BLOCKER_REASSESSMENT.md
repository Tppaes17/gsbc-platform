# RF-03B Blocker Reassessment

RF-03B is not automatically released. Production-grade operational-core DR should not by itself prevent bounded development on public/reconstructible RF data, but other technical gates remain.

## A - Required Now For Technical Safety

- Keep all RF work local/isolated, bounded and non-publishing.
- Preserve official manifest/provenance/checks and deterministic transforms.
- No writes into operational tenant/financial truth from unvalidated RF data.
- Select/prove an isolated RF target before national load.
- Benchmark storage, WAL/temp/index build and two-version overlap before national ingestion.
- Prove official-source reachability from the eventual worker.
- Maintain migration/RLS/privilege baseline and no production side effects.

## B - Required Only Before Production/Client Onboarding

- Operational-core PITR/equivalent and production RPO/RTO.
- Full Auth/Storage/platform recovery and independent key lifecycle.
- Production onboarding recovery gate and financial/legal reconciliation drill.
- Production-grade DR, cross-account/region policy and on-call monitoring.

## C - Already Closed

- Official WebDAV manifest/parser and bounded metadata discovery.
- Local RF data model/migration baseline through 0046.
- Local logical dump encryption/integrity and disposable DB restore mechanism.
- High-frequency Option C rejected; it is no longer an RF-03B prerequisite.

## D - Unknown/Open

- Dedicated RF provider/placement/budget and measured capacity.
- Production-worker network route.
- Independent cloud-sync completion/security for the daily baseline.
- National restore/rebuild duration.

## Recommendation

```text
RF-03B NATIONAL/PRODUCTION INGESTION: BLOCKED
RF-03B LOCAL BOUNDED DEVELOPMENT SUBSET: ELIGIBLE FOR SEPARATE HUMAN AUTHORIZATION
```

The separate authorization must define dataset bounds, local/isolated target, no publication, no production scheduler and stop conditions. This document does not start RF-03B.
