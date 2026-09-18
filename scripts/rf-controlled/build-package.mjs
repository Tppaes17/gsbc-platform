import { readFile, writeFile } from "node:fs/promises";
import { createCuratedPackage, evaluateCapacity } from "./controlled-lib.mjs";

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, all) => value.startsWith("--") ? [...pairs, [value.slice(2), all[index + 1]]] : pairs, []));
if (!args.records || !args.policy || !args.output || !args.capacity) throw new Error("Usage: --records input.json --policy policy.json --capacity capacity.json --output package.json");
const [records, policy, capacity] = await Promise.all([args.records, args.policy, args.capacity].map(async (file) => JSON.parse(await readFile(file, "utf8"))));
const gate = evaluateCapacity(capacity);
if (gate.status !== "PASS") throw new Error(`CONTROLLED_DATASET_EXPANSION_PAUSED:${gate.reasons.join(",")}`);
const result = createCuratedPackage({ datasetVersion: policy.dataset_version, sourceReferenceDate: policy.source_reference_date, sourceManifestHash: policy.source_manifest_hash, parserVersion: policy.parser_version, policy, records });
await writeFile(args.output, `${JSON.stringify({ ...result, capacity_gate: gate }, null, 2)}\n`, { flag: "wx", mode: 0o600 });
process.stdout.write(`Curated package written: ${args.output}\nRecords: ${result.records.length}\nSHA-256: ${result.manifest.package_sha256}\n`);
