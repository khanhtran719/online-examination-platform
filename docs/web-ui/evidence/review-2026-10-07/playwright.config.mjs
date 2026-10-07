import { defineConfig } from "../../../../apps/web/node_modules/playwright/test.mjs";
export default defineConfig({
  testDir: new URL(".", import.meta.url).pathname,
  timeout: 45000,
  expect: { timeout: 12000 },
  workers: 1,
  retries: 0,
  reporter: [
    ["list"],
    ["json", { outputFile: "/private/tmp/web-ui-review-20261007/results.json" }],
  ],
  outputDir: "/private/tmp/web-ui-review-20261007/test-results",
  use: { baseURL: "http://127.0.0.1:4173", headless: true, screenshot: "only-on-failure" },
});
