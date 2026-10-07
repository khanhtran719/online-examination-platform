import { readFile, writeFile } from "node:fs/promises";
import { median } from "./statistics.mjs";
const here = new URL("./", import.meta.url),
  raw = JSON.parse(await readFile(new URL("raw.json", here), "utf8"));
if (
  raw.runs.length !== 75 ||
  raw.runs.some((run) => Object.values(run.measurements).some((m) => m.errors))
)
  throw new Error("Incomplete/failed experiment cannot be reported as passed");
const modes = ["pg", "typeorm.raw", "typeorm.mapped", "sequelize.raw", "sequelize.mapped"];
const summary = {
  timestamp: raw.timestamp,
  scope: raw.scope,
  samples: 0,
  errors: 0,
  startup: [],
  groups: [],
};
for (const candidate of ["pg", "typeorm", "sequelize"]) {
  const runs = raw.startup.filter((run) => run.candidate === candidate);
  summary.startup.push({
    candidate,
    bootstrapMs: median(runs.map((run) => run.bootstrapMs)),
    wallMs: median(runs.map((run) => run.wallMs)),
    rssBytes: median(runs.map((run) => run.rssBytes)),
    raw: runs,
  });
}
for (const concurrency of [1, 8, 32])
  for (const mode of modes)
    for (const operation of ["account", "principal", "refresh", "profile"]) {
      const runs = raw.runs.filter((run) => run.concurrency === concurrency && run.mode === mode);
      const values = runs.map((run) => run.measurements[operation]);
      const aggregate = (pick) => {
        const list = values.map(pick);
        return { median: median(list), min: Math.min(...list), max: Math.max(...list) };
      };
      const paired = runs.map((run) => {
        const reference = raw.runs.find(
          (other) =>
            other.block === run.block && other.concurrency === concurrency && other.mode === "pg",
        ).measurements[operation];
        return {
          block: run.block,
          p95Percent:
            (run.measurements[operation].latencyMs.p95 / reference.latencyMs.p95 - 1) * 100,
          cpuPercent:
            (run.measurements[operation].cpuMsPerOperation / reference.cpuMsPerOperation - 1) * 100,
        };
      });
      summary.samples += values.reduce((count, value) => count + value.samples, 0);
      summary.errors += values.reduce((count, value) => count + value.errors, 0);
      summary.groups.push({
        concurrency,
        mode,
        operation,
        blocks: values.length,
        samples: values.reduce((count, value) => count + value.samples, 0),
        p50Ms: aggregate((m) => m.latencyMs.p50),
        p95Ms: aggregate((m) => m.latencyMs.p95),
        p99Ms: aggregate((m) => m.latencyMs.p99),
        successfulRps: aggregate((m) => m.successfulRps),
        cpuMsPerOperation: aggregate((m) => m.cpuMsPerOperation),
        queriesPerOperation: aggregate((m) => m.db.queriesPerOperation),
        poolP95Ms: aggregate((m) => m.db.poolAcquireMs?.p95 ?? 0),
        lockP95Ms: aggregate((m) => m.db.lockMs?.p95 ?? 0),
        transactionP95Ms: aggregate((m) => m.db.transactionMs?.p95 ?? 0),
        maxConnections: Math.max(...values.map((m) => m.db.maxTotal)),
        maxWaiters: Math.max(...values.map((m) => m.db.maxWaiting)),
        paired,
        pairedP95PercentMedian: median(paired.map((p) => p.p95Percent)),
        pairedCpuPercentMedian: median(paired.map((p) => p.cpuPercent)),
      });
    }
await writeFile(new URL("summary.json", here), JSON.stringify(summary, null, 2) + "\n");
let markdown =
  "# Local measurements\n\nGenerated from raw.json by analyze.mjs. Five blocks; each cell is the median of five per-run values, not a pooled percentile. Ranges and paired deltas are in summary.json. Achieved RPS is short closed-loop application throughput, not HTTP/sustainable capacity. CPU includes the harness; AWS cost and database CPU are unmeasured.\n\n";
markdown +=
  "| Candidate | Cold bootstrap ms | Process wall ms | Cold RSS MiB |\n| --- | ---: | ---: | ---: |\n";
for (const row of summary.startup)
  markdown += `| ${row.candidate} | ${row.bootstrapMs.toFixed(2)} | ${row.wallMs.toFixed(2)} | ${(row.rssBytes / 1048576).toFixed(2)} |\n`;
for (const operation of ["account", "principal", "refresh", "profile"]) {
  markdown += `\n## ${operation}\n\n| Concurrency | Mode | p50 ms | p95 ms | p99 ms | successful RPS | CPU ms/op | queries/op | pool p95 ms | transaction p95 ms |\n| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |\n`;
  for (const row of summary.groups.filter((row) => row.operation === operation))
    markdown += `| ${row.concurrency} | ${row.mode} | ${row.p50Ms.median.toFixed(2)} | ${row.p95Ms.median.toFixed(2)} | ${row.p99Ms.median.toFixed(2)} | ${row.successfulRps.median.toFixed(1)} | ${row.cpuMsPerOperation.median.toFixed(3)} | ${row.queriesPerOperation.median.toFixed(2)} | ${row.poolP95Ms.median.toFixed(2)} | ${row.transactionP95Ms.median.toFixed(2)} |\n`;
}
await writeFile(new URL("measurements.md", here), markdown);
process.stdout.write(
  JSON.stringify(
    {
      samples: summary.samples,
      errors: summary.errors,
      startup: summary.startup.map(({ raw: _raw, ...value }) => value),
      highConcurrency: summary.groups
        .filter((group) => group.concurrency === 32)
        .map((group) => ({
          mode: group.mode,
          operation: group.operation,
          p95Ms: group.p95Ms.median,
          p99Ms: group.p99Ms.median,
          rps: group.successfulRps.median,
          queries: group.queriesPerOperation.median,
          cpu: group.cpuMsPerOperation.median,
        })),
    },
    null,
    2,
  ) + "\n",
);
