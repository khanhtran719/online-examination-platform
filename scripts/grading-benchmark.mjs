import { createRequire } from "node:module";
import { writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { platform, arch, release, cpus } from "node:os";
const require = createRequire(import.meta.url);
const { grade } = require("../dist/modules/assessment/domain/grading.js");
const scenarios = [];
for (const size of [100, 500]) {
  const questions = Array.from({ length: size }, (_, i) => ({
    id: `q${i}`,
    sectionId: `s${Math.floor(i / 50)}`,
    type: "MULTIPLE_CHOICE",
    points: 1000,
    optionIds: Array.from({ length: 10 }, (_, j) => `${i}-${j}`),
    correctIds: Array.from({ length: 10 }, (_, j) => `${i}-${j}`),
  }));
  const answers = questions.map((q) => ({
    questionId: q.id,
    selected: [...q.correctIds].reverse(),
  }));
  for (let i = 0; i < 300; i++) grade(questions, answers);
  global.gc?.();
  const beforeHeap = process.memoryUsage().heapUsed,
    beforeCpu = process.cpuUsage();
  const times = [];
  for (let i = 0; i < 2000; i++) {
    const start = performance.now();
    const result = grade(questions, answers);
    times.push(performance.now() - start);
    if (result.earned !== size * 1000 || result.correct !== size)
      throw new Error("Invalid benchmark result");
  }
  const cpu = process.cpuUsage(beforeCpu);
  times.sort((a, b) => a - b);
  scenarios.push({
    questions: size,
    optionsPerQuestion: 10,
    selectedPerQuestion: 10,
    samples: times.length,
    p50Ms: times[Math.ceil(times.length * 0.5) - 1],
    p95Ms: times[Math.ceil(times.length * 0.95) - 1],
    p99Ms: times[Math.ceil(times.length * 0.99) - 1],
    cpuMicrosPerGrade: (cpu.user + cpu.system) / times.length,
    observedHeapDeltaBytes: process.memoryUsage().heapUsed - beforeHeap,
  });
}
const result = {
  timestamp: new Date().toISOString(),
  node: process.version,
  host: { platform: platform(), arch: arch(), release: release(), cpu: cpus()[0]?.model },
  sourceSha256: createHash("sha256")
    .update(readFileSync("apps/api/src/modules/assessment/domain/grading.ts"))
    .digest("hex"),
  scenarios,
  scope:
    "Pure synchronous compute only; heap delta includes GC and samples, not allocated bytes/job. No I/O, locking, queue delay, sustainable capacity or AWS cost measured.",
};
if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify(result, null, 2) + "\n");
process.stdout.write(JSON.stringify(result, null, 2) + "\n");
