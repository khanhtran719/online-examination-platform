import { defineConfig, devices } from "playwright/test";

// Review artifacts are local outputs; only authored reports belong in docs.
process.env.WEB_EVIDENCE_DIR ??= "../../.local/web-evidence/latest";

export default defineConfig({
  testDir: "./e2e",
  testMatch: ["**/*.spec.ts", "**/*.e2e-spec.ts"],
  testIgnore: "**/identity-https/**",
  timeout: 45_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["json", { outputFile: "playwright-report/results.json" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
