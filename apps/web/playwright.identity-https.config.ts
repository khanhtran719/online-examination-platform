import { defineConfig } from "playwright/test";

// Verified against pinned Playwright1.63: avoid automatic DOM snapshots of auth forms.
process.env.PLAYWRIGHT_NO_COPY_PROMPT = "1";

export default defineConfig({
  testDir: "./e2e/identity-https",
  timeout: 45_000,
  expect: { timeout: 12_000 },
  workers: 1,
  fullyParallel: false,
  retries: 0,
  preserveOutput: "never",
  outputDir: ".local/identity-https-results/artifacts",
  reporter: [["./e2e/identity-https/reporter.mjs"]],
  use: {
    trace: "off",
    screenshot: "off",
    video: "off",
    ignoreHTTPSErrors: false,
  },
});
