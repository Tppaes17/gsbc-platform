import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ProbeError,
  buildManifest,
  normalizeAllowedUrl,
  parseListing,
  probeSource,
  requestLimited,
  sanitizeFilename,
} from "./probe-lib.mjs";

const OFFICIAL = "https://arquivos.receitafederal.gov.br/index.php/s/test";

test("accepts an allowlisted official HTTPS endpoint", () => {
  assert.equal(normalizeAllowedUrl(OFFICIAL).hostname, "arquivos.receitafederal.gov.br");
});

test("rejects forbidden domains and non-HTTPS endpoints", () => {
  assert.throws(() => normalizeAllowedUrl("https://example.com/file.zip"), { code: "DOMAIN_NOT_ALLOWED" });
  assert.throws(() => normalizeAllowedUrl("http://arquivos.receitafederal.gov.br/file.zip"), { code: "HTTPS_REQUIRED" });
});

test("blocks redirects outside the official allowlist", async () => {
  const fakeFetch = async () => new Response(null, {
    status: 302,
    headers: { Location: "https://example.com/mirror.zip" },
  });
  await assert.rejects(() => requestLimited(OFFICIAL, { fetchImpl: fakeFetch }), {
    code: "DOMAIN_NOT_ALLOWED",
  });
});

test("enforces request timeout", async () => {
  const fakeFetch = (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
  });
  await assert.rejects(() => requestLimited(OFFICIAL, {
    fetchImpl: fakeFetch,
    timeoutMs: 20,
  }), { code: "TIMEOUT" });
});

test("rejects declared and streamed responses above the byte limit", async () => {
  const declared = async () => new Response("small", {
    status: 200,
    headers: { "Content-Length": "9999" },
  });
  await assert.rejects(() => requestLimited(OFFICIAL, {
    fetchImpl: declared,
    maxBytes: 10,
  }), { code: "RESPONSE_TOO_LARGE" });

  const streamed = async () => new Response("0123456789ABCDEF", { status: 200 });
  await assert.rejects(() => requestLimited(OFFICIAL, {
    fetchImpl: streamed,
    maxBytes: 10,
  }), { code: "RESPONSE_TOO_LARGE" });
});

test("rejects malformed listing JSON", () => {
  assert.throws(() => parseListing("{broken", {
    contentType: "application/json",
    sourceUrl: OFFICIAL,
  }), { code: "MALFORMED_LISTING" });
});

test("rejects malicious filenames", () => {
  for (const value of ["../file.zip", "folder/file.zip", "folder\\file.zip", "bad\u0000.zip"]) {
    assert.throws(() => sanitizeFilename(value), ProbeError);
  }
});

test("manifest hash is deterministic and observation timestamps are excluded", () => {
  const files = [
    { name: "B.zip", url: "https://arquivos.receitafederal.gov.br/B.zip", size_bytes: 20, last_modified: null, etag: "b", checksum: null, media_type: "ZIP" },
    { name: "A.zip", url: "https://arquivos.receitafederal.gov.br/A.zip", size_bytes: 10, last_modified: null, etag: "a", checksum: null, media_type: "ZIP" },
  ];
  const first = buildManifest({ sourceUrl: OFFICIAL, files });
  const second = buildManifest({ sourceUrl: OFFICIAL, files: [...files].reverse() });
  assert.equal(first.manifest_sha256, second.manifest_sha256);
  assert.equal(first.total_compressed_bytes, 30);
  assert.deepEqual(first.files.map((file) => file.name), ["A.zip", "B.zip"]);
});

test("metadata absence is classified as requiring local hashes", () => {
  const manifest = buildManifest({
    sourceUrl: OFFICIAL,
    files: [{ name: "A.zip", url: "https://arquivos.receitafederal.gov.br/A.zip", size_bytes: null, last_modified: null, etag: null, checksum: null, media_type: "ZIP" }],
  });
  assert.equal(manifest.integrity_metadata, "LOCAL_HASH_REQUIRED");
  assert.equal(manifest.total_compressed_bytes, null);
});

test("network failure is recorded without claiming the source is unavailable", async () => {
  const fakeFetch = async () => {
    throw new TypeError("connection reset by peer");
  };
  const result = await probeSource({ endpoint: OFFICIAL, fetchImpl: fakeFetch });
  assert.equal(result.probe.source_status, "NOT_VERIFIED");
  assert.equal(result.probe.attempts.length, 3);
  assert.ok(result.probe.attempts.every((attempt) => attempt.failure_class === "TCP_RESET"));
});

test("bounded JSON listing produces a verified metadata manifest", async () => {
  const body = JSON.stringify({
    files: [
      { name: "2026-09_Empresas0.zip", url: "https://arquivos.receitafederal.gov.br/2026-09_Empresas0.zip", size: 42, etag: "etag-1" },
    ],
  });
  const fakeFetch = async (_url, options) => {
    if (options.method === "HEAD" || options.method === "OPTIONS") return new Response(null, { status: 200 });
    return new Response(body, { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const result = await probeSource({ endpoint: OFFICIAL, fetchImpl: fakeFetch });
  assert.equal(result.probe.source_status, "VERIFIED");
  assert.equal(result.manifest.reference_period, "2026-09");
  assert.equal(result.manifest.file_count, 1);
});

test("listing file limit is enforced", () => {
  const body = JSON.stringify({
    files: [
      { name: "A.zip", url: "https://arquivos.receitafederal.gov.br/A.zip" },
      { name: "B.zip", url: "https://arquivos.receitafederal.gov.br/B.zip" },
    ],
  });
  assert.throws(() => parseListing(body, {
    contentType: "application/json",
    sourceUrl: OFFICIAL,
    maxFiles: 1,
  }), { code: "TOO_MANY_FILES" });
});
