# RF-03B.1 PostgreSQL Query Benchmark

## CNPJ Root Lookup

Warm 100-query sample: p50 **0.008 ms**, p95 **0.0624 ms**, max **8.107 ms**. `EXPLAIN ANALYZE` used `rf_companies_unique_root`; execution was 0.040 ms with seven shared-buffer hits for the sampled lookup.

## Legal-Name Prefix

`legal_name LIKE 'A%' ORDER BY legal_name LIMIT 50` returned in **16.595 ms**, but scanned/filter-tested all 100,000 version rows through the dataset index: 11,751 matched and 88,249 were removed by filter. This is acceptable for the bounded sample but not evidence of national prefix-search readiness.

## Decision

PostgreSQL-first remains the correct hypothesis. Exact CNPJ-root lookup is proven at bounded scale. Prefix search needs representative national sizing and likely a version-aware text-search/trigram index before authorization. Cold-cache and concurrent query tests were not run; overall query gate is **PARTIAL**, without evidence justifying Elasticsearch/OpenSearch.
