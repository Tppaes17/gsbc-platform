# RF-03B.1 Failure Injection Report

| Scenario | Result | Evidence |
| --- | --- | --- |
| Download interruption/retry | PASS | Injected first-request failure; retry completed |
| Host allowlist/unsafe redirect | PASS | Non-official host and cross-host redirect rejected |
| Download bound/declared length | PASS | Oversize guard and Content-Length mismatch rejected |
| Checksum mismatch | PASS | Expected/local SHA mismatch rejected |
| Corrupted ZIP | PASS | Central-directory inspection rejected random payload |
| Truncated ZIP | PASS | Truncated valid archive rejected |
| ZIP traversal/absolute path | PASS | Entry validator rejects unsafe paths |
| ZIP symlink | PASS | Symlink archive rejected |
| Expansion/file-count bounds | PASS | Central directory checked before extraction |
| Malformed parser input | PASS | Unterminated quoted field rejected |
| Simulated insufficient capacity | PASS | Guardrail fails closed before work |
| Database load interruption | PASS | Transaction error left zero dataset/staging/canonical rows |
| Normalization constraint failure | PASS | Invalid root rejected by canonical constraint |
| Duplicate rerun | PASS | 100,000 rows before and after rerun |
| No publish on failure | PASS | Failed transaction left zero current/published benchmark rows |
| Cleanup | PASS | Scratch absent and all benchmark IDs count zero after run |

The first real run also failed closed because the simulated previous `PUBLISHED` version omitted mandatory `published_at`. The fixture was corrected to honor migration 0043 and the successful run repeated. No result was published from the failed attempt.
