import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";

import { inspectZip, validateArchiveEntries } from "./archive.mjs";
import { downloadFile } from "./downloader.mjs";
import { createManifest } from "./manifest.mjs";
import {
  parseCompany,
  parseDelimited,
  parseEstablishment,
  parsePartner,
  parseSimples,
} from "./parser.mjs";
import { storagePath } from "./storage.mjs";
import { reconcileQuality } from "./quality.mjs";
import { assertWithinGuardrail } from "./guardrails.mjs";

test("manifest hash is deterministic and ignores discovery timestamp", () => {
  const input = {
    datasetVersion: "2026-04",
    source: "UNVERIFIED_MIRROR_POC",
    files: [{ identifier: "Cnaes.zip", type: "CNAE", sourceUrl: "https://example.test/Cnaes.zip" }],
  };
  const first = createManifest({ ...input, discoveredAt: "2026-09-17T10:00:00Z" });
  const second = createManifest({ ...input, discoveredAt: "2026-09-17T11:00:00Z" });
  assert.equal(first.manifest_hash, second.manifest_hash);
});

test("streaming parser preserves delimiters, quotes and line breaks", async () => {
  const chunks = [Buffer.from('"1234567";"SERVI'), Buffer.from('CO; TESTE"\r\n"7654321";"A""B"\n')];
  const rows = [];
  for await (const row of parseDelimited(Readable.from(chunks), { encoding: "utf8" })) rows.push(row);
  assert.deepEqual(rows, [["1234567", "SERVICO; TESTE"], ["7654321", 'A"B']]);
});

test("CNPJ parsing preserves numeric zeros and alphanumeric characters", () => {
  const numeric = parseCompany(["00000000", "BANCO TESTE", "2038", "10", "1,00", "05", ""]);
  const alpha = parseCompany(["00ABC000", "EMPRESA ALFA", "2062", "49", "2,50", "01", ""]);
  assert.equal(numeric.cnpj_root, "00000000");
  assert.equal(alpha.cnpj_root, "00ABC000");

  const fields = Array(30).fill("");
  Object.assign(fields, { 0: "00ABC000", 1: "E08G", 2: "12", 3: "1", 4: "MATRIZ", 5: "02", 6: "20260731", 10: "20260731", 11: "6201501", 12: "6202300,6203100", 19: "SP", 20: "7107" });
  const establishment = parseEstablishment(fields);
  assert.equal(establishment.cnpj_canonical, "00ABC000E08G12");
  assert.deepEqual(establishment.secondary_cnae_codes, ["6202300", "6203100"]);
});

test("partner parser preserves masked documents without reconstruction", () => {
  const parsed = parsePartner(["00000000", "2", "PESSOA TESTE", "***123456**", "49", "20200101", "", "***987654**", "REPRESENTANTE", "05", "5"]);
  assert.equal(parsed.partner_document_masked, "***123456**");
  assert.equal(parsed.legal_representative_document_masked, "***987654**");
});

test("Simples parser maps tri-state flags and dates", () => {
  const parsed = parseSimples(["00000000", "S", "20200101", "", "N", "", ""]);
  assert.equal(parsed.simples_option, true);
  assert.equal(parsed.mei_option, false);
  assert.equal(parsed.simples_option_start_date, "2020-01-01");
});

test("quality gate rejects malformed rows, duplicates and incomplete datasets", () => {
  assert.throws(() => parseCompany(["123", "INVALID"]), /Invalid company row/);
  const result = reconcileQuality({
    sourceRows: 3,
    parsedRecords: [{ code: "0111301" }, { code: "0111301" }],
    rejectedRows: 1,
    expectedFiles: 2,
    discoveredFiles: 1,
  });
  assert.equal(result.status, "FAIL");
  assert.deepEqual(result.reasons, ["DUPLICATE_KEY", "INCOMPLETE_DATASET"]);
});

test("archive and storage paths reject traversal", () => {
  assert.throws(() => validateArchiveEntries(["../escape.csv"]), /Unsafe archive entry/);
  assert.throws(() => storagePath("2026-04", "raw", "../escape.zip"), /Invalid RF storage filename/);
  assert.equal(storagePath("2026-04", "raw", "Cnaes.zip"), "rfb-cnpj/2026-04/raw/Cnaes.zip");
});

test("downloader fails closed on checksum mismatch and can retry interrupted responses", async () => {
  const { mkdtemp, readFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir = await mkdtemp(join(tmpdir(), "rf-poc-download-"));
  const destination = join(dir, "sample.bin");
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    if (calls === 1) throw new Error("injected network interruption");
    return new Response("sample-data", { status: 200, headers: { "content-length": "11" } });
  };
  try {
    const result = await downloadFile({ url: "https://example.test/sample", destination, maxBytes: 32, attempts: 2, fetchImpl });
    assert.equal(calls, 2);
    assert.equal(await readFile(destination, "utf8"), "sample-data");
    assert.equal(result.size_bytes, 11);
    await assert.rejects(
      downloadFile({ url: "https://example.test/bad", destination: join(dir, "bad.bin"), maxBytes: 32, attempts: 1, expectedSha256: "0".repeat(64), fetchImpl: async () => new Response("bad") }),
      /Checksum mismatch/,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("downloader enforces official host, redirects and declared length", async () => {
  const { mkdtemp, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir = await mkdtemp(join(tmpdir(), "rf-poc-bounds-"));
  try {
    await assert.rejects(
      downloadFile({ url: "https://evil.test/file.zip", destination: join(dir, "host.zip"), maxBytes: 32, allowedHosts: ["official.test"] }),
      /not allowlisted/,
    );
    await assert.rejects(
      downloadFile({
        url: "https://official.test/file.zip", destination: join(dir, "redirect.zip"), maxBytes: 32,
        allowedHosts: ["official.test"], attempts: 1,
        fetchImpl: async () => new Response(null, { status: 302, headers: { location: "https://evil.test/file.zip" } }),
      }),
      /Unsafe download redirect/,
    );
    await assert.rejects(
      downloadFile({
        url: "https://official.test/file.zip", destination: join(dir, "length.zip"), maxBytes: 32,
        expectedBytes: 12, allowedHosts: ["official.test"], attempts: 1,
        fetchImpl: async () => new Response("elevenbytes", { headers: { "content-length": "11" } }),
      }),
      /Content-Length mismatch/,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("archive inspection rejects corruption, truncation and symlinks", async () => {
  const { mkdtemp, writeFile, truncate, symlink, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { spawnSync } = await import("node:child_process");
  const dir = await mkdtemp(join(tmpdir(), "rf-poc-archives-"));
  try {
    const corrupted = join(dir, "corrupted.zip");
    await writeFile(corrupted, "not-a-zip");
    await assert.rejects(inspectZip(corrupted, { maxFiles: 1, maxExtractedBytes: 1024, maxExpansionRatio: 10 }));

    await writeFile(join(dir, "data.csv"), "a;b\n");
    const valid = join(dir, "valid.zip");
    assert.equal(spawnSync("zip", ["-q", valid, "data.csv"], { cwd: dir }).status, 0);
    const truncated = join(dir, "truncated.zip");
    await writeFile(truncated, await (await import("node:fs/promises")).readFile(valid));
    await truncate(truncated, 24);
    await assert.rejects(inspectZip(truncated, { maxFiles: 1, maxExtractedBytes: 1024, maxExpansionRatio: 10 }));

    await symlink(join(dir, "data.csv"), join(dir, "link.csv"));
    const linked = join(dir, "linked.zip");
    assert.equal(spawnSync("zip", ["-qy", linked, "link.csv"], { cwd: dir }).status, 0);
    await assert.rejects(inspectZip(linked, { maxFiles: 1, maxExtractedBytes: 1024, maxExpansionRatio: 10 }), /symbolic link/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("malformed streaming input and simulated insufficient capacity fail closed", async () => {
  await assert.rejects(async () => {
    for await (const row of parseDelimited(Readable.from([Buffer.from('"unterminated')]), { encoding: "utf8" })) {
      assert.fail(`Malformed input unexpectedly produced ${JSON.stringify(row)}`);
    }
  }, /Unterminated quoted field/);
  assert.throws(() => assertWithinGuardrail("available disk", 101, 100), /Guardrail exceeded/);
});
