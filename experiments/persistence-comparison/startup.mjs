import { performance } from "node:perf_hooks";
const at = performance.now();
const { createCandidate } = await import("./candidates.mjs");
const db = await createCandidate(
  process.env.PERSISTENCE_CANDIDATE,
  JSON.parse(process.env.PERSISTENCE_CONFIG),
);
await db.query("diagnostic", "SELECT 1");
process.stdout.write(
  JSON.stringify({
    bootstrapMs: performance.now() - at,
    processUptimeMs: process.uptime() * 1000,
    rssBytes: process.memoryUsage().rss,
    heapUsedBytes: process.memoryUsage().heapUsed,
    pool: db.stats(),
  }),
);
await db.close();
