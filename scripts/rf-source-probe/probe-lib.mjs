import { createHash } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { performance } from "node:perf_hooks";

export const DEFAULT_ALLOWED_HOSTS = Object.freeze([
  "arquivos.receitafederal.gov.br", "dados.gov.br", "www.gov.br",
]);
export const LISTING_TYPES = Object.freeze({
  HTML: "HTML_LISTING", WEBDAV: "WEBDAV_MULTISTATUS", UNSUPPORTED: "UNSUPPORTED_LISTING",
});

const PROPFIND_BODY = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:"><d:prop><d:displayname/><d:getcontentlength/><d:getlastmodified/><d:getetag/><d:getcontenttype/><d:resourcetype/><d:quota-used-bytes/></d:prop></d:propfind>`;
const CLASSIFIERS = [
  ["Empresas", "EMPRESAS"], ["Estabelecimentos", "ESTABELECIMENTOS"],
  ["Socios", "SOCIOS"], ["Simples", "SIMPLES"], ["Cnaes", "CNAES"],
  ["Municipios", "MUNICIPIOS"], ["Naturezas", "NATUREZAS"], ["Paises", "PAISES"],
  ["Qualificacoes", "QUALIFICACOES"], ["Motivos", "MOTIVOS"],
];

export class ProbeError extends Error {
  constructor(code, message, details = {}, options = {}) {
    super(message, options);
    this.name = "ProbeError";
    this.code = code;
    this.details = details;
  }
}

export function normalizeAllowedUrl(value, allowedHosts = DEFAULT_ALLOWED_HOSTS) {
  let url;
  try { url = new URL(value); } catch { throw new ProbeError("INVALID_URL", `Invalid URL: ${value}`); }
  if (url.protocol !== "https:") throw new ProbeError("HTTPS_REQUIRED", `Only HTTPS is allowed: ${url.href}`);
  if (!allowedHosts.map((host) => host.toLowerCase()).includes(url.hostname.toLowerCase())) {
    throw new ProbeError("DOMAIN_NOT_ALLOWED", `Domain is not allowlisted: ${url.hostname}`);
  }
  url.username = "";
  url.password = "";
  return url;
}

function strictDecode(value, code = "INVALID_ENCODING") {
  try { return decodeURIComponent(value); } catch {
    throw new ProbeError(code, `Invalid percent encoding: ${JSON.stringify(value)}`);
  }
}

export function sanitizeFilename(value) {
  if (typeof value !== "string") throw new ProbeError("INVALID_FILENAME", "Filename must be a string");
  const decoded = strictDecode(value, "INVALID_FILENAME_ENCODING").normalize("NFC").trim();
  if (!decoded || decoded.length > 255 || decoded === "." || decoded === ".."
    || decoded.includes("/") || decoded.includes("\\") || /[\u0000-\u001f\u007f]/u.test(decoded)) {
    throw new ProbeError("UNSAFE_FILENAME", `Unsafe filename rejected: ${JSON.stringify(value)}`);
  }
  return decoded;
}

function headerObject(headers) {
  const allowed = new Set(["accept-ranges", "content-length", "content-type", "date", "etag", "last-modified", "location"]);
  return Object.fromEntries([...headers.entries()].filter(([name]) => allowed.has(name.toLowerCase())));
}

async function readLimitedBody(response, maxBytes) {
  if (!response.body) return Buffer.alloc(0);
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new ProbeError("RESPONSE_TOO_LARGE", "Response exceeds configured byte limit", { declared, maxBytes });
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel("byte limit exceeded");
      throw new ProbeError("RESPONSE_TOO_LARGE", "Stream exceeds configured byte limit", { observed: total, maxBytes });
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, total);
}

export async function requestLimited(input, {
  method = "GET", headers = {}, body, fetchImpl = fetch, timeoutMs = 15_000,
  maxBytes = 2_097_152, maxRedirects = 3, allowedHosts = DEFAULT_ALLOWED_HOSTS,
} = {}) {
  let current = normalizeAllowedUrl(input, allowedHosts);
  const redirectChain = [];
  for (let count = 0; count <= maxRedirects; count += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = performance.now();
    let response;
    try {
      response = await fetchImpl(current, {
        method, body, redirect: "manual", signal: controller.signal,
        headers: {
          Accept: "text/html,application/json,application/xml,text/xml;q=0.9,*/*;q=0.5",
          "User-Agent": "GSBC-RF-Source-Probe/2.0 (+read-only metadata probe)", ...headers,
        },
      });
    } catch (error) {
      clearTimeout(timer);
      if (error?.name === "AbortError") {
        throw new ProbeError("TIMEOUT", `Request timed out after ${timeoutMs} ms`, { url: current.href, method }, { cause: error });
      }
      throw new ProbeError("NETWORK_FAILURE", error?.message || "Network request failed", { url: current.href, method }, { cause: error });
    }
    clearTimeout(timer);
    const latency = Math.round((performance.now() - startedAt) * 100) / 100;
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new ProbeError("INVALID_REDIRECT", "Redirect response has no Location header");
      if (count === maxRedirects) throw new ProbeError("TOO_MANY_REDIRECTS", "Redirect limit exceeded");
      const target = normalizeAllowedUrl(new URL(location, current).href, allowedHosts);
      redirectChain.push({ from: current.href, status: response.status, to: target.href });
      current = target;
      continue;
    }
    const responseBody = method === "HEAD" ? Buffer.alloc(0) : await readLimitedBody(response, maxBytes);
    return {
      url: current.href, method, status: response.status, ok: response.ok, latency_ms: latency,
      headers: headerObject(response.headers), bytes_read: responseBody.byteLength,
      redirect_chain: redirectChain, body: responseBody,
    };
  }
  throw new ProbeError("TOO_MANY_REDIRECTS", "Redirect limit exceeded");
}

function numericSize(value) {
  if (value === null || value === undefined || value === "") return null;
  if (!/^\d+$/u.test(String(value).trim())) return null;
  const size = Number(value);
  return Number.isSafeInteger(size) && size >= 0 ? size : null;
}

function filenameFromUrl(url) {
  const candidate = basename(new URL(url).pathname);
  return candidate ? sanitizeFilename(candidate) : null;
}

export function classifyDatasetFile(name) {
  for (const [prefix, classification] of CLASSIFIERS) {
    if (new RegExp(`^${prefix}\\d*\\.zip$`, "iu").test(name)) return classification;
  }
  if (/\.zip$/iu.test(name) && /(?:lookup|reference|tabela|dominio)/iu.test(name)) return "OTHER_REFERENCE";
  return "UNKNOWN";
}

function normalizeFile(item, sourceUrl, allowedHosts) {
  const rawUrl = item.url || item.href || item.download_url || item.downloadUrl;
  if (!rawUrl) return null;
  const url = normalizeAllowedUrl(new URL(rawUrl, sourceUrl).href, allowedHosts);
  const rawName = item.filename || item.name || item.title || filenameFromUrl(url.href);
  if (!rawName) return null;
  const name = sanitizeFilename(rawName);
  return {
    name, href_original: item.href_original ?? item.href ?? rawUrl, url: url.href,
    classification: item.classification ?? classifyDatasetFile(name),
    size_bytes: numericSize(item.size_bytes ?? item.size ?? item.content_length),
    last_modified: item.last_modified ?? item.lastModified ?? null,
    etag: item.etag ?? null,
    official_checksum: item.official_checksum ?? item.checksum ?? item.hash ?? null,
    media_type: item.media_type ?? item.mimetype ?? item.type ?? item.format ?? null,
  };
}

function decodeXmlText(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/giu, (_entity, token) => {
    const named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
    const lower = token.toLowerCase();
    if (named[lower]) return named[lower];
    const point = lower.startsWith("#x") ? Number.parseInt(lower.slice(2), 16) : Number.parseInt(lower.slice(1), 10);
    try { return String.fromCodePoint(point); } catch { throw new ProbeError("MALFORMED_XML", "Invalid numeric XML entity"); }
  }).replace(/&[^;\s]+;/gu, () => { throw new ProbeError("MALFORMED_XML", "Unknown XML entity rejected"); });
}

function localName(name) { return name.split(":").at(-1).toLowerCase(); }

function parseXmlDocument(input, { maxNodes = 10_000, maxDepth = 64 } = {}) {
  const xml = Buffer.isBuffer(input) ? input.toString("utf8") : String(input ?? "");
  if (/<!DOCTYPE|<!ENTITY/iu.test(xml)) throw new ProbeError("UNSAFE_XML", "DTD and entity declarations are forbidden");
  const document = { name: "#document", local: "#document", text: "", children: [] };
  const stack = [document];
  let nodes = 0;
  let cursor = 0;
  const appendText = (value) => { if (value) stack.at(-1).text += decodeXmlText(value); };
  while (cursor < xml.length) {
    const next = xml.indexOf("<", cursor);
    if (next === -1) { appendText(xml.slice(cursor)); cursor = xml.length; break; }
    appendText(xml.slice(cursor, next));
    cursor = next;
    if (xml.startsWith("<!--", cursor)) {
      const end = xml.indexOf("-->", cursor + 4);
      if (end === -1) throw new ProbeError("MALFORMED_XML", "Unterminated XML comment");
      cursor = end + 3; continue;
    }
    if (xml.startsWith("<![CDATA[", cursor)) {
      const end = xml.indexOf("]]>", cursor + 9);
      if (end === -1) throw new ProbeError("MALFORMED_XML", "Unterminated CDATA section");
      stack.at(-1).text += xml.slice(cursor + 9, end); cursor = end + 3; continue;
    }
    if (xml.startsWith("<?", cursor)) {
      const end = xml.indexOf("?>", cursor + 2);
      if (end === -1) throw new ProbeError("MALFORMED_XML", "Unterminated processing instruction");
      if (!/^<\?xml(?:\s|\?)/iu.test(xml.slice(cursor, end + 2))) throw new ProbeError("UNSAFE_XML", "Processing instructions are forbidden");
      cursor = end + 2; continue;
    }
    if (xml.startsWith("<!", cursor)) throw new ProbeError("UNSAFE_XML", "Unsupported XML declaration");
    let end = cursor + 1;
    let quote = null;
    for (; end < xml.length; end += 1) {
      const char = xml[end];
      if (quote) { if (char === quote) quote = null; }
      else if (char === '"' || char === "'") quote = char;
      else if (char === ">") break;
    }
    if (end >= xml.length || quote) throw new ProbeError("MALFORMED_XML", "Unterminated XML tag");
    const token = xml.slice(cursor, end + 1);
    cursor = end + 1;
    const closing = token.match(/^<\/\s*([A-Za-z_][\w.:-]*)\s*>$/u);
    if (closing) {
      if (stack.length === 1 || stack.at(-1).name !== closing[1]) throw new ProbeError("MALFORMED_XML", "Mismatched XML closing tag");
      stack.pop(); continue;
    }
    const opening = token.match(/^<\s*([A-Za-z_][\w.:-]*)(?:\s[\s\S]*?)?\s*(\/?)>$/u);
    if (!opening) throw new ProbeError("MALFORMED_XML", "Malformed XML tag");
    const node = { name: opening[1], local: localName(opening[1]), text: "", children: [] };
    stack.at(-1).children.push(node);
    nodes += 1;
    if (nodes > maxNodes) throw new ProbeError("XML_LIMIT_EXCEEDED", "XML node limit exceeded");
    if (!opening[2]) {
      stack.push(node);
      if (stack.length > maxDepth) throw new ProbeError("XML_LIMIT_EXCEEDED", "XML depth limit exceeded");
    }
  }
  if (stack.length !== 1) throw new ProbeError("MALFORMED_XML", "Unclosed XML tag");
  if (document.children.length !== 1) throw new ProbeError("MALFORMED_XML", "XML must contain exactly one root element");
  return document.children[0];
}

const children = (node, name) => node.children.filter((child) => child.local === name);
const firstChild = (node, name) => children(node, name)[0] ?? null;
function descendants(node, name) {
  return node.children.flatMap((child) => [...(child.local === name ? [child] : []), ...descendants(child, name)]);
}
const textOf = (node) => node ? node.text.trim() : null;

function normalizeDavHref(rawHref, baseUrl, allowedHosts) {
  if (!rawHref) throw new ProbeError("MALFORMED_WEBDAV", "WebDAV response has no href");
  const decoded = strictDecode(rawHref, "INVALID_HREF_ENCODING").normalize("NFC");
  const rawPath = decoded.replace(/^[a-z][a-z\d+.-]*:\/\/[^/]+/iu, "").split(/[?#]/u, 1)[0];
  if (rawPath.split("/").some((part) => part === "." || part === "..")) {
    throw new ProbeError("UNSAFE_HREF", `Path traversal rejected: ${JSON.stringify(rawHref)}`);
  }
  const url = normalizeAllowedUrl(new URL(rawHref, baseUrl).href, allowedHosts);
  const pathname = strictDecode(url.pathname, "INVALID_HREF_ENCODING");
  const rawName = pathname.split("/").filter(Boolean).at(-1);
  return {
    href_original: rawHref, url: url.href, name: rawName ? sanitizeFilename(rawName) : null,
    is_directory_path: pathname.endsWith("/"),
  };
}

export function parseWebDavMultistatus(body, {
  sourceUrl, maxEntries = 5_000, allowedHosts = DEFAULT_ALLOWED_HOSTS,
} = {}) {
  const root = parseXmlDocument(body, { maxNodes: Math.max(1_000, maxEntries * 20) });
  if (root.local !== "multistatus") throw new ProbeError("MALFORMED_WEBDAV", "Expected a WebDAV multistatus document");
  const responses = children(root, "response");
  if (responses.length > maxEntries) throw new ProbeError("TOO_MANY_FILES", "WebDAV listing exceeds configured entry limit");
  const entries = [];
  const quality = [];
  for (const response of responses) {
    const original = textOf(firstChild(response, "href"));
    const href = normalizeDavHref(original, sourceUrl, allowedHosts);
    const propstat = children(response, "propstat")
      .find((item) => /\s2\d\d(?:\s|$)/u.test(textOf(firstChild(item, "status")) || ""));
    if (!propstat) continue;
    const prop = firstChild(propstat, "prop");
    if (!prop) continue;
    const resourceType = firstChild(prop, "resourcetype");
    const isDirectory = href.is_directory_path || descendants(resourceType ?? { children: [] }, "collection").length > 0;
    const rawSize = textOf(firstChild(prop, "getcontentlength"));
    const size = numericSize(rawSize);
    if (!isDirectory && rawSize !== null && size === null) quality.push({ code: "INVALID_SIZE", href: original, value: rawSize });
    entries.push({
      ...href, is_directory: isDirectory, status: textOf(firstChild(propstat, "status")), size_bytes: size,
      last_modified: textOf(firstChild(prop, "getlastmodified")), etag: textOf(firstChild(prop, "getetag")),
      media_type: textOf(firstChild(prop, "getcontenttype")), quota_used_bytes: numericSize(textOf(firstChild(prop, "quota-used-bytes"))),
    });
  }
  return { listing_type: LISTING_TYPES.WEBDAV, entries, quality_findings: quality };
}

export function parseListing(body, {
  contentType = "", sourceUrl, maxFiles = 500, allowedHosts = DEFAULT_ALLOWED_HOSTS,
} = {}) {
  const text = Buffer.isBuffer(body) ? body.toString("utf8") : String(body ?? "");
  const trimmed = text.trim();
  let candidates = [];
  let listingType = LISTING_TYPES.UNSUPPORTED;
  if (/json/i.test(contentType) || /^[{[]/u.test(trimmed)) {
    let parsed;
    try { parsed = JSON.parse(trimmed); } catch { throw new ProbeError("MALFORMED_LISTING", "JSON listing could not be parsed"); }
    const arrays = [parsed.files, parsed.resources, parsed.data, parsed.items, parsed.results];
    candidates = arrays.find(Array.isArray) || (Array.isArray(parsed) ? parsed : []);
  } else if (/html/i.test(contentType) || /<html|<a\s/iu.test(trimmed)) {
    for (const match of trimmed.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>(.*?)<\/a>/giu)) {
      const href = match[2].replaceAll("&amp;", "&");
      const label = match[3].replace(/<[^>]+>/gu, " ").replace(/\s+/gu, " ").trim();
      if (/\.(zip|csv|json|xml|ods)(?:$|[?#])/iu.test(href)) candidates.push({ url: href, href_original: href, name: label || filenameFromUrl(new URL(href, sourceUrl).href) });
    }
    listingType = LISTING_TYPES.HTML;
  } else if (trimmed) throw new ProbeError("UNSUPPORTED_LISTING", "Unsupported listing representation", { contentType });
  if (candidates.length > maxFiles) throw new ProbeError("TOO_MANY_FILES", "Listing exceeds configured file limit");
  const files = candidates.map((item) => normalizeFile(item, sourceUrl, allowedHosts)).filter(Boolean);
  return {
    listing_type: listingType,
    files: [...new Map(files.map((file) => [file.url, file])).values()].sort((a, b) => a.name.localeCompare(b.name) || a.url.localeCompare(b.url)),
  };
}

function inferReferencePeriod(files) {
  const periods = new Set();
  for (const file of files) {
    const match = `${file.name} ${file.url}`.match(/(?:^|\D)(20\d{2})[-_.](0[1-9]|1[0-2])(?:\D|$)/u);
    if (match) periods.add(`${match[1]}-${match[2]}`);
  }
  return periods.size === 1 ? [...periods][0] : null;
}

function integrityMode(files) {
  if (!files.length) return "UNKNOWN";
  if (files.every((file) => file.etag && file.size_bytes !== null && file.last_modified)) return "ETAG_SIZE_LAST_MODIFIED";
  if (files.every((file) => file.size_bytes !== null && file.last_modified)) return "SIZE_LAST_MODIFIED";
  if (files.every((file) => file.size_bytes !== null)) return "SIZE_ONLY";
  return "UNKNOWN";
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

export function buildManifest({
  sourceUrl, files, referencePeriod = null, accessMethod = "UNKNOWN",
  listingType = LISTING_TYPES.UNSUPPORTED, qualityFindings = [],
}) {
  const sorted = [...files].map((file) => ({ ...file })).sort((a, b) => a.name.localeCompare(b.name) || a.url.localeCompare(b.url));
  const sizesKnown = sorted.length > 0 && sorted.every((file) => file.size_bytes !== null);
  const core = {
    schema_version: 2, source: sourceUrl, access_method: accessMethod, listing_type: listingType,
    reference_period: referencePeriod || inferReferencePeriod(sorted), file_count: sorted.length,
    total_compressed_bytes: sizesKnown ? sorted.reduce((sum, file) => sum + file.size_bytes, 0) : null,
    sizing_complete: sizesKnown, largest_file_bytes: sizesKnown ? Math.max(...sorted.map((file) => file.size_bytes)) : null,
    integrity_mode: integrityMode(sorted),
    quality_findings: [...qualityFindings].sort((a, b) => stableJson(a).localeCompare(stableJson(b))), files: sorted,
  };
  return { ...core, manifest_hash: createHash("sha256").update(stableJson(core)).digest("hex") };
}

function causeCode(error) {
  const seen = new Set();
  let current = error;
  while (current && !seen.has(current)) {
    seen.add(current);
    if (typeof current.code === "string" && current.code !== "NETWORK_FAILURE") return current.code;
    current = current.cause;
  }
  return null;
}

export function classifyNetworkError(error) {
  const direct = error?.code || "UNKNOWN";
  const cause = causeCode(error);
  if (direct === "TIMEOUT" || cause === "ETIMEDOUT") return "TIMEOUT";
  if (direct === "DOMAIN_NOT_ALLOWED") return "EXECUTOR_NETWORK_POLICY";
  if (cause === "ECONNRESET") return "TCP_RESET";
  if (cause === "ENOTFOUND" || cause === "EAI_AGAIN") return "DNS";
  if (cause === "ECONNREFUSED") return "CONNECTION_REFUSED";
  if (cause?.startsWith("ERR_TLS") || cause?.includes("CERT")) return "TLS";
  if (direct === "NETWORK_FAILURE") return "NETWORK_FAILURE";
  return "UNKNOWN";
}

function attempt(result, stage = result.method) {
  return {
    timestamp: new Date().toISOString(), stage, method: result.method, endpoint: result.url,
    status: result.status, ok: result.ok, latency_ms: result.latency_ms, headers: result.headers,
    bytes_read: result.bytes_read, redirect_chain: result.redirect_chain,
  };
}
function failedAttempt(stage, method, endpoint, error) {
  return {
    timestamp: new Date().toISOString(), stage, method, endpoint, status: null, ok: false,
    failure_class: classifyNetworkError(error), error_code: error?.code || "UNKNOWN",
    cause_code: causeCode(error), error: error?.message || "Unknown failure",
  };
}

export function derivePublicDavUrl(endpoint, allowedHosts = DEFAULT_ALLOWED_HOSTS) {
  const url = normalizeAllowedUrl(endpoint, allowedHosts);
  const token = url.pathname.match(/^\/index\.php\/s\/([A-Za-z0-9_-]+)\/?$/u)?.[1]
    || url.pathname.match(/^\/public\.php\/dav\/files\/([A-Za-z0-9_-]+)(?:\/.*)?$/u)?.[1];
  if (!token) throw new ProbeError("WEBDAV_ENDPOINT_UNRESOLVED", "Public share token could not be resolved");
  return normalizeAllowedUrl(`${url.origin}/public.php/dav/files/${encodeURIComponent(token)}/`, allowedHosts).href;
}

const propfind = (url, options) => requestLimited(url, {
  method: "PROPFIND", headers: { Depth: "1", "Content-Type": "application/xml; charset=utf-8" }, body: PROPFIND_BODY, ...options,
});

async function discoverWebDav({ davRoot, sourceUrl, fetchImpl, allowedHosts, timeoutMs, maxBytes, maxFiles, attempts, run }) {
  const options = { fetchImpl, allowedHosts, timeoutMs, maxBytes };
  const rootResponse = await propfind(davRoot, options);
  attempts.push(attempt(rootResponse, `WEBDAV_ROOT_RUN_${run}`));
  if (rootResponse.status !== 207) throw new ProbeError("WEBDAV_HTTP_STATUS", `Expected HTTP 207, received ${rootResponse.status}`);
  const root = parseWebDavMultistatus(rootResponse.body, { sourceUrl: davRoot, maxEntries: maxFiles, allowedHosts });
  const period = root.entries
    .filter((entry) => entry.is_directory && /^(20\d{2})-(0[1-9]|1[0-2])$/u.test(entry.name || ""))
    .sort((a, b) => b.name.localeCompare(a.name))[0];
  if (!period) throw new ProbeError("REFERENCE_PERIOD_NOT_FOUND", "No official YYYY-MM WebDAV directory was observed");
  const periodUrl = period.url.endsWith("/") ? period.url : `${period.url}/`;
  const periodResponse = await propfind(periodUrl, options);
  attempts.push(attempt(periodResponse, `WEBDAV_PERIOD_RUN_${run}`));
  if (periodResponse.status !== 207) throw new ProbeError("WEBDAV_HTTP_STATUS", `Expected HTTP 207, received ${periodResponse.status}`);
  const listing = parseWebDavMultistatus(periodResponse.body, { sourceUrl: periodUrl, maxEntries: maxFiles, allowedHosts });
  const files = listing.entries
    .filter((entry) => !entry.is_directory && /\.zip$/iu.test(entry.name || ""))
    .map((entry) => normalizeFile(entry, sourceUrl, allowedHosts)).filter(Boolean);
  return {
    period_url: periodUrl,
    manifest: buildManifest({
      sourceUrl, files, referencePeriod: period.name, accessMethod: "WEBDAV",
      listingType: LISTING_TYPES.WEBDAV, qualityFindings: [...root.quality_findings, ...listing.quality_findings],
    }),
  };
}

export async function probeSource({
  endpoint, fetchImpl = fetch, allowedHosts = DEFAULT_ALLOWED_HOSTS, timeoutMs = 15_000,
  maxBytes = 2_097_152, maxFiles = 500, sampleBytes = 0, stabilityDelayMs = 0,
}) {
  const sourceUrl = normalizeAllowedUrl(endpoint, allowedHosts).href;
  const attempts = [];
  let legacy = null;
  for (const method of ["HEAD", "OPTIONS", "GET"]) {
    try {
      const result = await requestLimited(sourceUrl, { method, fetchImpl, timeoutMs, maxBytes, allowedHosts });
      attempts.push(attempt(result));
      if (method === "GET" && result.ok) legacy = parseListing(result.body, {
        contentType: result.headers["content-type"] || "", sourceUrl: result.url, maxFiles, allowedHosts,
      });
    } catch (error) { attempts.push(failedAttempt(method, method, sourceUrl, error)); }
  }
  let first = null;
  let second = null;
  let davRoot = null;
  let periodUrl = null;
  try {
    davRoot = derivePublicDavUrl(sourceUrl, allowedHosts);
    first = await discoverWebDav({ davRoot, sourceUrl, fetchImpl, allowedHosts, timeoutMs, maxBytes, maxFiles, attempts, run: 1 });
    periodUrl = first.period_url;
    if (stabilityDelayMs > 0) await new Promise((resolve) => setTimeout(resolve, stabilityDelayMs));
    second = await discoverWebDav({ davRoot, sourceUrl, fetchImpl, allowedHosts, timeoutMs, maxBytes, maxFiles, attempts, run: 2 });
  } catch (error) { attempts.push(failedAttempt("WEBDAV_DISCOVERY", "PROPFIND", davRoot || sourceUrl, error)); }
  if (sampleBytes > 0) attempts.push({
    timestamp: new Date().toISOString(), stage: "RANGE_SAMPLE_SKIPPED", method: "GET", endpoint: sourceUrl,
    status: null, ok: true, bytes_read: 0, note: "WebDAV metadata made payload sampling unnecessary; no ZIP bytes were requested.",
  });
  const fallback = buildManifest({
    sourceUrl, files: legacy?.files || [], accessMethod: legacy?.listing_type === LISTING_TYPES.HTML ? "HTML" : "UNKNOWN",
    listingType: legacy?.listing_type || LISTING_TYPES.UNSUPPORTED,
  });
  const manifest = second?.manifest || first?.manifest || fallback;
  const connectivity = attempts.some((item) => item.status >= 200 && item.status < 300);
  const listing = manifest.listing_type === LISTING_TYPES.WEBDAV
    ? attempts.some((item) => item.stage === "WEBDAV_PERIOD_RUN_2" && item.status === 207)
    : manifest.listing_type === LISTING_TYPES.HTML && manifest.file_count > 0;
  const stable = first && second ? first.manifest.manifest_hash === second.manifest.manifest_hash : null;
  const verified = Boolean(listing && stable === true && manifest.reference_period && manifest.file_count > 0
    && manifest.files.every((file) => /\.zip$/iu.test(file.name)) && manifest.sizing_complete && !manifest.quality_findings.length);
  return {
    probe: {
      schema_version: 2, observed_at: new Date().toISOString(), endpoint: sourceUrl, webdav_root: davRoot,
      period_endpoint: periodUrl, allowed_hosts: allowedHosts,
      limits: { timeout_ms: timeoutMs, max_bytes: maxBytes, max_files: maxFiles, sample_bytes: sampleBytes, stability_delay_ms: stabilityDelayMs },
      listing_type: manifest.listing_type, connectivity_verified: connectivity, listing_verified: listing,
      manifest_verified: verified, source_status: verified ? "VERIFIED" : "NOT_VERIFIED",
      manifest_hash_run_1: first?.manifest.manifest_hash ?? null,
      manifest_hash_run_2: second?.manifest.manifest_hash ?? null,
      inventory_stability: stable === true ? "STABLE" : stable === false ? "UNSTABLE" : "UNKNOWN", attempts,
    },
    manifest,
  };
}

async function atomicWrite(path, content) {
  const temp = `${path}.tmp-${process.pid}`;
  await writeFile(temp, content, { encoding: "utf8", mode: 0o600 });
  await rename(temp, path);
}

export async function writeEvidence(outputDirectory, { probe, manifest }) {
  await mkdir(outputDirectory, { recursive: true, mode: 0o700 });
  const summary = [
    "# RF Official Source Probe Summary", "", `Observed at: ${probe.observed_at}`, `Endpoint: ${probe.endpoint}`,
    `WebDAV endpoint: ${probe.period_endpoint || "UNKNOWN"}`, `Source status: **${probe.source_status}**`,
    `Connectivity verified: ${probe.connectivity_verified}`, `Listing verified: ${probe.listing_verified}`,
    `Manifest verified: ${probe.manifest_verified}`, `Listing type: ${probe.listing_type}`,
    `Official file count: ${manifest.file_count || "UNKNOWN"}`, `Reference period: ${manifest.reference_period || "UNKNOWN"}`,
    `National compressed bytes: ${manifest.total_compressed_bytes ?? "UNKNOWN"}`, `Integrity mode: ${manifest.integrity_mode}`,
    `Manifest hash run 1: ${probe.manifest_hash_run_1 || "UNKNOWN"}`, `Manifest hash run 2: ${probe.manifest_hash_run_2 || "UNKNOWN"}`,
    `Inventory stability: ${probe.inventory_stability}`, "", "No ZIP was downloaded. This probe writes metadata evidence only.", "",
  ].join("\n");
  await atomicWrite(join(outputDirectory, "source_probe.json"), `${JSON.stringify(probe, null, 2)}\n`);
  await atomicWrite(join(outputDirectory, "dataset_manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  await atomicWrite(join(outputDirectory, "probe_summary.md"), summary);
}
