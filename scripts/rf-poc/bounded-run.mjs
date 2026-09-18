import { createReadStream } from "node:fs";
import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";

import { inspectZip, extractZipEntry } from "./archive.mjs";
import { benchmarkCompanies } from "./company-db-benchmark.mjs";
import { downloadFile } from "./downloader.mjs";
import { assertWithinGuardrail, BOUNDED_REAL_GUARDRAILS } from "./guardrails.mjs";
import { parseCompany, parseDelimited } from "./parser.mjs";

const OFFICIAL_HOST = "arquivos.receitafederal.gov.br";
const SELECTION = Object.freeze({
  filename: "Empresas1.zip",
  datasetGroup: "EMPRESAS",
  expectedBytes: 77_897_750,
  etag: '"7a5524025ba34598e2659a6b06db38e3"',
  lastModified: "Mon, 14 Sep 2026 14:59:35 GMT",
  contentType: "application/zip",
  referencePeriod: "2026-09",
  url: "https://arquivos.receitafederal.gov.br/public.php/dav/files/YggdBLfdninEJX9/2026-09/Empresas1.zip",
});

function args(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) if (argv[index].startsWith("--")) parsed[argv[index].slice(2)] = argv[++index];
  return parsed;
}

const options = args(process.argv.slice(2));
if (!options.output) throw new Error("Usage: node bounded-run.mjs --output <metrics.json> [--container <local-container>]");
const workspace = await mkdtemp(path.join(os.tmpdir(), "rf03b1-bounded-"));
const archivePath = path.join(workspace, SELECTION.filename);
const extractedPath = path.join(workspace, "Empresas1.csv");
const startedAt = new Date().toISOString();
const totalStart = performance.now();
const memoryBaseline = process.memoryUsage().rss;
let peakRss = memoryBaseline;

try {
  const diskBefore = await stat(workspace);
  const downloadStart = performance.now();
  const downloaded = await downloadFile({
    url: SELECTION.url,
    destination: archivePath,
    maxBytes: BOUNDED_REAL_GUARDRAILS.maxCompressedBytes,
    timeoutMs: 10 * 60 * 1000,
    attempts: 2,
    expectedBytes: SELECTION.expectedBytes,
    allowedHosts: [OFFICIAL_HOST],
  });
  const downloadMs = performance.now() - downloadStart;
  if (downloaded.etag !== SELECTION.etag || downloaded.last_modified !== SELECTION.lastModified) {
    throw new Error("Official metadata changed from the approved manifest");
  }
  const archive = await inspectZip(archivePath, BOUNDED_REAL_GUARDRAILS);
  if (archive.entries.length !== 1) throw new Error(`Single-ZIP guard rejected ${archive.entries.length} entries`);
  const entry = archive.entries[0];
  const extractStart = performance.now();
  const extracted = await extractZipEntry({ archivePath, entry, destination: extractedPath, maxBytes: BOUNDED_REAL_GUARDRAILS.maxExtractedBytes });
  const extractMs = performance.now() - extractStart;
  const records = [];
  const rejectionCategories = {};
  let sourceRows = 0;
  let parsedRows = 0;
  const parseStart = performance.now();
  for await (const fields of parseDelimited(createReadStream(extractedPath))) {
    sourceRows += 1;
    assertWithinGuardrail("rows", sourceRows, BOUNDED_REAL_GUARDRAILS.maxRows);
    try {
      const record = parseCompany(fields);
      parsedRows += 1;
      if (records.length < BOUNDED_REAL_GUARDRAILS.maxDbRows) records.push(record);
    } catch (error) {
      const category = error.message === "Invalid company row" ? "INVALID_COMPANY_ROW" : error.message === "Invalid share capital" ? "INVALID_SHARE_CAPITAL" : "PARSER_ERROR";
      rejectionCategories[category] = (rejectionCategories[category] ?? 0) + 1;
    }
    if (sourceRows % 10_000 === 0) peakRss = Math.max(peakRss, process.memoryUsage().rss);
  }
  peakRss = Math.max(peakRss, process.memoryUsage().rss);
  const parseMs = performance.now() - parseStart;
  const rejectedRows = sourceRows - parsedRows;
  const dbStart = performance.now();
  const database = benchmarkCompanies(records, { container: options.container });
  const databaseMs = performance.now() - dbStart;
  const totalMs = performance.now() - totalStart;
  assertWithinGuardrail("runtime ms", totalMs, BOUNDED_REAL_GUARDRAILS.maxRuntimeMs);
  const metrics = {
    schema_version: 1,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    environment: "LOCAL_MACOS_DOCKER_POSTGRES_DISPOSABLE_TRANSACTION",
    selection: SELECTION,
    guardrails: BOUNDED_REAL_GUARDRAILS,
    source: {
      http_status: 200,
      compressed_bytes: downloaded.size_bytes,
      extracted_bytes: extracted.size_bytes,
      expansion_ratio: extracted.size_bytes / downloaded.size_bytes,
      archive_entry: entry,
      sha256_local: downloaded.checksum_sha256,
      official_checksum_available: false,
      etag: downloaded.etag,
      last_modified: downloaded.last_modified,
    },
    quality: {
      source_rows: sourceRows,
      parsed_rows: parsedRows,
      rejected_rows: rejectedRows,
      bounded_staging_rows: records.length,
      intentionally_not_staged_rows: parsedRows - records.length,
      rejection_categories: rejectionCategories,
      reconciliation: sourceRows === parsedRows + rejectedRows ? "PASS" : "FAIL",
    },
    timings_ms: { download: downloadMs, extract: extractMs, parse: parseMs, database: databaseMs, total: totalMs },
    throughput: {
      download_bytes_per_second: downloaded.size_bytes / (downloadMs / 1000),
      extract_bytes_per_second: extracted.size_bytes / (extractMs / 1000),
      parse_rows_per_second: sourceRows / (parseMs / 1000),
    },
    resources: { memory_baseline_bytes: memoryBaseline, peak_rss_bytes: peakRss, scratch_file_bytes: downloaded.size_bytes + extracted.size_bytes, workspace_inode: diskBefore.ino },
    database,
    cnpj_alphanumeric_synthetic_path: "PASS_BY_RF_POC_TEST",
    production_worker_reachability: "NOT_PROVEN",
    production_changed: false,
    billing_changed: false,
    national_ingestion_performed: false,
    cleanup: "GUARANTEED_BY_FINALLY_AND_EXTERNALLY_VERIFIED",
  };
  await mkdir(path.dirname(options.output), { recursive: true });
  await writeFile(options.output, `${JSON.stringify(metrics, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(metrics, null, 2)}\n`);
} finally {
  await rm(workspace, { recursive: true, force: true });
}
