import { rm, lstat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
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
const result = spawnSync(
  process.execPath,
  ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json"],
  { stdio: "inherit" },
);
if (result.error) throw new Error("Compiler failed to start");
process.exitCode = result.status ?? 1;
