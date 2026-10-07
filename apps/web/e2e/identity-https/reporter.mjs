import { mkdir, writeFile } from "node:fs/promises";

// Auth artifacts must not retain raw network traces, cookie jars, email URLs or form inputs.
export default class IdentityReporter {
  tests = [];
  onTestEnd(test, result) {
    const record = { name: test.title, status: result.status, durationMs: result.duration };
    this.tests.push(record);
    process.stdout.write(`${record.status.toUpperCase()} ${record.name}\n`);
    for (const error of result.errors) {
      const safe = (error.message ?? "Test failed")
        .replace(/https?:\/\/\S+/g, "[url]")
        .replace(/eyJ[A-Za-z0-9_.-]+/g, "[credential]")
        .replace(/#token=[A-Za-z0-9_-]+/g, "[verification]");
      process.stdout.write(`${safe.slice(0, 1200)}\n`);
    }
  }
  async onEnd(result) {
    await mkdir(".local/identity-https-results", { recursive: true });
    await writeFile(
      ".local/identity-https-results/summary.json",
      JSON.stringify(
        {
          status: result.status,
          tests: this.tests,
          recordedAt: new Date().toISOString(),
          traces: false,
          rawCookies: false,
          rawEmailLinks: false,
        },
        null,
        2,
      ) + "\n",
    );
  }
}
