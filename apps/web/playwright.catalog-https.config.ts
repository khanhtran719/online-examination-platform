import { defineConfig } from "playwright/test";

process.env.PLAYWRIGHT_NO_COPY_PROMPT = "1";

export default defineConfig({
  testDir: "./e2e/catalog-https",
  timeout: 60_000,
  expect: { timeout: 12_000 },
  workers: 1,
  fullyParallel: false,
  retries: 0,
  preserveOutput: "never",
  outputDir: "../../.local/web-evidence/web-03/artifacts",
  reporter: [["./e2e/catalog-https/reporter.mjs"]],
  use: { trace: "off", screenshot: "off", video: "off", ignoreHTTPSErrors: false },
});
