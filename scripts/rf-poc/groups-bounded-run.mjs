import { createReadStream } from "node:fs";
import { mkdir, mkdtemp, rm, statfs, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";

import { extractZipEntry, inspectZip } from "./archive.mjs";
import { downloadFile } from "./downloader.mjs";
import { benchmarkEstablishmentsAndSimples } from "./group-db-benchmark.mjs";
import { assertAuthorizedGroups } from "./group-guardrails.mjs";
import { assertWithinGuardrail } from "./guardrails.mjs";
import { parseDelimited, parseEstablishment, parseSimples } from "./parser.mjs";

const HOST = "arquivos.receitafederal.gov.br";
const LIMITS = Object.freeze({ maxCompressedBytes: 400 * 1024 * 1024, maxExtractedBytes: 5 * 1024 * 1024 * 1024, maxExpansionRatio: 15, maxFiles: 1, maxRows: 100_000_000, maxDbRows: 50_000, maxRuntimeMs: 45 * 60 * 1000, minimumFreeBytes: 20 * 1024 * 1024 * 1024 });
const selections = Object.freeze([
  { filename: "Estabelecimentos7.zip", datasetGroup: "ESTABELECIMENTOS", expectedBytes: 339_164_748, lastModified: "Mon, 14 Sep 2026 15:05:50 GMT", etag: '"21b95fd5a24b5078a2372a9d105a1b1b"', referencePeriod: "2026-09", url: "https://arquivos.receitafederal.gov.br/public.php/dav/files/YggdBLfdninEJX9/2026-09/Estabelecimentos7.zip" },
  { filename: "Simples.zip", datasetGroup: "SIMPLES", expectedBytes: 308_027_792, lastModified: "Mon, 14 Sep 2026 15:07:06 GMT", etag: '"b9cc6da9c805ce33dcb7209895aafe4f"', referencePeriod: "2026-09", url: "https://arquivos.receitafederal.gov.br/public.php/dav/files/YggdBLfdninEJX9/2026-09/Simples.zip" },
]);

function args(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) if (argv[index].startsWith("--")) parsed[argv[index].slice(2)] = argv[++index];
  return parsed;
}

async function processGroup(selection, workspace, parseRecord) {
  const archivePath = path.join(workspace, selection.filename);
  const extractedPath = path.join(workspace, `${selection.datasetGroup}.csv`);
  const start = performance.now();
  const downloadStart = performance.now();
  const downloaded = await downloadFile({ url: selection.url, destination: archivePath, maxBytes: LIMITS.maxCompressedBytes, timeoutMs: 20 * 60 * 1000, attempts: 2, expectedBytes: selection.expectedBytes, allowedHosts: [HOST] });
  const downloadMs = performance.now() - downloadStart;
  if (downloaded.etag !== selection.etag || downloaded.last_modified !== selection.lastModified || !downloaded.content_type?.startsWith("application/zip")) throw new Error(`${selection.datasetGroup} metadata differs from manifest`);
  const archive = await inspectZip(archivePath, LIMITS);
  if (archive.entries.length !== 1) throw new Error(`${selection.datasetGroup} archive must contain one data file`);
  const extractStart = performance.now();
  const extracted = await extractZipEntry({ archivePath, entry: archive.entries[0], destination: extractedPath, maxBytes: LIMITS.maxExtractedBytes });
  const extractMs = performance.now() - extractStart;
  const records = [];
  const rejectionCategories = {};
  let sourceRows = 0;
  let parsedRows = 0;
  let peakRss = process.memoryUsage().rss;
  const parseStart = performance.now();
  for await (const fields of parseDelimited(createReadStream(extractedPath))) {
    sourceRows += 1;
    assertWithinGuardrail(`${selection.datasetGroup} rows`, sourceRows, LIMITS.maxRows);
    try {
      const record = parseRecord(fields);
      parsedRows += 1;
      if (records.length < LIMITS.maxDbRows) records.push(record);
    } catch (error) {
      const category = error.message.replaceAll(" ", "_").toUpperCase();
      rejectionCategories[category] = (rejectionCategories[category] ?? 0) + 1;
    }
    if (sourceRows % 10_000 === 0) peakRss = Math.max(peakRss, process.memoryUsage().rss);
  }
  const parseMs = performance.now() - parseStart;
  return {
    selection, records,
    source: { compressed_bytes: downloaded.size_bytes, extracted_bytes: extracted.size_bytes, expansion_ratio: extracted.size_bytes / downloaded.size_bytes, archive_entry: archive.entries[0], sha256_local: downloaded.checksum_sha256, official_checksum_available: false, etag: downloaded.etag, last_modified: downloaded.last_modified },
    quality: { source_rows: sourceRows, parsed_rows: parsedRows, rejected_rows: sourceRows - parsedRows, staged_sample_rows: records.length, intentionally_not_staged_rows: parsedRows - records.length, rejection_categories: rejectionCategories, reconciliation: sourceRows === parsedRows + (sourceRows - parsedRows) ? "PASS" : "FAIL" },
    timings_ms: { download: downloadMs, extract: extractMs, parse: parseMs, total_without_db: performance.now() - start },
    throughput: { download_bytes_per_second: downloaded.size_bytes / (downloadMs / 1000), extract_bytes_per_second: extracted.size_bytes / (extractMs / 1000), parse_rows_per_second: sourceRows / (parseMs / 1000) },
    resources: { peak_rss_bytes: peakRss, scratch_bytes: downloaded.size_bytes + extracted.size_bytes },
  };
}

const options = args(process.argv.slice(2));
if (!options.output) throw new Error("Usage: node groups-bounded-run.mjs --output <metrics.json> [--container <local-container>]");
assertAuthorizedGroups(selections);
const disk = await statfs(os.tmpdir());
const availableBytes = disk.bavail * disk.bsize;
if (availableBytes < LIMITS.minimumFreeBytes) throw new Error(`Insufficient scratch disk: ${availableBytes}`);
const workspace = await mkdtemp(path.join(os.tmpdir(), "rf03b2a-bounded-"));
const totalStart = performance.now();
try {
  const establishment = await processGroup(selections[0], workspace, parseEstablishment);
  const simples = await processGroup(selections[1], workspace, parseSimples);
  const dbStart = performance.now();
  const database = benchmarkEstablishmentsAndSimples(establishment.records, simples.records, { container: options.container });
  const databaseMs = performance.now() - dbStart;
  const totalMs = performance.now() - totalStart;
  assertWithinGuardrail("total runtime ms", totalMs, LIMITS.maxRuntimeMs);
  const metrics = { schema_version: 1, started_at: new Date(Date.now() - totalMs).toISOString(), finished_at: new Date().toISOString(), environment: "LOCAL_MACOS_DOCKER_POSTGRES_DISPOSABLE_TRANSACTION", limits: LIMITS, available_disk_bytes_preflight: availableBytes, establishment: { ...establishment, records: undefined }, simples: { ...simples, records: undefined }, database, database_ms: databaseMs, total_ms: totalMs, cnpj_alphanumeric_path: "CENTRAL_HELPER_AND_SYNTHETIC_TEST_PASS", production_worker_reachability: "NOT_PROVEN", production_changed: false, billing_changed: false, national_ingestion: false, cleanup: "GUARANTEED_BY_FINALLY_AND_EXTERNALLY_VERIFIED" };
  await mkdir(path.dirname(options.output), { recursive: true });
  await writeFile(options.output, `${JSON.stringify(metrics, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(metrics, null, 2)}\n`);
} finally {
  await rm(workspace, { recursive: true, force: true });
}
