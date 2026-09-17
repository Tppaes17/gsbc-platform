export function reconcileQuality({ sourceRows, parsedRecords, rejectedRows, expectedFiles, discoveredFiles }) {
  const duplicateKeys = parsedRecords.length - new Set(parsedRecords.map((record) => record.code)).size;
  const reasons = [];
  if (sourceRows !== parsedRecords.length + rejectedRows) reasons.push("ROW_COUNT_MISMATCH");
  if (duplicateKeys > 0) reasons.push("DUPLICATE_KEY");
  if (discoveredFiles < expectedFiles) reasons.push("INCOMPLETE_DATASET");
  return {
    status: reasons.length === 0 ? "PASS" : "FAIL",
    duplicate_keys: duplicateKeys,
    reasons,
  };
}
