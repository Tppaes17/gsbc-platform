import { createHash } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { performance } from "node:perf_hooks";

export const DEFAULT_ALLOWED_HOSTS = Object.freeze([
  "arquivos.receitafederal.gov.br",
  "dados.gov.br",
  "www.gov.br",
]);

export class ProbeError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ProbeError";
    this.code = code;
    this.details = details;
  }
}

export function normalizeAllowedUrl(value, allowedHosts = DEFAULT_ALLOWED_HOSTS) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new ProbeError("INVALID_URL", `Invalid URL: ${value}`);
  }

  if (url.protocol !== "https:") {
    throw new ProbeError("HTTPS_REQUIRED", `Only HTTPS is allowed: ${url.href}`);
  }

  const hostname = url.hostname.toLowerCase();
  if (!allowedHosts.map((host) => host.toLowerCase()).includes(hostname)) {
    throw new ProbeError("DOMAIN_NOT_ALLOWED", `Domain is not allowlisted: ${hostname}`);
  }

  url.username = "";
  url.password = "";
  return url;
}

export function sanitizeFilename(value) {
  if (typeof value !== "string") {
    throw new ProbeError("INVALID_FILENAME", "Filename must be a string");
  }

  const decoded = safeDecode(value).normalize("NFC").trim();
  if (
    decoded.length === 0 ||
    decoded.length > 255 ||
    decoded === "." ||
    decoded === ".." ||
    decoded.includes("/") ||
    decoded.includes("\\") ||
    /[\u0000-\u001f\u007f]/u.test(decoded)
  ) {
    throw new ProbeError("UNSAFE_FILENAME", `Unsafe filename rejected: ${JSON.stringify(value)}`);
  }
  return decoded;
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function headerObject(headers) {
  const allowed = new Set([
    "accept-ranges",
    "content-length",
    "content-type",
    "date",
    "etag",
    "last-modified",
    "location",
  ]);
  return Object.fromEntries(
    [...headers.entries()].filter(([name]) => allowed.has(name.toLowerCase())),
  );
}

async function readLimitedBody(response, maxBytes) {
  if (!response.body) return Buffer.alloc(0);

  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new ProbeError("RESPONSE_TOO_LARGE", "Response exceeds configured byte limit", {
      declared,
      maxBytes,
    });
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
      throw new ProbeError("RESPONSE_TOO_LARGE", "Stream exceeds configured byte limit", {
        observed: total,
        maxBytes,
      });
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, total);
}

export async function requestLimited(
  input,
  {
    method = "GET",
    headers = {},
    fetchImpl = fetch,
    timeoutMs = 15_000,
    maxBytes = 2_097_152,
    maxRedirects = 3,
    allowedHosts = DEFAULT_ALLOWED_HOSTS,
  } = {},
) {
  let current = normalizeAllowedUrl(input, allowedHosts);
  const redirectChain = [];

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = performance.now();
    let response;
    try {
      response = await fetchImpl(current, {
        method,
        headers: {
          Accept: "text/html,application/json,application/xml,text/xml;q=0.9,*/*;q=0.5",
          "User-Agent": "GSBC-RF-Source-Probe/1.0 (+read-only metadata probe)",
          ...headers,
        },
        redirect: "manual",
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timer);
      if (error?.name === "AbortError") {
        throw new ProbeError("TIMEOUT", `Request timed out after ${timeoutMs} ms`, {
          url: current.href,
          method,
        });
      }
      throw new ProbeError("NETWORK_FAILURE", error?.message || "Network request failed", {
        url: current.href,
        method,
      });
    }
    clearTimeout(timer);

    const latencyMs = Math.round((performance.now() - startedAt) * 100) / 100;
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new ProbeError("INVALID_REDIRECT", "Redirect response has no Location header", {
          url: current.href,
          status: response.status,
        });
      }
      if (redirectCount === maxRedirects) {
        throw new ProbeError("TOO_MANY_REDIRECTS", "Redirect limit exceeded");
      }
      const target = normalizeAllowedUrl(new URL(location, current).href, allowedHosts);
      redirectChain.push({ from: current.href, status: response.status, to: target.href });
      current = target;
      continue;
    }

    const body = method === "HEAD" ? Buffer.alloc(0) : await readLimitedBody(response, maxBytes);
    return {
      url: current.href,
      method,
      status: response.status,
      ok: response.ok,
      latency_ms: latencyMs,
      headers: headerObject(response.headers),
      bytes_read: body.byteLength,
      redirect_chain: redirectChain,
      body,
    };
  }

  throw new ProbeError("TOO_MANY_REDIRECTS", "Redirect limit exceeded");
}

function numericSize(value) {
  if (value === null || value === undefined || value === "") return null;
  const size = Number(value);
  return Number.isSafeInteger(size) && size >= 0 ? size : null;
}

function filenameFromUrl(url) {
  const candidate = basename(new URL(url).pathname);
  return candidate ? sanitizeFilename(candidate) : null;
}

function normalizeFile(item, sourceUrl, allowedHosts) {
  const rawUrl = item.url || item.href || item.download_url || item.downloadUrl;
  if (!rawUrl) return null;
  const url = normalizeAllowedUrl(new URL(rawUrl, sourceUrl).href, allowedHosts);
  const rawName = item.filename || item.name || item.title || filenameFromUrl(url.href);
  if (!rawName) return null;
  const name = sanitizeFilename(rawName);
  return {
    name,
    url: url.href,
    size_bytes: numericSize(item.size_bytes ?? item.size ?? item.content_length),
    last_modified: item.last_modified ?? item.lastModified ?? null,
    etag: item.etag ?? null,
    checksum: item.checksum ?? item.hash ?? null,
    media_type: item.media_type ?? item.mimetype ?? item.type ?? item.format ?? null,
  };
}

export function parseListing(
  body,
  { contentType = "", sourceUrl, maxFiles = 500, allowedHosts = DEFAULT_ALLOWED_HOSTS } = {},
) {
  const text = Buffer.isBuffer(body) ? body.toString("utf8") : String(body ?? "");
  const trimmed = text.trim();
  let candidates = [];
  let mechanism = "UNKNOWN";

  if (/json/i.test(contentType) || /^[{[]/u.test(trimmed)) {
    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new ProbeError("MALFORMED_LISTING", "JSON listing could not be parsed");
    }
    const arrays = [parsed.files, parsed.resources, parsed.data, parsed.items, parsed.results];
    candidates = arrays.find(Array.isArray) || (Array.isArray(parsed) ? parsed : []);
    mechanism = "JSON";
  } else if (/html/i.test(contentType) || /<html|<a\s/iu.test(trimmed)) {
    const anchorPattern = /<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>(.*?)<\/a>/giu;
    for (const match of trimmed.matchAll(anchorPattern)) {
      const href = match[2].replaceAll("&amp;", "&");
      const label = match[3].replace(/<[^>]+>/gu, " ").replace(/\s+/gu, " ").trim();
      if (!/\.(zip|csv|json|xml|ods)(?:$|[?#])/iu.test(href)) continue;
      candidates.push({ url: href, name: label || filenameFromUrl(new URL(href, sourceUrl).href) });
    }
    mechanism = "HTML_LINKS";
  } else if (trimmed.length > 0) {
    throw new ProbeError("MALFORMED_LISTING", "Unsupported listing representation", {
      contentType,
    });
  }

  if (candidates.length > maxFiles) {
    throw new ProbeError("TOO_MANY_FILES", "Listing exceeds configured file limit", {
      observed: candidates.length,
      maxFiles,
    });
  }

  const files = candidates
    .map((item) => normalizeFile(item, sourceUrl, allowedHosts))
    .filter(Boolean);
  const deduplicated = [...new Map(files.map((file) => [file.url, file])).values()]
    .sort((a, b) => a.name.localeCompare(b.name) || a.url.localeCompare(b.url));

  return { mechanism, files: deduplicated };
}

function inferReferencePeriod(files) {
  const periods = new Set();
  for (const file of files) {
    const match = file.name.match(/(?:^|\D)(20\d{2})[-_.](0[1-9]|1[0-2])(?:\D|$)/u);
    if (match) periods.add(`${match[1]}-${match[2]}`);
  }
  return periods.size === 1 ? [...periods][0] : null;
}

function integrityClassification(files) {
  if (files.length === 0) return "UNKNOWN";
  if (files.every((file) => file.checksum)) return "OFFICIAL_CHECKSUM_AVAILABLE";
  if (files.every((file) => file.etag && file.size_bytes !== null)) return "REMOTE_METADATA_AVAILABLE";
  if (files.every((file) => file.size_bytes !== null && file.last_modified)) {
    return "REMOTE_METADATA_AVAILABLE";
  }
  return "LOCAL_HASH_REQUIRED";
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function buildManifest({ sourceUrl, files, referencePeriod = null }) {
  const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name) || a.url.localeCompare(b.url));
  const sizesKnown = sortedFiles.every((file) => file.size_bytes !== null);
  const manifestCore = {
    schema_version: 1,
    official_source: sourceUrl,
    reference_period: referencePeriod || inferReferencePeriod(sortedFiles),
    file_count: sortedFiles.length,
    total_compressed_bytes: sizesKnown
      ? sortedFiles.reduce((total, file) => total + file.size_bytes, 0)
      : null,
    largest_file_bytes: sizesKnown && sortedFiles.length
      ? Math.max(...sortedFiles.map((file) => file.size_bytes))
      : null,
    integrity_metadata: integrityClassification(sortedFiles),
    files: sortedFiles,
  };
  return {
    ...manifestCore,
    manifest_sha256: createHash("sha256").update(stableJson(manifestCore)).digest("hex"),
  };
}

function classifyError(error) {
  const code = error?.code || "UNKNOWN";
  if (code === "TIMEOUT") return "TIMEOUT";
  if (code === "DOMAIN_NOT_ALLOWED") return "EXECUTOR_NETWORK_POLICY";
  if (code === "NETWORK_FAILURE") {
    if (/reset/i.test(error.message)) return "TCP_RESET";
    if (/dns|enotfound|getaddrinfo/i.test(error.message)) return "DNS";
    if (/tls|certificate|ssl/i.test(error.message)) return "TLS";
    return "UNKNOWN";
  }
  if (/^HTTP_4/u.test(code)) return "HTTP_4xx";
  if (/^HTTP_5/u.test(code)) return "HTTP_5xx";
  return code;
}

function publicAttempt(result) {
  return {
    timestamp: new Date().toISOString(),
    method: result.method,
    endpoint: result.url,
    status: result.status,
    ok: result.ok,
    latency_ms: result.latency_ms,
    headers: result.headers,
    bytes_read: result.bytes_read,
    redirect_chain: result.redirect_chain,
  };
}

function failedAttempt(method, endpoint, error) {
  return {
    timestamp: new Date().toISOString(),
    method,
    endpoint,
    status: null,
    ok: false,
    failure_class: classifyError(error),
    error_code: error?.code || "UNKNOWN",
    error: error?.message || "Unknown failure",
  };
}

export async function probeSource({
  endpoint,
  fetchImpl = fetch,
  allowedHosts = DEFAULT_ALLOWED_HOSTS,
  timeoutMs = 15_000,
  maxBytes = 2_097_152,
  maxFiles = 500,
  sampleBytes = 0,
}) {
  const officialUrl = normalizeAllowedUrl(endpoint, allowedHosts).href;
  const attempts = [];
  let listing = null;

  for (const method of ["HEAD", "OPTIONS", "GET"]) {
    try {
      const result = await requestLimited(officialUrl, {
        method,
        fetchImpl,
        timeoutMs,
        maxBytes,
        allowedHosts,
      });
      attempts.push(publicAttempt(result));
      if (method === "GET" && result.ok) {
        listing = parseListing(result.body, {
          contentType: result.headers["content-type"] || "",
          sourceUrl: result.url,
          maxFiles,
          allowedHosts,
        });
      }
    } catch (error) {
      attempts.push(failedAttempt(method, officialUrl, error));
    }
  }

  if (sampleBytes > 0) {
    try {
      const result = await requestLimited(officialUrl, {
        method: "GET",
        headers: { Range: `bytes=0-${sampleBytes - 1}` },
        fetchImpl,
        timeoutMs,
        maxBytes: sampleBytes,
        allowedHosts,
      });
      attempts.push(publicAttempt(result));
    } catch (error) {
      attempts.push(failedAttempt("GET_RANGE", officialUrl, error));
    }
  }

  const files = listing?.files || [];
  const manifest = buildManifest({ sourceUrl: officialUrl, files });
  const sourceVerified = attempts.some((attempt) => attempt.method === "GET" && attempt.ok)
    && files.length > 0
    && manifest.total_compressed_bytes !== null;

  return {
    probe: {
      schema_version: 1,
      observed_at: new Date().toISOString(),
      endpoint: officialUrl,
      allowed_hosts: allowedHosts,
      limits: { timeout_ms: timeoutMs, max_bytes: maxBytes, max_files: maxFiles, sample_bytes: sampleBytes },
      listing_mechanism: listing?.mechanism || "NOT_OBSERVED",
      source_status: sourceVerified ? "VERIFIED" : "NOT_VERIFIED",
      attempts,
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
    "# RF Official Source Probe Summary",
    "",
    `Observed at: ${probe.observed_at}`,
    `Endpoint: ${probe.endpoint}`,
    `Source status: **${probe.source_status}**`,
    `Listing mechanism: ${probe.listing_mechanism}`,
    `Official file count: ${manifest.file_count || "UNKNOWN"}`,
    `Reference period: ${manifest.reference_period || "UNKNOWN"}`,
    `National compressed bytes: ${manifest.total_compressed_bytes ?? "UNKNOWN"}`,
    `Integrity metadata: ${manifest.integrity_metadata}`,
    `Manifest SHA-256: ${manifest.manifest_sha256}`,
    "",
    "No dataset payload was downloaded. This probe writes metadata evidence only.",
    "",
  ].join("\n");

  await atomicWrite(join(outputDirectory, "source_probe.json"), `${JSON.stringify(probe, null, 2)}\n`);
  await atomicWrite(join(outputDirectory, "dataset_manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  await atomicWrite(join(outputDirectory, "probe_summary.md"), summary);
}
