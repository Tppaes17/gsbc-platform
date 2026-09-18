# RF-03B.2 Capacity Model

RF-03B.1 measured only EMPRESAS: 76.5 GB projected company canonical+indexes, 154.6 GB with JSON staging and 257.6 GB WAL. Establishments, Simples and QSA remain unmeasured, so the following are planning envelopes, not procurement sizes.

| Model | Steady state | Monthly peak | Class |
| --- | ---: | ---: | --- |
| S1: 3 full snapshots | 450 GB-1.5 TB | 0.8-2.5 TB | ASSUMED from 150-500 GB/full snapshot |
| S2: 2 full snapshots | 300 GB-1.0 TB | 0.65-2.0 TB | ASSUMED |
| S3: active + diff | 150-500 GB plus diff | 0.5-1.5 TB | ASSUMED; weakest rollback/double-check |

S1 remains recommended because it supports immediate rollback and two-month double-check. Monthly peak includes N-1/N-2/N-3, STAGING N, index build, temp, WAL, raw/extracted workspace and safety margin; cleanup then leaves N/N-1/N-2.

Before sizing infrastructure, bounded benchmarks for Establishments and Simples must measure row density, normalization, indexes, WAL and peak disk. QSA requires privacy authorization first. Use 30% free-space operational floor and explicit disk/WAL abort thresholds; these values must be calibrated from the missing benchmarks.

Steady-state recommendation: **450 GB-1.5 TB planning range**. Monthly peak recommendation: **0.8-2.5 TB planning range**. Confidence is LOW.
