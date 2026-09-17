import { createHash } from "node:crypto";

const VOLATILE_KEYS = new Set(["discovered_at", "downloaded_at", "generated_at"]);

function stableValue(value) {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !VOLATILE_KEYS.has(key))
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stableValue(nested)]),
    );
  }
  return value;
}

export function stableJson(value) {
  return JSON.stringify(stableValue(value));
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function createManifest({ datasetVersion, source, files, discoveredAt }) {
  if (!datasetVersion || !source || !Array.isArray(files) || files.length === 0) {
    throw new Error("Manifest requires datasetVersion, source and at least one file");
  }

  const normalizedFiles = [...files]
    .map((file) => ({
      identifier: file.identifier,
      type: file.type,
      source_url: file.sourceUrl,
      size_bytes: file.sizeBytes ?? null,
      etag: file.etag ?? null,
      last_modified: file.lastModified ?? null,
      checksum_sha256: file.checksumSha256 ?? null,
      integrity_source: file.integritySource ?? "local-only",
    }))
    .sort((left, right) => left.identifier.localeCompare(right.identifier));

  const deterministic = {
    dataset_version: datasetVersion,
    source,
    files: normalizedFiles,
  };

  return {
    ...deterministic,
    discovered_at: discoveredAt ?? new Date().toISOString(),
    manifest_hash: sha256(stableJson(deterministic)),
  };
}
