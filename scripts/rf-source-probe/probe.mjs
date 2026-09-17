#!/usr/bin/env node

import { resolve } from "node:path";
import { probeSource, writeEvidence } from "./probe-lib.mjs";

const DEFAULT_ENDPOINT = "https://arquivos.receitafederal.gov.br/index.php/s/YggdBLfdninEJX9";

function usage() {
  return `Usage:
  node scripts/rf-source-probe/probe.mjs --output <directory> [options]

Options:
  --endpoint <https-url>   Official source endpoint (default: Receita CNPJ share)
  --output <directory>     Required explicit evidence directory
  --timeout-ms <number>    Per-request timeout (default: 15000)
  --max-bytes <number>     Maximum listing response bytes (default: 2097152)
  --max-files <number>     Maximum files accepted from listing (default: 500)
  --sample-bytes <number>  Optional bounded Range probe (default: 0)
  --stability-delay-ms <number>  Delay between manifest discoveries (default: 5000)
  --help                   Show this help
`;
}

function integerOption(value, name, { min, max }) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return parsed;
}

function parseArgs(argv) {
  const options = {
    endpoint: DEFAULT_ENDPOINT,
    output: null,
    timeoutMs: 15_000,
    maxBytes: 2_097_152,
    maxFiles: 500,
    sampleBytes: 0,
    stabilityDelayMs: 5_000,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help") return { help: true };
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${arg}`);
    if (arg === "--endpoint") options.endpoint = value;
    else if (arg === "--output") options.output = value;
    else if (arg === "--timeout-ms") options.timeoutMs = integerOption(value, arg, { min: 100, max: 120_000 });
    else if (arg === "--max-bytes") options.maxBytes = integerOption(value, arg, { min: 1_024, max: 10_485_760 });
    else if (arg === "--max-files") options.maxFiles = integerOption(value, arg, { min: 1, max: 5_000 });
    else if (arg === "--sample-bytes") options.sampleBytes = integerOption(value, arg, { min: 0, max: 1_048_576 });
    else if (arg === "--stability-delay-ms") options.stabilityDelayMs = integerOption(value, arg, { min: 0, max: 60_000 });
    else throw new Error(`Unknown option: ${arg}`);
    index += 1;
  }

  if (!options.output) throw new Error("--output is required");
  return options;
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  if (options.help) {
    console.log(usage());
    return;
  }

  const result = await probeSource(options);
  const output = resolve(options.output);
  await writeEvidence(output, result);

  console.log(`Evidence written to ${output}`);
  console.log(`Source status: ${result.probe.source_status}`);
  console.log(`Manifest SHA-256: ${result.manifest.manifest_hash}`);
  console.log(`Inventory stability: ${result.probe.inventory_stability}`);
  if (result.probe.source_status !== "VERIFIED") process.exitCode = 2;
}

main().catch((error) => {
  console.error(`${error.name || "Error"}: ${error.message}`);
  process.exitCode = 1;
});
