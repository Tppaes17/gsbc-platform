# RF-03A.2A.1 - WebDAV Parser Evidence

## Execution

- Date: 2026-09-17
- Official share: `https://arquivos.receitafederal.gov.br/index.php/s/YggdBLfdninEJX9`
- Derived WebDAV root: `https://arquivos.receitafederal.gov.br/public.php/dav/files/YggdBLfdninEJX9/`
- Current-period endpoint: `https://arquivos.receitafederal.gov.br/public.php/dav/files/YggdBLfdninEJX9/2026-09/`
- Network: user-approved VPN
- Authentication: none
- WebDAV response: HTTP `207 Multi-Status`
- ZIP content requested: no
- GSBC/Supabase accessed: no

## Command

```bash
node scripts/rf-source-probe/probe.mjs \
  --endpoint 'https://arquivos.receitafederal.gov.br/index.php/s/YggdBLfdninEJX9' \
  --output './rf-source-evidence-vpn-v2' \
  --timeout-ms 30000 \
  --max-bytes 2097152 \
  --max-files 500 \
  --sample-bytes 65536 \
  --stability-delay-ms 5000
```

`--sample-bytes` was retained for CLI compatibility. The WebDAV path skipped payload sampling and made no range request against a ZIP.

## Observed Requests

| Stage | HTTP | Bytes read |
| --- | ---: | ---: |
| HEAD public share | 200 | 0 |
| OPTIONS public share | 405 | 0 |
| GET public share HTML | 200 | 23,353 |
| WebDAV root run 1 | 207 | 23,584 |
| WebDAV period run 1 | 207 | 22,348 |
| WebDAV root run 2 | 207 | 23,584 |
| WebDAV period run 2 | 207 | 22,348 |
| ZIP payload | not requested | 0 |

Total response body bytes read: `115,217`, all from public HTML/XML metadata.

## Result

- Connectivity: VERIFIED
- Listing: VERIFIED
- Manifest: VERIFIED
- Reference period: `2026-09`
- ZIP count: `37`
- Compressed bytes: `7,758,926,262`
- Largest ZIP: `2,243,389,254` bytes
- Integrity mode: `ETAG_SIZE_LAST_MODIFIED`
- Quality findings: none
- Run 1 hash: `790a5080100680c7b35b553915a655ad5cfb1afed013f88543d395bd5679f22d`
- Run 2 hash: `790a5080100680c7b35b553915a655ad5cfb1afed013f88543d395bd5679f22d`
- Stability: STABLE

ETags are preserved as remote metadata and are not represented as checksums.

## Parser Security

The parser is a bounded, local, dependency-free XML reader. It performs no network resolution and rejects DTDs, entity declarations, non-XML processing instructions, malformed XML, unsafe percent encoding, path traversal, forbidden domains, excess response bytes, excess entries, excess nodes, and excessive nesting.

