# RF-03B.2 Search And Index Strategy

Remain PostgreSQL-first.

- Exact CNPJ/root: B-tree unique `(dataset_version_id, cnpj_root/cnpj_canonical)`.
- Active-version pruning: list partition by `dataset_version_id`; query resolves ACTIVE once and binds version.
- CNAE/UF/municipality/status filters: selective composite B-trees led by version ID, justified by query plans.
- Prefix legal/trade name: normalized uppercase/unaccent search column plus `(dataset_version_id, normalized_name text_pattern_ops)` for anchored prefix.
- Fuzzy/contains only if product evidence requires it: `pg_trgm` GIN/GiST benchmarked per partition.
- Pagination: stable keyset, not large OFFSET.

RF-03B.1 exact lookup passed but legal-name prefix filtered all 100,000 rows. Therefore national prefix search is a blocking benchmark, not a reason to install Elasticsearch/OpenSearch. Run cold/warm/concurrent EXPLAIN ANALYZE on representative Establishments/Companies before index finalization.
