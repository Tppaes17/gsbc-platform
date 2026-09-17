import path from "node:path";

const SEGMENT_PATTERN = /^[A-Za-z0-9._-]+$/;

export function storagePath(datasetVersion, area, filename) {
  if (!SEGMENT_PATTERN.test(datasetVersion) || !["raw", "extracted", "manifest", "logs"].includes(area)) {
    throw new Error("Invalid RF storage path segment");
  }
  if (!SEGMENT_PATTERN.test(filename)) throw new Error("Invalid RF storage filename");
  return path.posix.join("rfb-cnpj", datasetVersion, area, filename);
}
