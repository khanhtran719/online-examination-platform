const path = require("node:path");
const rootDir = path.resolve(__dirname, "../../..");

module.exports = {
  ...require(path.join(rootDir, "jest.config.cjs")),
  rootDir,
  testMatch: ["<rootDir>/docs/evidence/catalog-review-2026-10-07/review.spec.ts"],
  testTimeout: 30_000,
};
