import { execFileSync } from "node:child_process";
import {
  createHash,
  generateKeyPairSync,
  randomBytes,
  randomUUID,
  X509Certificate,
} from "node:crypto";
import { chmod, cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { request as httpRequest } from "node:http";
import { Agent, createServer, get, request as httpsRequest } from "node:https";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { Pool } = require("pg");
const { databaseConfig } = require("../dist/config/database.config.js");
const { migrate, loadMigrations } = require("../dist/infrastructure/database/migration-runner.js");
const {
  PostgresDatabase,
} = require("../dist/infrastructure/database/transaction/postgres-database.js");
const {
  loadRuntimeConfig,
} = require("../dist/infrastructure/security/authentication/secret-loader.js");
const {
  createHttpApplication,
} = require("../dist/infrastructure/http/configure-http-application.js");
const { AppModule } = require("../dist/app.module.js");
const { createVerificationWorker } = require("../dist/modules/identity/identity-worker.factory.js");
const pause = (ms) => new Promise((done) => setTimeout(done, ms));
async function buildDigests(directory, prefix) {
  const files = [];
  async function visit(path) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const file = join(path, entry.name);
      if (entry.isDirectory()) await visit(file);
      else if (entry.isFile()) {
        const bytes = await readFile(file);
        files.push({
          path: `${prefix}/${relative(directory, file).split(sep).join("/")}`,
          sha256: createHash("sha256").update(bytes).digest("hex"),
          bytes: bytes.length,
        });
      }
    }
  }
  await visit(directory);
  return files.sort((a, b) => a.path.localeCompare(b.path));
}
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".svg": "image/svg+xml",
};
const routes = new Set([
  "/v1/auth/csrf",
  "/v1/auth/register",
  "/v1/auth/login",
  "/v1/auth/email-verification/request",
  "/v1/auth/email-verification/confirm",
  "/v1/auth/refresh",
  "/v1/auth/logout",
  "/v1/me",
  "/ready",
  "/live",
]);

/** Disposable integration boundary. All addresses and secrets belong to this local test run. */
export async function startIdentityHttps() {
  if (process.env.NODE_ENV === "production") throw new Error("Local HTTPS fixture only");
  const temp = await mkdtemp(join(tmpdir(), "exam-identity-https-"));
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  const name = `identity_https_${suffix}`;
  const roles = {
    ddl: `https_ddl_${suffix}`,
    api: `https_api_${suffix}`,
    mail: `https_mail_${suffix}`,
  };
  const password = randomUUID();
  const adminUrl =
    "postgres://examination_https:local-https-only-password@127.0.0.1:55435/examination_https";
  const admin = new Pool({ connectionString: adminUrl, max: 1 });
  let fixture,
    mailDb,
    worker,
    api,
    server,
    upstream,
    config,
    created = false;
  const logs = [],
    requests = [],
    drops = new Map();
  const saved = new Map();
  async function stopApi() {
    if (!api) return;
    const current = api;
    api = null;
    current.drain();
    await current.app.close();
    await current.app.get(PostgresDatabase).close();
  }
  async function startApi() {
    api = await createHttpApplication(AppModule.forRoot(config), {
      log: (event) => logs.push(event),
    });
    await api.app.listen(0, "127.0.0.1");
    upstream = api.app.getHttpServer().address().port;
  }
  async function close() {
    if (server?.listening)
      await new Promise((done) => {
        server.close(done);
        server.closeAllConnections();
      });
    await stopApi();
    worker?.close();
    await mailDb?.close();
    await fixture?.end();
    if (created) {
      await admin.query(`DROP DATABASE ${name} WITH (FORCE)`);
      for (const role of Object.values(roles)) await admin.query(`DROP ROLE IF EXISTS ${role}`);
    }
    await admin.end();
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await rm(temp, { recursive: true, force: true });
  }
  try {
    // Serve an immutable snapshot: other UI builds must not replace assets mid-suite.
    const webRoot = join(temp, "web");
    await cp(join(root, "apps/web/dist"), webRoot, { recursive: true });
    const buildProvenance = {
      recordedAt: new Date().toISOString(),
      webFiles: await buildDigests(webRoot, "apps/web/dist"),
      apiFiles: await buildDigests(join(root, "dist"), "dist"),
    };
    await admin.query(`CREATE DATABASE ${name}`);
    created = true;
    await admin.query(await readFile(join(root, "infra/database/roles.sql"), "utf8"));
    await admin.query(`GRANT CREATE ON DATABASE ${name} TO examination_owner`);
    for (const [kind, role] of Object.entries(roles)) {
      await admin.query(
        `CREATE ROLE ${role} LOGIN ${kind === "ddl" ? "NOINHERIT" : "INHERIT"} PASSWORD '${password}'`,
      );
      const parent = {
        ddl: "examination_owner",
        api: "examination_runtime",
        mail: "examination_mail_worker",
      }[kind];
      await admin.query(`GRANT ${parent} TO ${role}`);
    }
    function dbUrl(role) {
      const url = new URL(adminUrl);
      url.pathname = `/${name}`;
      if (role) {
        url.username = role;
        url.password = password;
      }
      return url.toString();
    }
    await migrate(
      databaseConfig({ NODE_ENV: "test", DATABASE_URL: dbUrl(roles.ddl) }),
      await loadMigrations(join(root, "dist/infrastructure/database/migrations")),
    );
    fixture = new Pool({ connectionString: dbUrl(), max: 2 });
    const pair = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    const files = {
      "signing.pem": pair.privateKey.export({ type: "pkcs8", format: "pem" }),
      "public.json": JSON.stringify([
        {
          kid: "https-test",
          publicPem: pair.publicKey.export({ type: "spki", format: "pem" }).toString(),
        },
      ]),
      "email.json": JSON.stringify({
        activeKid: "https-mail",
        keys: { "https-mail": randomBytes(32).toString("base64url") },
      }),
      "csrf.key": randomBytes(32).toString("base64url"),
      "rate.key": randomBytes(32).toString("base64url"),
    };
    for (const [file, data] of Object.entries(files))
      await writeFile(join(temp, file), data, { mode: 0o600, flag: "wx" });
    execFileSync(
      "openssl",
      [
        "req",
        "-x509",
        "-newkey",
        "ec",
        "-pkeyopt",
        "ec_paramgen_curve:prime256v1",
        "-nodes",
        "-days",
        "1",
        "-subj",
        "/CN=localhost",
        "-addext",
        "subjectAltName=DNS:localhost,IP:127.0.0.1",
        "-keyout",
        join(temp, "tls.key"),
        "-out",
        join(temp, "tls.pem"),
      ],
      { stdio: "ignore", timeout: 10000 },
    );
    const cert = await readFile(join(temp, "tls.pem"));
    await chmod(join(temp, "tls.key"), 0o600);
    const key = await readFile(join(temp, "tls.key"));
    // Pin one ephemeral leaf SPKI in Chromium; never disable all certificate errors or install an OS CA.
    const spki = createHash("sha256")
      .update(new X509Certificate(cert).publicKey.export({ type: "spki", format: "der" }))
      .digest("base64");
    const index = await readFile(join(webRoot, "index.html"));
    server = createServer({ cert, key, minVersion: "TLSv1.2" }, async (request, response) => {
      const url = new URL(request.url, "https://localhost");
      if (
        url.pathname === "/v1" ||
        url.pathname.startsWith("/v1/") ||
        ["/ready", "/live"].includes(url.pathname)
      ) {
        const path = routes.has(url.pathname) ? url.pathname : "unmatched";
        const observation = {
          method: request.method,
          path,
          originMatches: request.headers.origin === origin,
          csrfHeader: typeof request.headers["x-csrf-token"] === "string",
          contentType: request.headers["content-type"] ?? null,
          status: null,
          dropped: false,
        };
        requests.push(observation);
        const proxy = httpRequest(
          {
            host: "127.0.0.1",
            port: upstream,
            method: request.method,
            path: request.url,
            headers: { ...request.headers, host: request.headers.host },
          },
          (result) => {
            observation.status = result.statusCode;
            const dropKey = `${request.method} ${url.pathname}`;
            if (drops.has(dropKey)) {
              const mode = drops.get(dropKey);
              drops.delete(dropKey);
              observation.dropped = mode === "disconnect";
              observation.held = mode === "stall";
              result.resume();
              // An incomplete response avoids Chromium's implicit retry on an empty keep-alive
              // socket close. Never forward Set-Cookie: the commit is durable, its ACK is lost.
              result.once("end", () => {
                response.writeHead(200, {
                  "content-type": "application/json",
                  "content-length": "100",
                });
                response.write("{");
                if (mode === "stall") response.setTimeout(12000, () => response.destroy());
                else setImmediate(() => response.destroy());
              });
            } else {
              response.writeHead(result.statusCode, result.headers);
              result.pipe(response);
            }
          },
        );
        proxy.setTimeout(12000, () => proxy.destroy());
        proxy.on("error", () => {
          if (!response.headersSent) response.writeHead(502);
          response.end();
        });
        request.pipe(proxy);
        return;
      }
      try {
        const path = resolve(webRoot, `.${decodeURIComponent(url.pathname)}`);
        if (path !== webRoot && !path.startsWith(webRoot + sep)) {
          response.writeHead(400);
          response.end();
          return;
        }
        let body = index,
          type = mime[".html"],
          immutable = false;
        if (extname(path)) {
          body = await readFile(path);
          type = mime[extname(path)] ?? "application/octet-stream";
          immutable = url.pathname.startsWith("/assets/");
        }
        response.writeHead(200, {
          "content-type": type,
          "cache-control": immutable ? "public,max-age=31536000,immutable" : "no-store",
          "referrer-policy": "no-referrer",
          "x-content-type-options": "nosniff",
        });
        response.end(body);
      } catch {
        response.writeHead(404);
        response.end();
      }
    });
    await new Promise((done, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", done);
    });
    const origin = `https://127.0.0.1:${server.address().port}`;
    const env = {
      NODE_ENV: "test",
      DATABASE_URL: dbUrl(roles.api),
      DB_SSL: "false",
      DB_POOL_MAX: "4",
      PUBLIC_ORIGIN: origin,
      JWT_ISSUER: "urn:exam:identity:https-test",
      JWT_ACTIVE_KID: "https-test",
      JWT_PRIVATE_KEY_FILE: join(temp, "signing.pem"),
      JWT_PUBLIC_KEYS_FILE: join(temp, "public.json"),
      EMAIL_KEYS_FILE: join(temp, "email.json"),
      CSRF_KEY_FILE: join(temp, "csrf.key"),
      RATE_KEY_FILE: join(temp, "rate.key"),
      MAIL_ADAPTER: "smtp",
      MAIL_FROM: "no-reply@example.test",
      SMTP_HOST: "127.0.0.1",
      SMTP_PORT: "13025",
    };
    for (const [key, value] of Object.entries(env)) {
      saved.set(key, process.env[key]);
      process.env[key] = value;
    }
    config = await loadRuntimeConfig(env, "api");
    await startApi();
    const workerEnv = {
      ...env,
      DATABASE_URL: dbUrl(roles.mail),
      JWT_PRIVATE_KEY_FILE: undefined,
      JWT_PUBLIC_KEYS_FILE: undefined,
      JWT_ACTIVE_KID: undefined,
      CSRF_KEY_FILE: undefined,
    };
    mailDb = new PostgresDatabase(databaseConfig(workerEnv));
    worker = createVerificationWorker(await loadRuntimeConfig(workerEnv, "worker"), mailDb);
    return {
      origin,
      spki,
      logs,
      requests,
      buildProvenance,
      fixture,
      close,
      restart: async () => {
        await stopApi();
        await startApi();
      },
      dropNext(method, path, mode = "disconnect") {
        drops.set(`${method} ${path}`, mode);
      },
      async request(context, method, path, body, overrides = {}, csrf = true) {
        // Test protocol only: never expose cookie values or credentials through page JS or artifacts.
        const agent = new Agent({ ca: cert, rejectUnauthorized: true });
        async function send(verb, target, data, headers) {
          const cookies = await context.cookies(origin);
          const payload = data === undefined ? undefined : JSON.stringify(data);
          const result = await new Promise((done, reject) => {
            const req = httpsRequest(
              origin + target,
              {
                agent,
                servername: "localhost",
                method: verb,
                headers: {
                  cookie: cookies.map((c) => `${c.name}=${c.value}`).join("; "),
                  ...(payload === undefined
                    ? {}
                    : {
                        "content-type": "application/json",
                        "content-length": Buffer.byteLength(payload),
                      }),
                  ...headers,
                },
              },
              (res) => {
                let value = "";
                res.on("data", (chunk) => {
                  value += chunk;
                });
                res.once("end", () =>
                  done({ status: res.statusCode, headers: res.headers, text: value }),
                );
              },
            );
            req.setTimeout(10000, () => req.destroy());
            req.once("error", reject);
            req.end(payload);
          });
          for (const raw of result.headers["set-cookie"] ?? []) {
            const parts = raw.split(";").map((s) => s.trim());
            const [name, value] = parts[0].split(/=(.*)/s);
            const age = parts.find((s) => /^max-age=/i.test(s))?.split("=")[1];
            await context.addCookies([
              {
                name,
                value,
                domain: "127.0.0.1",
                path: "/",
                secure: parts.some((s) => /^secure$/i.test(s)),
                httpOnly: parts.some((s) => /^httponly$/i.test(s)),
                sameSite: "Lax",
                ...(age === undefined ? {} : { expires: Date.now() / 1000 + Number(age) }),
              },
            ]);
          }
          return result;
        }
        try {
          const token =
            csrf && method !== "GET"
              ? JSON.parse((await send("GET", "/v1/auth/csrf", undefined, {})).text).data.csrfToken
              : null;
          return await send(method, path, body, {
            ...(method === "GET" ? {} : { origin, ...(token ? { "x-csrf-token": token } : {}) }),
            ...overrides,
          });
        } finally {
          agent.destroy();
        }
      },
      async tlsProbe(servername = "localhost", trusted = true) {
        const agent = new Agent({ ...(trusted ? { ca: cert } : {}), rejectUnauthorized: true });
        try {
          return await new Promise((done) => {
            const request = get(origin + "/ready", { agent, servername }, (response) => {
              const result = {
                authorized: response.socket.authorized,
                protocol: response.socket.getProtocol(),
                status: response.statusCode,
              };
              response.resume();
              response.once("end", () => done(result));
            });
            request.setTimeout(3000, () => request.destroy());
            request.on("error", (error) => done({ authorized: false, code: error.code }));
          });
        } finally {
          agent.destroy();
        }
      },
      async mailLink(email) {
        for (let i = 0; i < 100; i++) {
          await worker.runOnce();
          const list = await (
            await fetch("http://127.0.0.1:20025/api/v1/messages", {
              signal: AbortSignal.timeout(3000),
            })
          ).json();
          const message = list.messages.find((m) => m.To.some((to) => to.Address === email));
          if (message) {
            const content = await (
              await fetch(`http://127.0.0.1:20025/api/v1/message/${message.ID}`, {
                signal: AbortSignal.timeout(3000),
              })
            ).json();
            const link = content.Text.match(
              /https:\/\/[^\s]+\/verify-email#token=[A-Za-z0-9_-]{43}/,
            )?.[0];
            if (!link || new URL(link).origin !== origin)
              throw new Error("Invalid local mail destination");
            return link; // Memory only; callers must never attach/print this value.
          }
          await pause(50);
        }
        throw new Error("Local verification mail timeout");
      },
    };
  } catch (error) {
    await close();
    throw error;
  }
}
