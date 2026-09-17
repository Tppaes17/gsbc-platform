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
  --sample-bytes 65536
```

Expected output:

```text
rf-source-evidence/
  source_probe.json
  dataset_manifest.json
  probe_summary.md
```

Do not edit these files. Return the entire directory for validation. A `NOT_VERIFIED` result is valid evidence of that executor's reachability and must not be changed manually.

Tests:

```bash
node --test scripts/rf-source-probe/probe.test.mjs
```
