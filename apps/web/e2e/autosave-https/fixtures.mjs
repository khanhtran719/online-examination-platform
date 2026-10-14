import { mkdir, writeFile } from "node:fs/promises";

import { startIdentityHttps } from "../../../../scripts/identity-https-fixture.mjs";
import { test as assessmentTest } from "../assessment-https/fixtures.mjs";

// Keep dataset/browser/account fixtures; diagnostics for this gate have a distinct lifecycle.
export const test = assessmentTest.extend({
  harness: [
    async ({}, provide) => {
      const harness = await startIdentityHttps();
      try {
        await provide(harness);
      } finally {
        try {
          await mkdir("../../.local/web-evidence/web-05", { recursive: true });
          await writeFile(
            "../../.local/web-evidence/web-05/boundaries.json",
            JSON.stringify(
              {
                requests: harness.requests,
                httpLogs: harness.logs,
                buildProvenance: harness.buildProvenance,
              },
              null,
              2,
            ),
          );
        } finally {
          await harness.close();
        }
      }
    },
    { scope: "worker", timeout: 60_000 },
  ],
});
export { expect } from "playwright/test";
