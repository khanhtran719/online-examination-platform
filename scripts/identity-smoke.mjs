import { spawn } from "node:child_process";
import { performance } from "node:perf_hooks";
if (process.env.NODE_ENV === "production") throw new Error("Local smoke only");
const children = [];
function start(file, entry, port) {
  const child = spawn(process.execPath, [`--env-file=${file}`, entry], {
    env: { ...process.env, PORT: String(port), PUBLIC_ORIGIN: "http://127.0.0.1:13000" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let exited = false;
  const done = new Promise((resolve) =>
    child.once("exit", (code) => {
      exited = true;
      resolve(code);
    }),
  );
  child.stdout.on("data", () => undefined);
  child.stderr.on("data", () => undefined);
  const item = { child, done, exited: () => exited, port };
  children.push(item);
  return item;
}
async function ready(item) {
  for (let i = 0; i < 100; i++) {
    if (item.exited()) throw new Error("Entry point exited before readiness");
    try {
      const response = await fetch(`http://127.0.0.1:${item.port}/ready`);
      const value = await response.json();
      if (response.status === 200 && value.status === "ok") return;
    } catch {
      /* Wait for socket startup. */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Readiness timeout");
}
const result = { api: false, worker: false, shutdownMs: null };
try {
  const api = start(".env.example", "dist/main.js", 13000),
    worker = start(".env.worker.example", "dist/worker.js", 13001);
  await ready(api);
  await ready(worker);
  for (const item of [api, worker]) {
    const response = await fetch(`http://127.0.0.1:${item.port}/live`);
    if (response.status !== 200 || (await response.json()).status !== "ok")
      throw new Error("Liveness failed");
  }
  result.api = true;
  result.worker = true;
  const at = performance.now();
  for (const item of children) item.child.kill("SIGTERM");
  const codes = await Promise.race([
    Promise.all(children.map((c) => c.done)),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Shutdown timeout")), 10000).unref(),
    ),
  ]);
  if (codes.some((code) => code !== 0)) throw new Error("Entry point shutdown failed");
  result.shutdownMs = performance.now() - at;
  process.stdout.write(JSON.stringify({ event: "identity.smoke.completed", ...result }) + "\n");
} finally {
  for (const item of children) if (!item.exited()) item.child.kill("SIGTERM");
}
