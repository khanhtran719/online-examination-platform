import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

function summary(value) {
  if (!value || !Number.isSafeInteger(value.n) || value.n < 0)
    throw new Error("Invalid diagnostic sample count");
  const values = [value.p50, value.p95, value.p99];
  if (value.n === 0) {
    if (!values.every((item) => item === null)) throw new Error("Absent samples require null");
    return ["0", "not measured", "not measured", "not measured"];
  }
  if (
    !values.every((item) => typeof item === "number" && Number.isFinite(item) && item >= 0) ||
    values[0] > values[1] ||
    values[1] > values[2]
  )
    throw new Error("Invalid diagnostic percentiles");
  return [String(value.n), ...values.map((item) => item.toFixed(3))];
}

export function renderCatalogDiagnostic(data) {
  if (data.schemaVersion !== 2 || data.notCapacityEvidence !== true)
    throw new Error("Only version2 local diagnostics can be frozen");
  const rows = [
    ["Browse projection", data.browseMs],
    ["Detail projection", data.detailMs],
    ["Publish application call", data.publishMs],
    ["Publish transaction including acquisition", data.publication.transactionMs],
    ["Publish lock statement round trip", data.publication.lockRoundTripMs],
    ["Publish connection acquisition", data.publication.acquireMs],
    ["Read transactions", data.reads.transactionMs],
  ].map(([name, values]) => `| ${name} | ${summary(values).join(" | ")} |`);
  return `# Catalog diagnostic — frozen from one run

Run: \`${data.runId}\`; recorded UTC: \`${data.recordedAt}\`.
Source: [diagnostic.json](diagnostic.json). This summary is generated from that file by \`scripts/catalog-diagnostic-report.mjs\`.

## Configuration and scope

Sequential calls on one local restricted PostgreSQL process; ${data.iterations} samples per API operation, ${data.dataset.questionsPerPublication} questions and ${data.dataset.sectionsPerPublication} sections per new publication. Page size ${data.pageSize}; pool max ${data.poolMax}; statement timeout ${data.statementTimeoutMs}ms; lock timeout ${data.lockTimeoutMs}ms. Node ${data.node}, ${data.platform}/${data.arch}.

Browse/detail invoke the actual Catalog query port through the application service. Authentication/rate admission for HTTP is excluded. Publish includes current-session/permission revalidation, receipt lookup, locks, DB clocks, snapshot/pointer, audit/receipt and commit. Draft/import preparation, warm-up, EXPLAIN and provenance generation are excluded.

## Measured milliseconds

| Operation | n | p50 | p95 | p99 |
| --- | --- | --- | --- | --- |
${rows.join("\n")}

Read statements: ${data.reads.queryCount}; read errors: ${data.reads.errorCount}; detail payload: ${data.detailPayloadBytes} bytes. Publish statements: ${data.publication.queryCount}; publish errors: ${data.publication.errorCount}; statements per publication: ${summary(data.publication.queriesPerCall).slice(1).join(" / ")} (p50/p95/p99, counts).

Observed publish pool: max total ${data.publication.pool.maxTotal}, max active ${data.publication.pool.maxActive}, max waiting ${data.publication.pool.maxWaiting}. These are event-sampled pool occupancy values for a sequential diagnostic, not a utilization/headroom benchmark. Lock round trips include SQL execution/network plus any lock wait; they are not lock-hold duration. Read transaction samples are absent because projections autocommit.

## Exact query plans and provenance

Warm-up captures the real adapter SQL and bindings in memory. EXPLAIN ANALYZE/BUFFERS uses those exact statements, including question-count/section aggregation, with the same parameters. Only stripped plans and SQL SHA-256 digests are exported; SQL text, parameters, prompt/key content and credentials are excluded. The raw file includes source/config/migration hashes and the test-source digest.

## Acceptance limits

This is local diagnostic evidence. It does not establish sustainable RPS, concurrent capacity, HTTP SLOs, CPU/memory per request, optimum pool size, AWS costs or an optimization winner. Those remain unmeasured. CAT-10 still needs the actual Assessment start/publication race. Historical diagnostics are retained separately and are not directly comparable across changed datasets or scopes.
`;
}

export async function freezeCatalogDiagnostic(input, output) {
  const bytes = await readFile(input);
  const markdown = renderCatalogDiagnostic(JSON.parse(bytes));
  await mkdir(dirname(output), { recursive: true });
  // Existing evidence directories are immutable; choose a new run directory to freeze again.
  await mkdir(output);
  await writeFile(join(output, "diagnostic.json"), bytes, { flag: "wx" });
  await writeFile(join(output, "README.md"), markdown, { flag: "wx" });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output)
    throw new Error("Usage: node scripts/catalog-diagnostic-report.mjs INPUT OUTPUT_DIRECTORY");
  await freezeCatalogDiagnostic(resolve(input), resolve(output));
  process.stdout.write("Catalog diagnostic frozen; existing evidence was not overwritten.\n");
}
