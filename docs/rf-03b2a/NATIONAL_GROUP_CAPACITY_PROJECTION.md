# National Group Capacity Projection

| Grupo | Linhas / tamanho canônico+índices | Classe |
| --- | --- | --- |
| Empresas | 79.6 M / 76.5 GB | DERIVED RF-03B.1 |
| Estabelecimentos | 75.4 M / ~122 GB | DERIVED por 5.381 GB oficiais ÷ partição medida |
| Simples | 50.397 M / ~39.6 GB | linhas MEASURED; storage DERIVED da amostra |
| Referências | 72 MB compactados; DB não medido | MEASURED / UNKNOWN |
| Sócios/QSA | 691 MB compactados; DB não medido | UNKNOWN / NOT BENCHMARKED |

O piso calculável é ~238 GB por snapshot para os três grupos medidos, excluindo referências, QSA, diff e proveniência. Três competências implicam ~714 GB antes desses componentes. Staging projetado adiciona ~213 GB por ciclo; WAL observado extrapola para centenas de GB, mas tem alta incerteza por incluir fixtures e índices.

Envelope de steady state: **0.9-1.4 TB**. Peak mensal com N-3 durante staging, WAL, temp, raw/extracted e 30% de margem: **1.8-3.0 TB**. Esses intervalos são ASSUMED/DERIVED e devem ser validados por benchmark nacional autorizado.
