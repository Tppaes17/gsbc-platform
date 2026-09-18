import assert from "node:assert/strict";
import test from "node:test";
import {
  assessRfFreshness,
  classifyRfLookup,
} from "../../src/lib/rf/semantics.ts";

function payload(overrides = {}) {
  return {
    dataset: {
      id: "dataset-1",
      dataset_version: "2026-08-controlled",
      competence_month: "2026-08-01",
      source: "RECEITA_FEDERAL_CNPJ_OPEN_DATA",
      source_url: null,
      manifest_hash: "abc",
      published_at: "2026-09-01T00:00:00Z",
      metadata: {},
    },
    establishment: null,
    company: null,
    simples_mei: null,
    ...overrides,
  };
}

test("classifies an unavailable dataset without claiming the CNPJ does not exist", () => {
  assert.equal(classifyRfLookup(payload({ dataset: null }), "11222333000181"), "DATASET_UNAVAILABLE");
});

test("classifies an exact canonical match as found", () => {
  assert.equal(
    classifyRfLookup(payload({ establishment: { cnpj_canonical: "11222333000181" } }), "11222333000181"),
    "FOUND",
  );
});

test("distinguishes a CNPJ outside the controlled selection", () => {
  assert.equal(classifyRfLookup(payload(), "11222333000181"), "NOT_IN_CONTROLLED_DATASET");
});

test("distinguishes an expected CNPJ missing from the loaded version", () => {
  const dataset = payload().dataset;
  dataset.metadata = { controlled_selection: { cnpjs: ["11222333000181"] } };
  assert.equal(
    classifyRfLookup(payload({ dataset }), "11222333000181"),
    "NOT_FOUND_IN_LOADED_RF_VERSION",
  );
});

test("controlled selection supports alphanumeric CNPJ roots without coercion", () => {
  const dataset = payload().dataset;
  dataset.metadata = { controlled_selection: { cnpj_roots: ["12ABC345"] } };
  assert.equal(
    classifyRfLookup(payload({ dataset }), "12ABC345000158"),
    "NOT_FOUND_IN_LOADED_RF_VERSION",
  );
});

test("freshness is deterministic for current, stale, invalid, and future references", () => {
  const now = new Date("2026-09-18T00:00:00Z");
  assert.equal(assessRfFreshness("2026-08-01", now), "CURRENT");
  assert.equal(assessRfFreshness("2026-06-01", now), "STALE");
  assert.equal(assessRfFreshness("invalid", now), "UNKNOWN");
  assert.equal(assessRfFreshness("2026-10-01", now), "UNKNOWN");
  assert.equal(assessRfFreshness(null, now), "UNKNOWN");
});
