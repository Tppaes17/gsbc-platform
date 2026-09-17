export const DEFAULT_GUARDRAILS = Object.freeze({
  maxFiles: 1,
  maxCompressedBytes: 2 * 1024 * 1024,
  maxExtractedBytes: 10 * 1024 * 1024,
  maxRows: 50_000,
  maxRuntimeMs: 5 * 60 * 1000,
  maxDbRows: 50_000,
});

export function assertWithinGuardrail(name, actual, maximum) {
  if (!Number.isFinite(actual) || actual < 0) {
    throw new Error(`Invalid ${name}: ${actual}`);
  }
  if (actual > maximum) {
    throw new Error(`Guardrail exceeded: ${name}=${actual}, maximum=${maximum}`);
  }
}
