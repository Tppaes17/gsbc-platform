# RF-03B.2 Publish And Rollback Specification

Publish executes under a database advisory lock and one transaction:

1. Revalidate manifest, reconciliation, quality and anomaly gates.
2. Require candidate `READY` and diff completion marker.
3. Mark existing ACTIVE as RETIRED.
4. Mark candidate ACTIVE with publication timestamp.
5. Insert immutable publication event.
6. Commit; the unique ACTIVE invariant is the final database authority.

Any failure rolls back all six steps and leaves N-1 ACTIVE. Publication never depends on a frontend sequence.

Rollback is another audited transaction: lock source, verify retained target, change current ACTIVE to RETIRED, target to ACTIVE, and record reason/from/to/time/actor. It does not reingest or delete diff/publication history.

Retention cleanup runs only after publish verification and outside the publish critical transaction. N-3 may expire only after all policy predicates pass. Legal/operational hold always overrides deletion.

Local fixtures proved single ACTIVE, failed-publish preservation, atomic publish, audited rollback, N/N-1/N-2 retention and hold protection.
