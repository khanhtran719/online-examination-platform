import ts from "../../../../node_modules/typescript/lib/typescript.js";
import { fileURLToPath } from "node:url";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
const root = fileURLToPath(new URL("../../../../apps/web/src/", import.meta.url));
const out = "/private/tmp/web-ui-review-20261007/modules";
const compiled = new Set();
async function compile(relative) {
  if (compiled.has(relative)) return;
  compiled.add(relative);
  const input = await readFile(path.join(root, relative), "utf8");
  let code = ts.transpileModule(input, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  }).outputText;
  const imports = [...code.matchAll(/from ["'](\.[^"']+)["']/g)];
  for (const match of imports) {
    const dependency = path.join(path.dirname(relative), match[1] + ".ts");
    await compile(dependency);
    code = code.replace(match[0], `from '${match[1]}.mjs'`);
  }
  const destination = path.join(out, relative.replace(/\.ts$/, ".mjs"));
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, code);
}
await compile("live/create-http-api.ts");
await compile("features/assessment/autosave.ts");
const { createHttpApi } = await import(`file://${out}/live/create-http-api.mjs`);
const auto = await import(`file://${out}/features/assessment/autosave.mjs`);
let cookie = "";
let issued = 0;
const envelope = (data) => ({ data, status: true, errorCode: null, message: null });
const fakeFetch = async (url, input) => {
  if (url === "/v1/auth/csrf") {
    cookie = `synthetic-${++issued}`;
    return new Response(
      JSON.stringify(
        envelope({ csrfToken: cookie, expiresAt: new Date(Date.now() + 600000).toISOString() }),
      ),
      { status: 200 },
    );
  }
  if (new Headers(input.headers).get("X-CSRF-Token") !== cookie)
    return new Response(
      JSON.stringify({ data: null, status: false, errorCode: "Forbidden", message: "Forbidden" }),
      { status: 403 },
    );
  return new Response(
    JSON.stringify(
      envelope({
        resourceId: "00000000-0000-4000-8000-000000000001",
        revision: 2,
        acceptedAt: new Date().toISOString(),
      }),
    ),
    { status: 200 },
  );
};
const first = createHttpApi(fakeFetch);
const second = createHttpApi(fakeFetch);
const body = { displayName: "Review candidate", leaderboardOptIn: false, expectedRevision: 1 };
const k = "018f4a3c-8c2e-7c3a-8f2a-111111111111";
await first.api.updateProfile(k, body);
await second.api.updateProfile(k, body);
let status = 200;
try {
  await first.api.updateProfile(k, body);
} catch (error) {
  status = error.status;
}
let state = auto.ingestAnswerPage(auto.createAutosaveState(), ["q"], []);
state = auto.editAnswer(
  state,
  { questionId: "q", selectedOptionIds: ["a"], marked: false },
  0,
  0.5,
);
state = auto.capture(state, 500, () => k).state;
state = auto.failRetryable(state, {
  nowMs: 500,
  retryAfterSeconds: 10,
  random: 0,
  allowRetry: true,
});
const results = {
  csrf: {
    sequence: "tab A write -> tab B write -> tab A write",
    lastStatus: status,
    required: 200,
  },
  retryAfter: {
    serverMinimumMs: 10000,
    actualRetryDelayMs: state.inFlight.retryAtMs - 500,
    requiredMinimumMs: 10000,
  },
};
await writeFile(
  "/private/tmp/web-ui-review-20261007/state-probes.json",
  JSON.stringify(results, null, 2),
);
process.stdout.write(JSON.stringify(results, null, 2) + "\n");
