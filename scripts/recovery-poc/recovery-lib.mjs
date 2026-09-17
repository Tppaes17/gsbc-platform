import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { copyFile, mkdir, open, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { pipeline } from "node:stream/promises";

const MAGIC = Buffer.from("GSBCREC1");
const IV_BYTES = 12;
const TAG_BYTES = 16;

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export async function sha256File(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

export function decodeKey(value) {
  if (!value) throw new Error("RECOVERY_POC_KEY_BASE64 is required");
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) throw new Error("Recovery key must decode to exactly 32 bytes");
  return key;
}

export async function encryptFile(input, output, key) {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const temp = `${output}.partial`;
  const destination = createWriteStream(temp, { flags: "wx" });
  destination.write(Buffer.concat([MAGIC, iv]));
  await pipeline(createReadStream(input), cipher, destination, { end: false });
  destination.end(cipher.getAuthTag());
  await new Promise((resolve, reject) => destination.on("close", resolve).on("error", reject));
  await rename(temp, output);
}

export async function decryptFile(input, output, key) {
  const info = await stat(input);
  if (info.size <= MAGIC.length + IV_BYTES + TAG_BYTES) throw new Error("Encrypted backup is truncated");
  const handle = await open(input, "r");
  const header = Buffer.alloc(MAGIC.length + IV_BYTES);
  const tag = Buffer.alloc(TAG_BYTES);
  await handle.read(header, 0, header.length, 0);
  await handle.read(tag, 0, tag.length, info.size - TAG_BYTES);
  await handle.close();
  if (!header.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error("Encrypted backup header is invalid");
  const decipher = createDecipheriv("aes-256-gcm", key, header.subarray(MAGIC.length));
  decipher.setAuthTag(tag);
  const temp = `${output}.partial`;
  try {
    await pipeline(
      createReadStream(input, { start: header.length, end: info.size - TAG_BYTES - 1 }),
      decipher,
      createWriteStream(temp, { flags: "wx" }),
    );
    await rename(temp, output);
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
  }
}

export async function acquireLock(lockDir, staleMs = 60 * 60 * 1000) {
  try {
    await mkdir(lockDir);
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    const detailsPath = join(lockDir, "owner.json");
    let details;
    try { details = JSON.parse(await readFile(detailsPath, "utf8")); } catch { details = {}; }
    const age = Date.now() - new Date(details.startedAt ?? 0).getTime();
    if (!Number.isFinite(age) || age <= staleMs) throw new Error("RECOVERY_POC_LOCKED");
    await rm(lockDir, { recursive: true, force: true });
    await mkdir(lockDir);
  }
  await writeFile(join(lockDir, "owner.json"), JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
  return async () => rm(lockDir, { recursive: true, force: true });
}

export async function createRecoveryPoint({
  bundlePath,
  independentDir,
  lockDir,
  key,
  id,
  sourceMetadata = {},
  injectFailureAt,
}) {
  await mkdir(independentDir, { recursive: true });
  const release = await acquireLock(lockDir);
  const started = Date.now();
  const localEncrypted = join(independentDir, `.${id}.local.enc`);
  const durablePartial = join(independentDir, `.${id}.copy.partial`);
  const durablePath = join(independentDir, `${id}.tar.enc`);
  const manifestPath = join(independentDir, `${id}.manifest.json`);
  const markerPath = join(independentDir, `${id}.success.json`);
  const fail = (stage) => { if (injectFailureAt === stage) throw new Error(`INJECTED_${stage.toUpperCase()}_FAILURE`); };

  try {
    fail("dump");
    const bundle = await stat(bundlePath);
    if (!bundle.isFile() || bundle.size === 0) throw new Error("Backup bundle is empty");
    fail("encryption");
    await encryptFile(bundlePath, localEncrypted, key);
    fail("copy");
    await copyFile(localEncrypted, durablePartial);
    fail("checksum");
    const [localHash, copiedHash] = await Promise.all([sha256File(localEncrypted), sha256File(durablePartial)]);
    if (injectFailureAt === "checksum-mismatch" || localHash !== copiedHash) throw new Error("Backup copy checksum mismatch");
    await rename(durablePartial, durablePath);

    const encrypted = await stat(durablePath);
    const manifest = {
      format: "GSBC_RECOVERY_POC_V1",
      id,
      createdAt: new Date().toISOString(),
      source: sourceMetadata,
      files: [{ name: basename(durablePath), bytes: encrypted.size, sha256: copiedHash }],
      encryption: { algorithm: "AES-256-GCM", keyStoredWithBackup: false },
      totalDurationMs: Date.now() - started,
    };
    await writeFile(manifestPath, `${canonicalJson(manifest)}\n`, { flag: "wx" });
    fail("marker");
    const marker = {
      format: "GSBC_RECOVERY_SUCCESS_V1",
      id,
      manifest: basename(manifestPath),
      manifestSha256: await sha256File(manifestPath),
      completedAt: new Date().toISOString(),
    };
    await writeFile(markerPath, `${canonicalJson(marker)}\n`, { flag: "wx" });
    return { durablePath, manifestPath, markerPath, manifest, marker };
  } catch (error) {
    await Promise.all([
      rm(localEncrypted, { force: true }),
      rm(durablePartial, { force: true }),
      rm(durablePath, { force: true }),
      rm(manifestPath, { force: true }),
      rm(markerPath, { force: true }),
    ]);
    throw error;
  } finally {
    await release();
    await rm(localEncrypted, { force: true });
  }
}

export async function verifiedRecoveryPoints(directory) {
  const names = await readdir(directory).catch(() => []);
  const markers = names.filter((name) => name.endsWith(".success.json")).sort().reverse();
  const valid = [];
  for (const name of markers) {
    try {
      const markerPath = join(directory, name);
      const marker = JSON.parse(await readFile(markerPath, "utf8"));
      const manifestPath = join(directory, marker.manifest);
      if (await sha256File(manifestPath) !== marker.manifestSha256) continue;
      const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
      const backupPath = join(directory, manifest.files[0].name);
      if (await sha256File(backupPath) !== manifest.files[0].sha256) continue;
      valid.push({ markerPath, marker, manifestPath, manifest, backupPath });
    } catch {}
  }
  return valid;
}

export function selectRetention(points, now = new Date()) {
  const sorted = [...points].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const keep = new Set();
  const seenDay = new Set();
  const seenWeek = new Set();
  const seenMonth = new Set();
  for (const point of sorted) {
    const date = new Date(point.createdAt);
    const ageHours = (now - date) / 3_600_000;
    if (ageHours <= 48) { keep.add(point.id); continue; }
    const day = date.toISOString().slice(0, 10);
    const week = `${date.getUTCFullYear()}-${Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - Date.UTC(date.getUTCFullYear(), 0, 1)) / 604800000)}`;
    const month = day.slice(0, 7);
    if (ageHours <= 24 * 14) {
      if (!seenDay.has(day)) { keep.add(point.id); seenDay.add(day); }
      continue;
    }
    if (ageHours <= 24 * 7 * 8) {
      if (!seenWeek.has(week)) { keep.add(point.id); seenWeek.add(week); }
      continue;
    }
    if (ageHours <= 24 * 365 && !seenMonth.has(month)) { keep.add(point.id); seenMonth.add(month); }
  }
  return keep;
}
