# RF-03B.1 Ingestion Benchmark Metrics

Environment: macOS, 8 logical CPUs, 8 GiB RAM, Docker PostgreSQL 17.6, 128 MB `shared_buffers`, 4 MB `work_mem`, 64 MB `maintenance_work_mem`. Migration parity: 0001-0046.

| Stage | Measured result |
| --- | ---: |
| Download | 201.866 s; 385,888 bytes/s |
| Extract | 2.020 s; 161,366,860 bytes/s |
| Parse | 17.746 s; 253,285 rows/s |
| Bounded PostgreSQL work | 40.665 s |
| COPY 100,000 rows | 1.235 s; 81,004 rows/s |
| Normalize 100,000 rows | 31.868 s; 3,138 rows/s |
| Total | 264.066 s |

| Capacity | Measured result |
| --- | ---: |
| ZIP | 77,897,750 bytes |
| Extracted CSV | 325,895,992 bytes |
| Expansion ratio | 4.184x |
| Source/parsed rows | 4,494,860 / 4,494,860 |
| Bounded staged/canonical rows | 100,000 / 100,000 |
| Relation growth during transaction | 194,297,856 bytes |
| Company table plus indexes | 96,133,120 bytes |
| Index bytes | 35,086,336 bytes |
| WAL generated | 323,846,416 bytes |
| Scratch ZIP + extracted | 403,793,742 bytes |
| Derived observed disk-component lower bound | 921,938,014 bytes |
| Memory baseline / peak RSS | 52,822,016 / 337,936,384 bytes |

Peak disk is a derived sum of observed scratch, relation delta and WAL, not a filesystem high-water sensor. CPU utilization was not sampled reliably and remains UNKNOWN. All raw files and database rows were removed after evidence capture.
