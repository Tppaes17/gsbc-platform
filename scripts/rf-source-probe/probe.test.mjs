import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ProbeError, buildManifest, classifyDatasetFile, classifyNetworkError,
  derivePublicDavUrl, normalizeAllowedUrl, parseListing, parseWebDavMultistatus,
  probeSource, requestLimited, sanitizeFilename,
} from "./probe-lib.mjs";

const OFFICIAL = "https://arquivos.receitafederal.gov.br/index.php/s/testToken";
const DAV_ROOT = "https://arquivos.receitafederal.gov.br/public.php/dav/files/testToken/";

function davXml(entries, prefix = "d") {
  return `<?xml version="1.0"?><${prefix}:multistatus xmlns:${prefix}="DAV:">${entries.map((entry) => `
    <${prefix}:response><${prefix}:href>${entry.href}</${prefix}:href><${prefix}:propstat><${prefix}:prop>
      <${prefix}:displayname>${entry.name || ""}</${prefix}:displayname>
      ${entry.directory ? `<${prefix}:resourcetype><${prefix}:collection/></${prefix}:resourcetype>` : `<${prefix}:resourcetype/>`}
      ${entry.size === undefined ? "" : `<${prefix}:getcontentlength>${entry.size}</${prefix}:getcontentlength>`}
      ${entry.modified === false ? "" : `<${prefix}:getlastmodified>Mon, 14 Sep 2026 15:00:00 GMT</${prefix}:getlastmodified>`}
      ${entry.etag === false ? "" : `<${prefix}:getetag>&quot;etag-${entry.name}&quot;</${prefix}:getetag>`}
      <${prefix}:getcontenttype>${entry.directory ? "" : "application/zip"}</${prefix}:getcontenttype>
    </${prefix}:prop><${prefix}:status>HTTP/1.1 200 OK</${prefix}:status></${prefix}:propstat></${prefix}:response>`).join("")}
  </${prefix}:multistatus>`;
}

test("allowlist and public DAV derivation", () => {
  assert.equal(normalizeAllowedUrl(OFFICIAL).hostname, "arquivos.receitafederal.gov.br");
  assert.equal(derivePublicDavUrl(OFFICIAL), DAV_ROOT);
  assert.throws(() => normalizeAllowedUrl("https://example.com/a"), { code: "DOMAIN_NOT_ALLOWED" });
  assert.throws(() => normalizeAllowedUrl("http://arquivos.receitafederal.gov.br/a"), { code: "HTTPS_REQUIRED" });
});

test("redirect, timeout and response limits remain enforced", async () => {
  await assert.rejects(() => requestLimited(OFFICIAL, { fetchImpl: async () => new Response(null, { status: 302, headers: { Location: "https://example.com/a" } }) }), { code: "DOMAIN_NOT_ALLOWED" });
  await assert.rejects(() => requestLimited(OFFICIAL, {
    fetchImpl: (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")))), timeoutMs: 10,
  }), { code: "TIMEOUT" });
  await assert.rejects(() => requestLimited(OFFICIAL, { fetchImpl: async () => new Response("0123456789ABCDEF"), maxBytes: 10 }), { code: "RESPONSE_TOO_LARGE" });
});

test("207 parser is namespace-prefix independent", () => {
  for (const prefix of ["d", "x", "DAV"]) {
    const parsed = parseWebDavMultistatus(davXml([{ href: `${DAV_ROOT}Empresas0.zip`, name: "Empresas0.zip", size: "42" }], prefix), { sourceUrl: DAV_ROOT });
    assert.equal(parsed.entries[0].name, "Empresas0.zip");
    assert.equal(parsed.entries[0].size_bytes, 42);
  }
});

test("directories are distinguished and encoded hrefs are decoded safely", () => {
  const parsed = parseWebDavMultistatus(davXml([
    { href: `${DAV_ROOT}2026-09/`, name: "2026-09", directory: true },
    { href: `${DAV_ROOT}Empresas%30.zip`, name: "Empresas0.zip", size: "42" },
  ]), { sourceUrl: DAV_ROOT });
  assert.equal(parsed.entries[0].is_directory, true);
  assert.equal(parsed.entries[1].name, "Empresas0.zip");
});

test("malformed XML, DTD, XXE, traversal and invalid encoding fail closed", () => {
  const options = { sourceUrl: DAV_ROOT };
  assert.throws(() => parseWebDavMultistatus("<d:multistatus><broken></d:multistatus>", options), { code: "MALFORMED_XML" });
  assert.throws(() => parseWebDavMultistatus('<!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><multistatus/>', options), { code: "UNSAFE_XML" });
  assert.throws(() => parseWebDavMultistatus(davXml([{ href: `${DAV_ROOT}../secret.zip`, name: "secret.zip", size: "1" }]), options), { code: "UNSAFE_HREF" });
  assert.throws(() => parseWebDavMultistatus(davXml([{ href: `${DAV_ROOT}%ZZ.zip`, name: "bad.zip", size: "1" }]), options), { code: "INVALID_HREF_ENCODING" });
});

test("official, reference and unknown files are classified", () => {
  const cases = [
    ["Empresas9.zip", "EMPRESAS"], ["Estabelecimentos0.zip", "ESTABELECIMENTOS"],
    ["Socios3.zip", "SOCIOS"], ["Simples.zip", "SIMPLES"], ["Cnaes.zip", "CNAES"],
    ["TabelaReference.zip", "OTHER_REFERENCE"], ["Unexpected.zip", "UNKNOWN"],
  ];
  for (const [name, expected] of cases) assert.equal(classifyDatasetFile(name), expected);
});

test("valid, absent and invalid sizes retain correct semantics", () => {
  const parsed = parseWebDavMultistatus(davXml([
    { href: `${DAV_ROOT}A.zip`, name: "A.zip", size: "10" },
    { href: `${DAV_ROOT}B.zip`, name: "B.zip" },
    { href: `${DAV_ROOT}C.zip`, name: "C.zip", size: "bad" },
  ]), { sourceUrl: DAV_ROOT });
  assert.deepEqual(parsed.entries.map((entry) => entry.size_bytes), [10, null, null]);
  assert.equal(parsed.quality_findings[0].code, "INVALID_SIZE");
});

test("manifest hash is deterministic across incidental order", () => {
  const files = [
    { name: "B.zip", href_original: "/B.zip", url: `${DAV_ROOT}B.zip`, classification: "UNKNOWN", size_bytes: 20, last_modified: null, etag: "b", official_checksum: null, media_type: "application/zip" },
    { name: "A.zip", href_original: "/A.zip", url: `${DAV_ROOT}A.zip`, classification: "UNKNOWN", size_bytes: 10, last_modified: null, etag: "a", official_checksum: null, media_type: "application/zip" },
  ];
  const first = buildManifest({ sourceUrl: OFFICIAL, files });
  const second = buildManifest({ sourceUrl: OFFICIAL, files: [...files].reverse() });
  assert.equal(first.manifest_hash, second.manifest_hash);
  assert.equal(first.total_compressed_bytes, 30);
  assert.deepEqual(first.files.map((file) => file.name), ["A.zip", "B.zip"]);
});

test("empty or incomplete inventory total is null, never zero", () => {
  assert.equal(buildManifest({ sourceUrl: OFFICIAL, files: [] }).total_compressed_bytes, null);
  const incomplete = buildManifest({ sourceUrl: OFFICIAL, files: [{ name: "A.zip", url: `${DAV_ROOT}A.zip`, size_bytes: null }] });
  assert.equal(incomplete.total_compressed_bytes, null);
  assert.equal(incomplete.sizing_complete, false);
});

test("HTML listing remains explicit and unsupported listing fails closed", () => {
  const html = parseListing('<a href="/A.zip">A.zip</a>', { contentType: "text/html", sourceUrl: OFFICIAL });
  assert.equal(html.listing_type, "HTML_LISTING");
  assert.equal(html.files.length, 1);
  assert.throws(() => parseListing("opaque", { contentType: "application/octet-stream", sourceUrl: OFFICIAL }), { code: "UNSUPPORTED_LISTING" });
  assert.throws(() => parseListing("{broken", { contentType: "application/json", sourceUrl: OFFICIAL }), { code: "MALFORMED_LISTING" });
});

test("unsafe filenames are rejected", () => {
  for (const name of ["../file.zip", "folder/file.zip", "folder\\file.zip", "bad\u0000.zip"]) assert.throws(() => sanitizeFilename(name), ProbeError);
});

test("structured network causes are classified", () => {
  const cases = [["ECONNRESET", "TCP_RESET"], ["ETIMEDOUT", "TIMEOUT"], ["ENOTFOUND", "DNS"], ["ECONNREFUSED", "CONNECTION_REFUSED"], ["ERR_TLS_CERT_ALTNAME_INVALID", "TLS"]];
  for (const [code, expected] of cases) {
    const error = new ProbeError("NETWORK_FAILURE", "fetch failed", {}, { cause: Object.assign(new Error("cause"), { code }) });
    assert.equal(classifyNetworkError(error), expected);
  }
});

test("full WebDAV discovery verifies a stable current-period manifest", async () => {
  const rootXml = davXml([
    { href: DAV_ROOT, name: "testToken", directory: true },
    { href: `${DAV_ROOT}2026-08/`, name: "2026-08", directory: true },
    { href: `${DAV_ROOT}2026-09/`, name: "2026-09", directory: true },
  ]);
  const periodXml = davXml([
    { href: `${DAV_ROOT}2026-09/`, name: "2026-09", directory: true },
    { href: `${DAV_ROOT}2026-09/Empresas0.zip`, name: "Empresas0.zip", size: "42" },
  ]);
  const fakeFetch = async (url, options) => {
    if (["HEAD", "OPTIONS"].includes(options.method)) return new Response(null, { status: 200 });
    if (options.method === "GET") return new Response("<html></html>", { status: 200, headers: { "Content-Type": "text/html" } });
    return new Response(String(url).endsWith("2026-09/") ? periodXml : rootXml, { status: 207, headers: { "Content-Type": "application/xml" } });
  };
  const result = await probeSource({ endpoint: OFFICIAL, fetchImpl: fakeFetch });
  assert.equal(result.probe.source_status, "VERIFIED");
  assert.equal(result.probe.inventory_stability, "STABLE");
  assert.equal(result.manifest.reference_period, "2026-09");
  assert.equal(result.manifest.total_compressed_bytes, 42);
});

test("network failure preserves cause and does not claim verification", async () => {
  const error = Object.assign(new TypeError("fetch failed"), { cause: Object.assign(new Error("reset"), { code: "ECONNRESET" }) });
  const result = await probeSource({ endpoint: OFFICIAL, fetchImpl: async () => { throw error; } });
  assert.equal(result.probe.source_status, "NOT_VERIFIED");
  assert.ok(result.probe.attempts.every((item) => item.failure_class === "TCP_RESET"));
});
