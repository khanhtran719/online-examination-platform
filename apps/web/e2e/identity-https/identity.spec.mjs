import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, expect, test as base } from "playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { startIdentityHttps } from "../../../../scripts/identity-https-fixture.mjs";

const test = base.extend({
  harness: [
    async ({}, use) => {
      const harness = await startIdentityHttps();
      try {
        await use(harness);
      } finally {
        await mkdir(".local/identity-https-results", { recursive: true });
        await writeFile(
          ".local/identity-https-results/boundaries.json",
          JSON.stringify(
            {
              requests: harness.requests,
              httpLogs: harness.logs,
            },
            null,
            2,
          ) + "\n",
        );
        await harness.close();
      }
    },
    { scope: "worker", timeout: 60000 },
  ],
  browser: [
    async ({ harness }, use) => {
      await mkdir(".local/identity-https-results", { recursive: true });
      const browser = await chromium.launch({
        args: [`--ignore-certificate-errors-spki-list=${harness.spki}`],
      });
      await writeFile(
        ".local/identity-https-results/environment.json",
        JSON.stringify(
          {
            node: process.version,
            browser: browser.version(),
            arch: process.arch,
            platform: process.platform,
            publicPki: false,
            trust: "ephemeral leaf SPKI scoped to Chromium; Node CA/SAN validation",
            ignoreHTTPSErrors: false,
            backend: "real AppModule",
            frontend: "live static build",
            persistence: "restricted-role PostgreSQL with all eight migrations",
            mail: "actual worker SMTP to Mailpit",
            buildProvenance: harness.buildProvenance,
          },
          null,
          2,
        ) + "\n",
      );
      try {
        await use(browser);
      } finally {
        await browser.close();
      }
    },
    { scope: "worker" },
  ],
  context: async ({ browser, harness }, use) => {
    const context = await browser.newContext({
      baseURL: harness.origin,
      ignoreHTTPSErrors: false,
      viewport: { width: 1440, height: 960 },
    });
    try {
      await use(context);
    } finally {
      await context.close();
    }
  },
});

const initialPassword = "local registration password";
const finalPassword = "local email owner password";
const otherPassword = "different retry password";
const email = () => `browser-${randomUUID()}@example.test`;
const responseFor = (page, path, method) =>
  page.waitForResponse(
    (r) => new URL(r.url()).pathname === path && r.request().method() === method,
  );
async function register(page, harness, existingEmail) {
  const account = { email: existingEmail ?? email(), password: finalPassword };
  await page.goto("/register");
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Tên hiển thị", { exact: true }).fill("HTTPS candidate");
  await page.getByLabel("Mật khẩu", { exact: true }).fill(initialPassword);
  await page.getByLabel("Nhập lại mật khẩu", { exact: true }).fill(initialPassword);
  const response = responseFor(page, "/v1/auth/register", "POST");
  await page.getByRole("button", { name: "Tạo tài khoản", exact: true }).click();
  expect((await response).status()).toBe(202);
  await expect(page.getByRole("heading", { name: "Kiểm tra email", exact: true })).toBeVisible();
  account.link = await harness.mailLink(account.email);
  return account;
}
async function confirm(page, account, password = account.password) {
  // External mail navigation opens a document, rather than an in-document hash jump.
  await page.goto("about:blank");
  await page.goto(account.link);
  await expect(page.getByLabel("Mật khẩu mới", { exact: true })).toBeVisible();
  await page.getByLabel("Mật khẩu mới", { exact: true }).fill(password);
  await page.getByLabel("Nhập lại mật khẩu", { exact: true }).fill(password);
  const response = responseFor(page, "/v1/auth/email-verification/confirm", "POST");
  await page.getByRole("button", { name: "Xác nhận email", exact: true }).click();
  return response;
}
async function login(page, account, navigate = true) {
  if (navigate) await page.goto("/login?return=%2Fprofile");
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(account.password);
  const response = responseFor(page, "/v1/auth/login", "POST");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  const loginResponse = await response;
  expect(loginResponse.status()).toBe(200);
  expect(Object.keys((await loginResponse.json()).data).sort()).toEqual([
    "absoluteExpiresAt",
    "accessExpiresAt",
    "refreshExpiresAt",
    "userId",
  ]);
  const setCookies = (await loginResponse.headersArray()).filter(
    (h) => h.name.toLowerCase() === "set-cookie",
  );
  for (const name of ["__Host-access", "__Host-refresh"]) {
    const header = setCookies.find((h) => h.value.startsWith(name + "="))?.value ?? "";
    expect(/; Secure/i.test(header)).toBe(true);
    expect(/; HttpOnly/i.test(header)).toBe(true);
    expect(/; Path=\//i.test(header)).toBe(true);
    expect(/; Domain=/i.test(header)).toBe(false);
  }
  if (navigate)
    await expect(page.getByRole("heading", { name: "Hồ sơ", exact: true })).toBeVisible();
}
async function authenticated(page, harness) {
  const account = await register(page, harness);
  expect((await confirm(page, account)).status()).toBe(200);
  await login(page, account);
  return account;
}
async function expireAccess(harness, account) {
  await harness.fixture.query(
    `
    UPDATE
      identity.sessions s
    SET
      created_at = clock_timestamp() - interval '10 minutes',
      access_expires_at = clock_timestamp() - interval '1 second'
    FROM
      identity.session_families f
      JOIN identity.users u ON u.id = f.user_id
    WHERE
      s.family_id = f.id
      AND u.email = $1
      AND s.consumed_at IS NULL
      AND f.revoked_at IS NULL
    `,
    [account.email],
  );
}
async function state(harness, account) {
  return (
    await harness.fixture.query(
      `
    SELECT
      u.email_verified_at IS NOT NULL AS verified,
      u.revision,
      u.display_name AS name,
      (
        SELECT
          count(*)::int
        FROM
          identity.email_intents i
          JOIN identity.verification_challenges c ON c.id = i.challenge_id
        WHERE
          c.user_id = u.id
      ) AS intents,
      (
        SELECT
          count(*)::int
        FROM
          identity.sessions s
          JOIN identity.session_families f ON f.id = s.family_id
        WHERE
          f.user_id = u.id
          AND s.consumed_at IS NOT NULL
      ) AS consumed,
      (
        SELECT
          count(*)::int
        FROM
          identity.session_families f
        WHERE
          f.user_id = u.id
          AND f.revoked_at IS NOT NULL
      ) AS revoked
    FROM
      identity.users u
    WHERE
      u.email = $1
    `,
      [account.email],
    )
  ).rows[0];
}
function events(harness, from, path, method) {
  return harness.requests.slice(from).filter((r) => r.path === path && r.method === method);
}

test("H01 TLS validation, security headers and API 404 outside SPA", async ({ page, harness }) => {
  const valid = await harness.tlsProbe();
  expect(valid.authorized).toBe(true);
  expect(valid.status).toBe(200);
  expect(["TLSv1.2", "TLSv1.3"]).toContain(valid.protocol);
  expect((await harness.tlsProbe("wrong.invalid")).authorized).toBe(false);
  expect((await harness.tlsProbe("localhost", false)).authorized).toBe(false);
  const landing = await page.goto("/verify-email");
  expect(landing.headers()["referrer-policy"]).toBe("no-referrer");
  expect(landing.headers()["cache-control"]).toBe("no-store");
  const missing = await page.goto("/v1/not-implemented");
  expect(missing.status()).toBe(404);
  expect(missing.headers()["content-type"]).toContain("application/json");
  expect(missing.headers()["cache-control"]).toBe("no-store");
  expect(missing.headers()["x-content-type-options"]).toBe("nosniff");
  expect(missing.headers()["x-correlation-id"]).toMatch(/^[0-9a-f-]{36}$/);
});

test("H02 register, coalesced resend, inert verification, final password and replay", async ({
  page,
  context,
  harness,
}) => {
  const account = await register(page, harness);
  expect((await state(harness, account)).verified).toBe(false);
  expect((await context.cookies()).some((c) => /__Host-(access|refresh)/.test(c.name))).toBe(false);
  await register(page, harness, account.email);
  expect((await state(harness, account)).intents).toBe(1);
  const resend = responseFor(page, "/v1/auth/email-verification/request", "POST");
  await page.getByRole("button", { name: "Gửi lại hướng dẫn", exact: true }).click();
  expect((await resend).status()).toBe(202);
  await expect(page.getByRole("button", { name: /Gửi lại sau \d+ giây/ })).toBeDisabled();
  expect((await state(harness, account)).intents).toBe(1);
  const from = harness.requests.length;
  const token = new URL(account.link).hash.slice("#token=".length);
  let leaked = false,
    external = false;
  page.on("request", (request) => {
    const url = new URL(request.url());
    leaked ||=
      url.search.includes(token) ||
      url.hash.includes(token) ||
      (request.headers()["referer"] ?? "").includes(token);
    external ||= url.origin !== harness.origin;
  });
  await page.goto(account.link);
  await expect(page.getByLabel("Mật khẩu mới", { exact: true })).toBeVisible();
  expect(new URL(page.url()).hash.length).toBe(0);
  expect((await state(harness, account)).verified).toBe(false);
  expect(events(harness, from, "/v1/auth/email-verification/confirm", "POST")).toHaveLength(0);
  // Only boolean metadata is read from browser JS; credentials themselves never leave the page.
  expect(
    await page.evaluate(
      () => Object.keys(localStorage).length + Object.keys(sessionStorage).length,
    ),
  ).toBe(0);
  expect(await page.evaluate(() => Object.hasOwn(window, "__examVerifyToken"))).toBe(false);
  expect((await page.locator("body").innerText()).includes(token)).toBe(false);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(
    accessibility.violations
      .filter((v) => ["serious", "critical"].includes(v.impact))
      .map((v) => v.id),
  ).toEqual([]);
  await page.screenshot({
    path: ".local/identity-https-results/verification-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: ".local/identity-https-results/verification-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.reload();
  await expect(page.getByText("Liên kết không có mã", { exact: true })).toBeVisible();
  expect((await confirm(page, account)).status()).toBe(200);
  expect((await state(harness, account)).verified).toBe(true);
  expect((await context.cookies()).some((c) => /__Host-(access|refresh)/.test(c.name))).toBe(false);
  expect((await confirm(page, account, otherPassword)).status()).toBe(200);
  await expect(
    page.getByText("Hãy đăng nhập bằng mật khẩu đã thiết lập khi xác nhận lần đầu.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.goto("/login?return=%2Fprofile");
  await page.getByLabel("Email", { exact: true }).fill(account.email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(initialPassword);
  const wrong = responseFor(page, "/v1/auth/login", "POST");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  expect((await wrong).status()).toBe(401);
  await expect(page.getByText("Email hoặc mật khẩu không đúng.", { exact: true })).toBeVisible();
  await login(page, account);
  const cookieMetadata = (await context.cookies()).map(
    ({ name, secure, httpOnly, sameSite, path, domain }) => ({
      name,
      secure,
      httpOnly,
      sameSite,
      path,
      domain,
    }),
  );
  for (const name of ["__Host-access", "__Host-refresh"]) {
    expect(cookieMetadata.find((c) => c.name === name)).toEqual({
      name,
      secure: true,
      httpOnly: true,
      sameSite: "Lax",
      path: "/",
      domain: "127.0.0.1",
    });
  }
  await page.reload();
  await expect(page.getByRole("heading", { name: "Hồ sơ", exact: true })).toBeVisible();
  expect(leaked).toBe(false);
  expect(external).toBe(false);
});

test("H03 missing, malformed and expired verification links never activate", async ({
  page,
  harness,
}) => {
  await page.goto("/verify-email");
  await expect(page.getByText("Liên kết không có mã", { exact: true })).toBeVisible();
  await page.goto("/");
  await page.goto("/verify-email#token=bad");
  await expect(page.getByText("Liên kết không hợp lệ", { exact: true })).toBeVisible();
  expect(new URL(page.url()).hash.length).toBe(0);
  const account = await register(page, harness);
  await harness.fixture.query(
    `
    UPDATE
      identity.verification_challenges c
    SET
      expires_at = clock_timestamp() - interval '1 second'
    FROM
      identity.users u
    WHERE
      c.user_id = u.id
      AND u.email = $1
    `,
    [account.email],
  );
  expect((await confirm(page, account)).status()).toBe(400);
  await expect(page.getByText("Chưa xác nhận được", { exact: true })).toBeVisible();
  expect((await state(harness, account)).verified).toBe(false);
});

test("H04 exact Origin and signed cookie/header CSRF remain mandatory", async ({
  page,
  context,
  harness,
}) => {
  const account = await authenticated(page, harness);
  expect(
    (
      await harness.request(context, "POST", "/v1/auth/logout", undefined, {
        origin: "https://wrong.invalid",
      })
    ).status,
  ).toBe(403);
  expect(
    (await harness.request(context, "POST", "/v1/auth/logout", undefined, {}, false)).status,
  ).toBe(403);
  expect(
    (
      await harness.request(context, "POST", "/v1/auth/logout", undefined, {
        "x-csrf-token": "forged",
      })
    ).status,
  ).toBe(403);
  expect((await state(harness, account)).revoked).toBe(0);
  expect(
    (
      await harness.request(context, "POST", "/v1/auth/email-verification/request", {
        email: account.email,
      })
    ).status,
  ).toBe(403);
  expect(
    (
      await harness.request(context, "POST", "/v1/auth/email-verification/confirm", {
        token: new URL(account.link).hash.slice("#token=".length),
        password: otherPassword,
      })
    ).status,
  ).toBe(403);
  await page.goto(account.link);
  await expect(page.getByText("Hãy đăng xuất trước", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Mật khẩu mới", { exact: true })).toHaveCount(0);
});

test("H05 two shared-cookie tabs refresh once, preserve conflicts, survive API restart and logout", async ({
  page,
  context,
  harness,
}) => {
  const account = await authenticated(page, harness);
  const initialRevision = (await state(harness, account)).revision;
  const second = await context.newPage();
  await second.goto("/profile");
  await expect(second.getByRole("heading", { name: "Hồ sơ", exact: true })).toBeVisible();
  await expireAccess(harness, account);
  const from = harness.requests.length;
  await Promise.all([page.reload(), second.reload()]);
  await expect(page.getByRole("heading", { name: "Hồ sơ", exact: true })).toBeVisible();
  await expect(second.getByRole("heading", { name: "Hồ sơ", exact: true })).toBeVisible();
  const refresh = events(harness, from, "/v1/auth/refresh", "POST");
  expect(refresh).toHaveLength(1);
  expect(refresh[0]).toMatchObject({
    status: 200,
    originMatches: true,
    csrfHeader: true,
    contentType: null,
  });
  expect((await state(harness, account)).consumed).toBe(1);
  expect((await state(harness, account)).revoked).toBe(0);
  await page.getByLabel("Tên hiển thị", { exact: true }).fill("Tab one candidate");
  await second.getByLabel("Tên hiển thị", { exact: true }).fill("Tab two candidate");
  const left = responseFor(page, "/v1/me", "PUT"),
    right = responseFor(second, "/v1/me", "PUT");
  await Promise.all([
    page.getByRole("button", { name: "Lưu hồ sơ", exact: true }).click(),
    second.getByRole("button", { name: "Lưu hồ sơ", exact: true }).click(),
  ]);
  expect([(await left).status(), (await right).status()].sort()).toEqual([200, 409]);
  expect((await state(harness, account)).revision).toBe(initialRevision + 1);
  await harness.restart();
  await Promise.all([page.reload(), second.reload()]);
  await expect(page.getByRole("heading", { name: "Hồ sơ", exact: true })).toBeVisible();
  await expect(second.getByRole("heading", { name: "Hồ sơ", exact: true })).toBeVisible();
  const logout = responseFor(page, "/v1/auth/logout", "POST");
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  expect((await logout).status()).toBe(200);
  await expect(second.getByRole("heading", { name: "Đăng nhập", exact: true })).toBeVisible();
  expect((await context.cookies()).some((c) => /__Host-(access|refresh)/.test(c.name))).toBe(false);
  expect((await state(harness, account)).revoked).toBe(1);
});

test("H06 lost refresh ACK does not replay, explicit login restores future refresh", async ({
  page,
  harness,
}) => {
  const account = await authenticated(page, harness);
  await expireAccess(harness, account);
  harness.dropNext("POST", "/v1/auth/refresh");
  const from = harness.requests.length;
  await page.getByLabel("Tên hiển thị", { exact: true }).fill("After lost refresh");
  await page.getByRole("button", { name: "Lưu hồ sơ", exact: true }).click();
  await expect(page.getByText("Chưa lưu được", { exact: true })).toBeVisible();
  expect(events(harness, from, "/v1/auth/refresh", "POST")).toHaveLength(1);
  expect((await state(harness, account)).consumed).toBe(1);
  // SPA navigation deliberately keeps the existing coordinator after an uncertain refresh.
  await expect(page.getByRole("link", { name: "Đăng nhập lại", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Đăng nhập lại", exact: true }).click();
  await login(page, account, false);
  await page.getByRole("link", { name: "Hồ sơ", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hồ sơ", exact: true })).toBeVisible();
  await expireAccess(harness, account);
  const afterLogin = harness.requests.length;
  await page.getByLabel("Tên hiển thị", { exact: true }).fill("Recovered new login");
  await page.getByRole("button", { name: "Lưu hồ sơ", exact: true }).click();
  await expect(page.getByText("Đã lưu hồ sơ.", { exact: true })).toBeVisible();
  expect(events(harness, afterLogin, "/v1/auth/refresh", "POST")).toHaveLength(1);
  expect((await state(harness, account)).revoked).toBe(0);
});

test("H07 lost logout ACK accepts a fresh CSRF token with the retained revoked cookie", async ({
  page,
  context,
  harness,
}) => {
  const account = await authenticated(page, harness);
  harness.dropNext("POST", "/v1/auth/logout");
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Đăng nhập", exact: true })).toBeVisible();
  expect((await state(harness, account)).revoked).toBe(1);
  expect((await context.cookies()).some((c) => c.name === "__Host-refresh")).toBe(true);
  // Same real cookie jar, Node verifies TLS; no relaxed Origin/signature checks.
  const retry = await harness.request(context, "POST", "/v1/auth/logout");
  expect(retry.status).toBe(200);
  expect(JSON.parse(retry.text).data).toEqual({ revoked: true });
  expect((await context.cookies()).some((c) => /__Host-(access|refresh)/.test(c.name))).toBe(false);
});

test("H08 committed profile lost ACK retries its receipt without a second write", async ({
  page,
  harness,
}) => {
  const account = await authenticated(page, harness);
  const initialRevision = (await state(harness, account)).revision;
  harness.dropNext("PUT", "/v1/me");
  await page.getByLabel("Tên hiển thị", { exact: true }).fill("Durable profile retry");
  await page.getByRole("button", { name: "Lưu hồ sơ", exact: true }).click();
  await expect(page.getByText(/Chưa rõ hồ sơ đã được ghi chưa/)).toBeVisible();
  expect((await state(harness, account)).revision).toBe(initialRevision + 1);
  await page.getByRole("button", { name: "Lưu hồ sơ", exact: true }).click();
  await expect(page.getByText("Đã lưu hồ sơ.", { exact: true })).toBeVisible();
  expect((await state(harness, account)).revision).toBe(initialRevision + 1);
});

test("H09 database disable takes effect in the browser on the next request", async ({
  page,
  context,
  harness,
}) => {
  const account = await authenticated(page, harness);
  await harness.fixture.query(
    `
    UPDATE
      identity.users
    SET
      enabled = false
    WHERE
      email = $1
    `,
    [account.email],
  );
  expect((await harness.request(context, "GET", "/v1/me")).status).toBe(401);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Đăng nhập", exact: true })).toBeVisible();
  expect(
    (
      await harness.request(context, "POST", "/v1/auth/login", {
        email: account.email,
        password: account.password,
      })
    ).status,
  ).toBe(401);
});

test("H10 response-body stall times out and preserves the committed profile receipt", async ({
  page,
  harness,
}) => {
  const account = await authenticated(page, harness);
  const revision = (await state(harness, account)).revision;
  harness.dropNext("PUT", "/v1/me", "stall");
  await page.getByLabel("Tên hiển thị", { exact: true }).fill("Body timeout candidate");
  const at = Date.now();
  await page.getByRole("button", { name: "Lưu hồ sơ", exact: true }).click();
  await expect(page.getByText(/Chưa rõ hồ sơ đã được ghi chưa/)).toBeVisible();
  expect(Date.now() - at).toBeGreaterThanOrEqual(9000);
  expect(Date.now() - at).toBeLessThan(12000);
  expect((await state(harness, account)).revision).toBe(revision + 1);
  await page.getByRole("button", { name: "Lưu hồ sơ", exact: true }).click();
  await expect(page.getByText("Đã lưu hồ sơ.", { exact: true })).toBeVisible();
  expect((await state(harness, account)).revision).toBe(revision + 1);
});
