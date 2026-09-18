# RF-03B.2 Readiness Assessment

```text
RF-03B.1 BOUNDED PIPELINE: CONDITIONAL
RF-03B.2 NATIONAL INGESTION ARCHITECTURE: CONDITIONAL
NATIONAL INGESTION AUTHORIZED: NO
```

## Closed For Bounded Development

- Official single-ZIP download, metadata and integrity controls.
- Safe ZIP inspection/extraction and full-file streaming parse.
- Bounded staging/canonical normalization with provenance.
- Idempotency, transaction rollback, publish semantics and cleanup.
- Exact CNPJ-root PostgreSQL lookup at bounded scale.
- Alphanumeric CNPJ preservation in synthetic pipeline tests.

## Required Before RF-03B.2 Authorization

- Benchmark at least Establishments and Simples; define privacy gate before any Socios/QSA work.
- Select owner-approved dedicated DB/worker/object-storage architecture and budget.
- Prove production-worker reachability to Receita without owner VPN dependency.
- Replace full-row JSON staging where measurements justify a leaner bulk design.
- Design WAL, index-build, two-version and temp-space controls against the peak model.
- Add national-scale prefix/search indexing and concurrent/cold-cache query tests.
- Define checkpoints/resume, monitoring, object retention and recovery impact.

Current-stage findings: P0=0, P1=0, P2=4 (unrepresented groups, production reachability, capacity architecture, national search), P3=1 (CPU high-water unavailable). These are compatible with the bounded pre-production phase but block automatic national progression.
