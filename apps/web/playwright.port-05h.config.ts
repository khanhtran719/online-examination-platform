import { defineConfig } from "playwright/test";

import base from "./playwright.config";

process.env.WEB_EVIDENCE_DIR = "../../.local/web-evidence/port-05h";
process.env.PLAYWRIGHT_NO_COPY_PROMPT = "1";

export default defineConfig(base, {
  webServer: [
    {
      command: "npm run preview:demo",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: false,
      timeout: 15_000,
    },
    {
      command: "npm run preview -- --port 4174",
      url: "http://127.0.0.1:4174",
      reuseExistingServer: false,
      timeout: 15_000,
    },
  ],
  reporter: [
    ["list"],
    ["json", { outputFile: "../../.local/web-evidence/port-05h/playwright-delivery.json" }],
  ],
});
