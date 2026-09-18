# RF-03B.1 Quality Reconciliation

```text
source rows:                 4,494,860
parsed rows:                 4,494,860
parser-rejected rows:                0
bounded staged rows:           100,000
bounded accepted rows:         100,000
bounded canonical rows:        100,000
intentionally not staged:    4,394,860
duplicate inflation rerun:            0
```

Reconciliation: **PASS**. `source = parsed + rejected`, and `parsed = bounded staged + intentionally not staged`. The 100,000-row cap is an explicit deterministic benchmark boundary, not silent loss. The second load produced exactly the same 100,000 staging and canonical rows.

Provenance was retained through dataset version, official source file, reference period, source row number and source record SHA-256. No official checksum was published; ETag/Last-Modified/Content-Length, structural ZIP validation and local SHA-256 `96654b30a70af095291a7c028f813c680e8ac04d7b80c49a19671f07fad46d75` were used. The local hash is not represented as an official Receita checksum.
