import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { freezeCatalogDiagnostic, renderCatalogDiagnostic } from "../catalog-diagnostic-report.mjs";

function fixture() {
  const measured = { n: 25, p50: 1, p95: 1.8536, p99: 2 };
  return {
    schemaVersion: 2,
    notCapacityEvidence: true,
    runId: "local-test",
    recordedAt: "2026-10-07T00:00:00Z",
    iterations: 25,
    dataset: { questionsPerPublication: 100, sectionsPerPublication: 2 },
    pageSize: 20,
    poolMax: 10,
    statementTimeoutMs: 2000,
    lockTimeoutMs: 500,
    node: "v24",
    platform: "darwin",
    arch: "arm64",
    detailPayloadBytes: 500,
    browseMs: measured,
    detailMs: measured,
    publishMs: measured,
    reads: {
      queryCount: 50,
      errorCount: 0,
      transactionMs: { n: 0, p50: null, p95: null, p99: null },
    },
    publication: {
      queryCount: 325,
      errorCount: 0,
      transactionMs: measured,
      lockRoundTripMs: measured,
      acquireMs: measured,
      queriesPerCall: { n: 25, p50: 13, p95: 13, p99: 13 },
      pool: { maxTotal: 1, maxActive: 1, maxWaiting: 0 },
    },
  };
}

test("generates latency summary from its own raw run rather than a previous run", () => {
  const data = fixture();
  const first = renderCatalogDiagnostic(data);
  assert.match(first, /Browse projection \| 25 \| 1\.000 \| 1\.854 \| 2\.000/);
  data.browseMs = { n: 25, p50: 2, p95: 2.882, p99: 3 };
  assert.match(
    renderCatalogDiagnostic(data),
    /Browse projection \| 25 \| 2\.000 \| 2\.882 \| 3\.000/,
  );
});

test("absent transaction samples remain not measured and zero-valued evidence is rejected", () => {
  const data = fixture();
  assert.match(
    renderCatalogDiagnostic(data),
    /Read transactions \| 0 \| not measured \| not measured \| not measured/,
  );
  data.reads.transactionMs = { n: 0, p50: 0, p95: 0, p99: 0 };
  assert.throws(() => renderCatalogDiagnostic(data), /Absent samples require null/);
});

test("freezing an existing evidence directory cannot replace its raw sample or summary", async () => {
  const directory = await mkdtemp(join(tmpdir(), "catalog-diagnostic-"));
  try {
    const input = join(directory, "input.json"),
      output = join(directory, "frozen");
    const first = JSON.stringify(fixture());
    await writeFile(input, first);
    await freezeCatalogDiagnostic(input, output);
    await writeFile(input, JSON.stringify({ ...fixture(), runId: "another-run" }));
    await assert.rejects(freezeCatalogDiagnostic(input, output), { code: "EEXIST" });
    assert.equal(await readFile(join(output, "diagnostic.json"), "utf8"), first);
    assert.match(await readFile(join(output, "README.md"), "utf8"), /local-test/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
