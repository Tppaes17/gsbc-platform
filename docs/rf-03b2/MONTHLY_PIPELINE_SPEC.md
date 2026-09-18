# RF-03B.2 Monthly Pipeline Specification

```text
DISCOVER -> VERIFY STABLE MANIFEST -> CREATE VERSION
-> DOWNLOAD RAW -> VERIFY -> EXTRACT -> LOAD STAGING
-> NORMALIZE -> RECONCILE -> BUILD INDEXES -> QUALITY GATE
-> DIFF AGAINST ACTIVE -> ANOMALY GATE -> ATOMIC PUBLISH
-> VERIFY ACTIVE -> RETAIN 3 -> EXPIRE ELIGIBLE OLD PARTITION
-> APPLY RAW-6 LIFECYCLE -> CLEAN TEMP
```

Each job has durable identity `(source, reference_period, manifest_hash, stage, attempt)`, heartbeat, checkpoint and cancellation. Retries reuse verified objects/markers and deterministic record/event keys. A distributed lock prevents concurrent publication for the same source.

Metrics: active/staging period, dataset age, file/group counts, records by group, quality failures, event counts/types, removal/status spikes, publish duration, rollback count and cleanup status. No scheduler is created in this phase.

Worker recommendation for future bounded validation: containerized batch job, 4-8 vCPU, 16-32 GB RAM and separately provisioned 1-3 TB scratch class, with streaming, checkpoint/resume, hard disk/WAL limits, private object-storage identity and no GSBC service-role secret unless explicitly required. Final class depends on missing benchmarks. Production Receita reachability remains NOT PROVEN.
