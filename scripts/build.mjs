import { lstat, rm } from "node:fs/promises";
import { resolve } from "node:path";

import { compileProject } from "./compile.mjs";
import { copyMigrationBundle } from "./migration-assets.mjs";

// dist is generated output. Remove obsolete paths after source-folder refactors.
const output = resolve("dist");
try {
  const info = await lstat(output);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("Invalid build output");
  await rm(output, { recursive: true });
} catch (error) {
  if (!error || typeof error !== "object" || !("code" in error) || error.code !== "ENOENT")
    throw error;
}
process.exitCode = compileProject(resolve("tsconfig.json")) ? 0 : 1;

if (process.exitCode === 0)
  await copyMigrationBundle(
    resolve("apps/api/src/infrastructure/database/migrations"),
    resolve("dist/infrastructure/database/migrations"),
  );
