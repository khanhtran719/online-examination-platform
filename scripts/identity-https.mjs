import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

// Test infrastructure only. No external account, recipient, OS trust or production deployment.
if (process.env.NODE_ENV === "production") throw new Error("Local HTTPS tests only");
const root = fileURLToPath(new URL("../", import.meta.url));
async function run(command, args, cwd = root) {
  const child = spawn(command, args, { cwd, stdio: "inherit" });
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
}
let started = false;
try {
  if (await run("npm", ["run", "build"])) throw new Error("API build failed");
  if (await run("npm", ["run", "web:build"])) throw new Error("Live web build failed");
  started = true;
  if (
    await run("docker", [
      "compose",
      "-f",
      "infra/identity-https/compose.yaml",
      "up",
      "-d",
      "--wait",
    ])
  )
    throw new Error("Local HTTPS dependencies failed");
  process.exitCode = await run(
    "npm",
    ["run", "test:identity:https", "--", ...process.argv.slice(2)],
    `${root}apps/web`,
  );
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
} finally {
  if (
    started &&
    (await run("docker", ["compose", "-f", "infra/identity-https/compose.yaml", "stop"]))
  )
    process.exitCode = 1;
}
