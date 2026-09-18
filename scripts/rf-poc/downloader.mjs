import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

import { assertWithinGuardrail } from "./guardrails.mjs";

async function fileHash(path) {
  const hash = createHash("sha256");
  await pipeline(createReadStream(path), hash);
  return hash.digest("hex");
}

async function existingCompletion(destination, markerPath, expectedSha256) {
  try {
    const marker = JSON.parse(await readFile(markerPath, "utf8"));
    const info = await stat(destination);
    if (info.size !== marker.size_bytes) return null;
    const checksum = await fileHash(destination);
    if (checksum !== marker.checksum_sha256) return null;
    if (expectedSha256 && checksum !== expectedSha256) return null;
    return { ...marker, reused: true };
  } catch {
    return null;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function downloadFile({
  url,
  destination,
  maxBytes,
  timeoutMs = 30_000,
  attempts = 3,
  expectedSha256,
  expectedBytes,
  allowedHosts,
  maxRedirects = 3,
  fetchImpl = fetch,
}) {
  const markerPath = `${destination}.complete.json`;
  const partPath = `${destination}.part`;
  const completed = await existingCompletion(destination, markerPath, expectedSha256);
  if (completed) return completed;

  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      let offset = 0;
      try {
        offset = (await stat(partPath)).size;
      } catch {
        offset = 0;
      }
      assertWithinGuardrail("partial compressed bytes", offset, maxBytes);

      const headers = offset > 0 ? { Range: `bytes=${offset}-` } : {};
      let currentUrl = new URL(url);
      if (allowedHosts && !allowedHosts.includes(currentUrl.hostname)) throw new Error(`Download host is not allowlisted: ${currentUrl.hostname}`);
      let response;
      for (let redirect = 0; redirect <= maxRedirects; redirect += 1) {
        response = await fetchImpl(currentUrl, { headers, signal: controller.signal, redirect: "manual" });
        if (![301, 302, 303, 307, 308].includes(response.status)) break;
        const location = response.headers.get("location");
        if (!location || redirect === maxRedirects) throw new Error("Download redirect limit exceeded");
        currentUrl = new URL(location, currentUrl);
        if (currentUrl.protocol !== "https:" || (allowedHosts && !allowedHosts.includes(currentUrl.hostname))) {
          throw new Error(`Unsafe download redirect: ${currentUrl.href}`);
        }
      }
      if (!response.ok || !response.body) {
        throw new Error(`Download failed with HTTP ${response.status}`);
      }

      const append = offset > 0 && response.status === 206;
      if (!append) offset = 0;
      const contentLength = Number(response.headers.get("content-length") ?? 0);
      if (contentLength > 0) {
        assertWithinGuardrail("compressed bytes", offset + contentLength, maxBytes);
        if (expectedBytes && !append && contentLength !== expectedBytes) {
          throw new Error(`Content-Length mismatch: expected ${expectedBytes}, got ${contentLength}`);
        }
      }

      let bytes = offset;
      const limiter = new Transform({
        transform(chunk, _encoding, callback) {
          bytes += chunk.length;
          try {
            assertWithinGuardrail("compressed bytes", bytes, maxBytes);
            callback(null, chunk);
          } catch (error) {
            callback(error);
          }
        },
      });

      await pipeline(
        Readable.fromWeb(response.body),
        limiter,
        createWriteStream(partPath, { flags: append ? "a" : "w" }),
      );

      const checksum = await fileHash(partPath);
      if (expectedBytes && bytes !== expectedBytes) throw new Error(`Downloaded size mismatch: expected ${expectedBytes}, got ${bytes}`);
      if (expectedSha256 && checksum !== expectedSha256) {
        throw new Error(`Checksum mismatch: expected ${expectedSha256}, got ${checksum}`);
      }

      await rename(partPath, destination);
      const marker = {
        source_url: url,
        size_bytes: bytes,
        checksum_sha256: checksum,
        etag: response.headers.get("etag"),
        last_modified: response.headers.get("last-modified"),
        completed_at: new Date().toISOString(),
        attempts: attempt,
        reused: false,
      };
      const markerTemp = `${markerPath}.tmp`;
      await writeFile(markerTemp, `${JSON.stringify(marker, null, 2)}\n`, "utf8");
      await rename(markerTemp, markerPath);
      return marker;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await delay(100 * 2 ** (attempt - 1));
    } finally {
      clearTimeout(timeout);
    }
  }

  try {
    await unlink(markerPath);
  } catch {}
  throw lastError;
}

export { fileHash };
