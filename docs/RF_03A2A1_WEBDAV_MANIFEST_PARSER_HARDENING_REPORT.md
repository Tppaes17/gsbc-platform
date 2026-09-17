# RF-03A.2A.1 WebDAV Manifest Parser Hardening Report

## Executive Summary

The false negative in the official-source probe is resolved. The tool now discovers the Receita public WebDAV endpoint, safely parses HTTP 207 XML, selects the latest official `YYYY-MM` directory, normalizes and classifies ZIP metadata, computes a deterministic manifest, and repeats discovery to test stability.

The live VPN execution verified period `2026-09`, 37 ZIPs, and `7,758,926,262` compressed bytes. Both discoveries produced hash `790a5080100680c7b35b553915a655ad5cfb1afed013f88543d395bd5679f22d`. No ZIP was downloaded and no production system was accessed.

## Baseline And Root Cause

The original collector could reach the official public share over the VPN, but parsed only static HTML anchors. The Nextcloud page renders its inventory dynamically, so the collector observed zero files and incorrectly returned `NOT_VERIFIED`. It also represented an empty inventory as zero compressed bytes because `Array.every()` is true for an empty array.

The official public listing is available without credentials through `PROPFIND /public.php/dav/files/{share-token}/`. The former parser never attempted this endpoint.

## Parser Changes

- Derives the WebDAV URL only from a validated, allowlisted public-share token.
- Performs bounded `Depth: 1` PROPFIND requests against the root and latest official period.
- Supports namespace prefixes without assuming `d:`.
- Extracts href, resource type, content length, Last-Modified, ETag, content type, status, and period quota metadata.
- Keeps directories out of the ZIP inventory.
- Preserves original href while validating and normalizing the official URL and basename.
- Rejects traversal before URL normalization can collapse dot segments.
- Distinguishes `HTML_LISTING`, `WEBDAV_MULTISTATUS`, and `UNSUPPORTED_LISTING`.

## XML Security

No XML dependency was introduced. The constrained parser performs no external resolution and has no entity expansion facility. DTD/entity declarations, unsupported processing instructions, malformed tags, unknown entities, excessive nodes/depth, invalid encodings, and oversized responses fail closed. Existing HTTPS allowlist, redirect validation, timeout, byte, and entry limits remain active.

## Classification And Reference Period

The deterministic classes are EMPRESAS, ESTABELECIMENTOS, SOCIOS, SIMPLES, CNAES, MUNICIPIOS, NATUREZAS, PAISES, QUALIFICACOES, MOTIVOS, OTHER_REFERENCE, and UNKNOWN. UNKNOWN remains visible. The live inventory produced zero UNKNOWN files.

The reference period comes only from the latest official WebDAV collection whose basename matches canonical `YYYY-MM`; it is never inferred from local time. The observed value is `2026-09`.

## Sizing And Integrity

Content lengths are accepted only as non-negative safe integers. Missing or invalid file sizes produce an incomplete `null` total; an empty inventory also produces `null`, never zero. The live total is complete at `7,758,926,262` bytes.

Integrity mode is `ETAG_SIZE_LAST_MODIFIED`. ETag is not called a checksum, and `official_checksum` remains `null` because the source did not publish one.

## Canonicalization And Stability

Files are sorted by normalized name and URL. The manifest hash excludes observation timestamps, durations, latencies, and incidental XML order. Two complete discoveries five seconds apart produced the same SHA-256 hash, so inventory stability is `STABLE` for this verification window.

## Network Diagnostics

Nested network causes are retained as safe codes and classified as TCP_RESET, TIMEOUT, DNS, CONNECTION_REFUSED, TLS, NETWORK_FAILURE, or UNKNOWN. The production execution environment must independently prove Receita reachability; the current success is from the user-approved VPN.

## Tests And Verification

- Probe tests: 14/14 PASS
- Live WebDAV execution: PASS
- XML security cases: PASS
- Inventory reconciliation: PASS
- Typecheck (`npx tsc --noEmit`): PASS
- Lint (`npm run lint`): PASS with zero errors; one pre-existing out-of-scope React Compiler warning in `src/components/design-system/data-table.tsx`

## Findings

### Resolved

- `RF03A-P0-OFFICIAL-SOURCE`: closed with execution constraint.
- WebDAV 207 false negative: resolved.
- Empty inventory incorrectly reported as zero bytes: resolved.
- Network cause hidden behind generic `fetch failed`: resolved.

### Open Conditions

- Production worker network reachability to `arquivos.receitafederal.gov.br` is not yet proven.
- RF-03A.2B recovery architecture remains pending human authorization.
- RF-03B remains blocked and was not started.

## P0 Status And Gate

`RF03A-P0-OFFICIAL-SOURCE: CLOSED WITH EXECUTION CONSTRAINT`

Gate: **GO - WEBDAV MANIFEST VERIFIED**.

RF-03A.2B is ready for human authorization. This gate does not authorize ingestion, infrastructure, deployment, production access, RF-03A.2B execution, or RF-03B.

## Evidence

- `docs/rf-03a2a1/WEBDAV_PARSER_EVIDENCE.md`
- `docs/rf-03a2a1/OFFICIAL_DATASET_MANIFEST.json`
- `docs/rf-03a2a1/INVENTORY_RECONCILIATION.md`
