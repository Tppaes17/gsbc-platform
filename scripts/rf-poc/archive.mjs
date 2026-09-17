import { createWriteStream } from "node:fs";
import { mkdir, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

import { assertWithinGuardrail } from "./guardrails.mjs";

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`${command} exited ${code}: ${stderr.trim()}`));
    });
  });
}

export function validateArchiveEntries(entries) {
  for (const entry of entries) {
    const normalized = entry.replaceAll("\\", "/");
    if (!normalized || normalized.startsWith("/") || normalized.split("/").includes("..")) {
      throw new Error(`Unsafe archive entry: ${entry}`);
    }
  }
}

export async function listZipEntries(archivePath) {
  const output = await run("unzip", ["-Z1", archivePath]);
  const entries = output.split(/\r?\n/).filter(Boolean);
  validateArchiveEntries(entries);
  return entries;
}

export async function extractZipEntry({ archivePath, entry, destination, maxBytes }) {
  validateArchiveEntries([entry]);
  await mkdir(path.dirname(destination), { recursive: true });
  const temp = `${destination}.part`;
  const child = spawn("unzip", ["-p", archivePath, entry], { stdio: ["ignore", "pipe", "pipe"] });
  const completion = new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  });
  let stderr = "";
  let bytes = 0;
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const limiter = new Transform({
    transform(chunk, _encoding, callback) {
      bytes += chunk.length;
      try {
        assertWithinGuardrail("extracted bytes", bytes, maxBytes);
        callback(null, chunk);
      } catch (error) {
        child.kill("SIGTERM");
        callback(error);
      }
    },
  });

  try {
    await pipeline(child.stdout, limiter, createWriteStream(temp, { flags: "w" }));
    const code = await completion;
    if (code !== 0) throw new Error(`unzip exited ${code}: ${stderr.trim()}`);
    await rename(temp, destination);
    return { entry, destination, size_bytes: bytes };
  } catch (error) {
    try { await unlink(temp); } catch {}
    throw error;
  }
}
