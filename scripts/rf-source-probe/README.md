# RF Official Source Probe

Read-only metadata collector for the official Receita CNPJ source. It does not use credentials, connect to GSBC services, execute remote content, unzip files or download the national dataset.

Run from an approved network that can reach the Receita host:

```bash
node scripts/rf-source-probe/probe.mjs \
  --endpoint 'https://arquivos.receitafederal.gov.br/index.php/s/YggdBLfdninEJX9' \
  --output './rf-source-evidence' \
  --timeout-ms 30000 \
  --max-bytes 2097152 \
  --max-files 500 \
  --sample-bytes 65536 \
  --stability-delay-ms 5000
```

Expected output:

```text
rf-source-evidence/
  source_probe.json
  dataset_manifest.json
  probe_summary.md
```

Do not edit these files. Return the entire directory for validation. A `NOT_VERIFIED` result is valid evidence of that executor's reachability and must not be changed manually.

For the public Receita share, the probe derives the allowlisted public WebDAV endpoint, performs two bounded `PROPFIND` discoveries, rejects DTD/XXE, and hashes normalized metadata. It never requests ZIP contents; `--sample-bytes` is retained for CLI compatibility and is skipped when WebDAV metadata is available.

Tests:

```bash
node --test scripts/rf-source-probe/probe.test.mjs
```
