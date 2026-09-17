import { createReadStream } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";

import { extractZipEntry, listZipEntries } from "./archive.mjs";
import { benchmarkDatabase } from "./db-benchmark.mjs";
import { downloadFile } from "./downloader.mjs";
import { DEFAULT_GUARDRAILS, assertWithinGuardrail } from "./guardrails.mjs";
import { createManifest } from "./manifest.mjs";
import { parseCnae, parseDelimited } from "./parser.mjs";
import { reconcileQuality } from "./quality.mjs";
import { storagePath } from "./storage.mjs";

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--allow-unverified-source") values.allowUnverifiedSource = true;
    else if (arg.startsWith("--")) values[arg.slice(2)] = argv[++index];
  }
  return values;
}

const args = parseArgs(process.argv.slice(2));
if (!args.url || !args["dataset-version"] || !args.output) {
  throw new Error("Usage: node run.mjs --url <sample.zip> --dataset-version <version> --output <metrics.json> --allow-unverified-source");
}
if (!args.allowUnverifiedSource) {
  throw new Error("This controlled POC source is not authoritative; pass --allow-unverified-source to acknowledge that limitation");
}
const parsedUrl = new URL(args.url);
if (parsedUrl.protocol !== "https:") throw new Error("POC download requires HTTPS");

const startedAt = new Date().toISOString();
const started = performance.now();
const workspace = await mkdtemp(path.join(os.tmpdir(), "rf03a-poc-"));
const rawPath = path.join(workspace, "Cnaes.zip");
const extractedPath = path.join(workspace, "Cnaes.csv");

try {
  const downloadStart = performance.now();
  const firstDownload = await downloadFile({
    url: args.url,
    destination: rawPath,
    maxBytes: DEFAULT_GUARDRAILS.maxCompressedBytes,
  });
  const downloadMs = performance.now() - downloadStart;
  const secondDownload = await downloadFile({
    url: args.url,
    destination: rawPath,
    maxBytes: DEFAULT_GUARDRAILS.maxCompressedBytes,
  });

  const entries = await listZipEntries(rawPath);
  assertWithinGuardrail("files", entries.length, DEFAULT_GUARDRAILS.maxFiles);
  const csvEntry = entries.find((entry) => !entry.endsWith("/"));
  if (!csvEntry) throw new Error("ZIP has no data entry");

  const extractStart = performance.now();
  const extracted = await extractZipEntry({
    archivePath: rawPath,
    entry: csvEntry,
    destination: extractedPath,
    maxBytes: DEFAULT_GUARDRAILS.maxExtractedBytes,
  });
  const extractMs = performance.now() - extractStart;

  const parseStart = performance.now();
  const records = [];
  const rejectionCategories = {};
  let sourceRows = 0;
  for await (const fields of parseDelimited(createReadStream(extractedPath))) {
    sourceRows += 1;
    assertWithinGuardrail("rows", sourceRows, DEFAULT_GUARDRAILS.maxRows);
    try {
      records.push(parseCnae(fields));
    } catch (error) {
      const category = error.message === "Invalid CNAE row" ? "INVALID_CNAE_ROW" : "PARSER_ERROR";
      rejectionCategories[category] = (rejectionCategories[category] ?? 0) + 1;
    }
  }
  const parseMs = performance.now() - parseStart;

  const manifest = createManifest({
    datasetVersion: args["dataset-version"],
    source: "UNVERIFIED_CASA_DOS_DADOS_MIRROR_POC",
    files: [{
      identifier: "Cnaes.zip",
      type: "CNAE",
      sourceUrl: args.url,
      sizeBytes: firstDownload.size_bytes,
      etag: firstDownload.etag,
      lastModified: firstDownload.last_modified,
      checksumSha256: firstDownload.checksum_sha256,
      integritySource: "local-sha256-no-official-checksum",
    }],
  });

  const dbStart = performance.now();
  const database = benchmarkDatabase(records, {
    maxRows: DEFAULT_GUARDRAILS.maxDbRows,
    container: args.container,
  });
  const dbMs = performance.now() - dbStart;
  const totalMs = performance.now() - started;
  assertWithinGuardrail("runtime ms", totalMs, DEFAULT_GUARDRAILS.maxRuntimeMs);

  const reconciliation = reconcileQuality({
    sourceRows,
    parsedRecords: records,
    rejectedRows: sourceRows - records.length,
    expectedFiles: 1,
    discoveredFiles: entries.length,
  });
  const metrics = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    started_at: startedAt,
    source_authority: "UNVERIFIED MIRROR - NOT ACCEPTABLE FOR PRODUCTION",
    official_source_direct_validation: "FAILED_FROM_EXECUTION_ENVIRONMENT",
    dataset_version: args["dataset-version"],
    guardrails: DEFAULT_GUARDRAILS,
    source: {
      url: args.url,
      compressed_bytes: firstDownload.size_bytes,
      extracted_bytes: extracted.size_bytes,
      archive_entries: entries,
      sha256: firstDownload.checksum_sha256,
      etag: firstDownload.etag,
      last_modified: firstDownload.last_modified,
      official_checksum_available: false,
    },
    storage_contract: {
      raw: storagePath(args["dataset-version"], "raw", "Cnaes.zip"),
      extracted: storagePath(args["dataset-version"], "extracted", "Cnaes.csv"),
      manifest: storagePath(args["dataset-version"], "manifest", "manifest.json"),
      logs: storagePath(args["dataset-version"], "logs", "poc.json"),
    },
    manifest,
    quality: {
      source_rows: sourceRows,
      parsed_rows: records.length,
      rejected_rows: sourceRows - records.length,
      rejection_categories: rejectionCategories,
      duplicate_keys: reconciliation.duplicate_keys,
      checksum: "PASS_LOCAL_ONLY",
      row_reconciliation: reconciliation.status,
    },
    timings_ms: {
      download: Number(downloadMs.toFixed(3)),
      extract: Number(extractMs.toFixed(3)),
      parse: Number(parseMs.toFixed(3)),
      database: Number(dbMs.toFixed(3)),
      total: Number(totalMs.toFixed(3)),
    },
    throughput: {
      download_bytes_per_second: Math.round(firstDownload.size_bytes / (downloadMs / 1000)),
      extract_bytes_per_second: Math.round(extracted.size_bytes / (extractMs / 1000)),
      parse_rows_per_second: Math.round(sourceRows / (parseMs / 1000)),
    },
    database,
    idempotency: {
      download_second_run_reused_marker: secondDownload.reused,
      manifest_hash_stable: manifest.manifest_hash === createManifest({
        datasetVersion: args["dataset-version"],
        source: "UNVERIFIED_CASA_DOS_DADOS_MIRROR_POC",
        files: [{
          identifier: "Cnaes.zip", type: "CNAE", sourceUrl: args.url,
          sizeBytes: firstDownload.size_bytes, etag: firstDownload.etag,
          lastModified: firstDownload.last_modified,
          checksumSha256: firstDownload.checksum_sha256,
          integritySource: "local-sha256-no-official-checksum",
        }],
        discoveredAt: "2000-01-01T00:00:00.000Z",
      }).manifest_hash,
      database: database.idempotency,
    },
    cleanup: database.rollback_cleanup,
  };

  await mkdir(path.dirname(args.output), { recursive: true });
  await writeFile(args.output, `${JSON.stringify(metrics, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(metrics, null, 2)}\n`);
} finally {
  await rm(workspace, { recursive: true, force: true });
}
