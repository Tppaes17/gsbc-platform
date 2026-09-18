# RF-03B.1 National Capacity Projection

Official national compressed baseline: **7,758,926,262 bytes / 37 ZIPs**. Group totals are EMPRESAS 1.379 GB, ESTABELECIMENTOS 5.381 GB, SOCIOS 0.691 GB, SIMPLES 0.308 GB, references 0.072 GB.

## Measured And Derived

The selected company file expanded 4.184x and contained 4.495 million rows. Within the 100,000-row transaction, staging + canonical + indexes used about 1,943 bytes/row, canonical company table + indexes about 961 bytes/row, and WAL about 3,238 bytes/row.

If only the ten EMPRESAS files share this file's density, the derived estimate is roughly 79.6 million rows, 76.5 GB company canonical+indexes, 154.6 GB with JSON staging retained during load, and 257.6 GB WAL. These are extrapolations, not measurements of the other nine files.

## Planning Envelope

| Component | Projection | Evidence class |
| --- | --- | --- |
| Raw ZIPs | 7.76 GB | MEASURED official manifest |
| Extracted national workspace | 23-62 GB | ASSUMED 3x-8x; measured company point is 32.46 GB equivalent |
| EMPRESAS canonical+indexes | ~76.5 GB | DERIVED from one partition/sample |
| EMPRESAS staging+canonical | ~154.6 GB | DERIVED, high uncertainty |
| EMPRESAS WAL per full rebuild | ~257.6 GB | DERIVED, high uncertainty |
| ESTABELECIMENTOS/SOCIOS/SIMPLES DB | UNKNOWN | Unrepresented schemas/row density |
| National DB final | UNKNOWN | Must not be inferred from EMPRESAS alone |
| Peak disk planning envelope | 0.5-1.5 TB | ASSUMED for active+staging+indexes+temp+WAL+raw+safety |

At the observed local download rate, 7.76 GB would take about 5.6 hours before retries; network variance is material. Company parsing CPU alone scales to minutes, but company normalization projects near seven hours at observed throughput. Other groups may dominate.

The current shared GSBC PostgreSQL is not defensibly sized for national load. A dedicated worker, scratch volume, object storage and dedicated PostgreSQL remain the recommended architecture candidates, pending benchmarks for Establishments, Simples and a privacy-reviewed Socios strategy. Production worker Receita reachability remains **NOT PROVEN**.
