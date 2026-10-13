import { mkdir, writeFile } from "node:fs/promises";
import { release } from "node:os";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "playwright/test";

// Auth artifacts deliberately exclude raw traces, videos, failure DOM and credential values.
process.env.PLAYWRIGHT_NO_COPY_PROMPT = "1";
test.use({ trace: "off", screenshot: "off", video: "off" });
const evidence = path.resolve(
  process.env.WEB_EVIDENCE_DIR ?? "../../.local/web-evidence/latest",
  "identity",
);
const actor = "019a7450-0000-7000-8000-000000000001";
const timestamp = "2026-11-01T00:00:00Z";
test.beforeAll(async ({ browser }) => {
  await mkdir(evidence, { recursive: true });
  await writeFile(
    path.join(path.dirname(evidence), "runtime.json"),
    JSON.stringify(
      {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        osRelease: release(),
        playwright: "1.63.0",
        chromium: browser.version(),
      },
      null,
      2,
    ),
  );
});
async function capture(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  const state = await page.evaluate(() => {
    const frame = document.querySelector("main > div")!.getBoundingClientRect();
    return {
      documentWidth: document.documentElement.scrollWidth,
      left: frame.left,
      right: frame.right,
      fontLoaded: document.fonts.check('400 16px "Be Vietnam Pro"', "Đăng nhập"),
      passwordInputs: [
        ...document.querySelectorAll<HTMLInputElement>('input[autocomplete$="password"]'),
      ].map((input) => ({ masked: input.type === "password", empty: input.value.length === 0 })),
    };
  });
  await mkdir(evidence, { recursive: true });
  await writeFile(
    path.join(evidence, name + ".json"),
    JSON.stringify(
      {
        ...state,
        viewport: page.viewportSize(),
        route: new URL(page.url()).pathname,
        violations: scan.violations.map((v) => v.id),
        evidenceMode: page.url().includes(":4174")
          ? "synthetic HTTP responses in live adapter; not HTTPS acceptance"
          : "demo",
      },
      null,
      2,
    ),
  );
  await page.screenshot({ path: path.join(evidence, name + ".png"), fullPage: true });
  expect(scan.violations.map((v) => v.id)).toEqual([]);
  expect(state.fontLoaded).toBe(true);
  expect(state.documentWidth).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(state.left).toBeGreaterThanOrEqual(24);
  expect(state.right).toBeLessThanOrEqual(page.viewportSize()!.width - 24);
  expect(state.passwordInputs.every((input) => input.masked || input.empty)).toBe(true);
}
async function liveFixture(
  page: Page,
  handle: (
    pathname: string,
    method: string,
    body: string | null,
  ) => Promise<{ status: number; data?: unknown; wait?: number } | null>,
) {
  await page.route("**/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const response = await handle(url.pathname, request.method(), request.postData());
    const fallback =
      url.pathname === "/v1/auth/csrf"
        ? { status: 200, data: { csrfToken: "fixture", expiresAt: timestamp } }
        : { status: 401, data: null };
    const value = response ?? fallback;
    await route.fulfill({
      status: value.status,
      contentType: "application/json",
      headers: { ...(value.wait ? { "Retry-After": String(value.wait) } : {}) },
      body: JSON.stringify({
        data: value.data ?? null,
        errorCode: value.status >= 400 ? "Không thực hiện được yêu cầu." : null,
        message: value.status >= 400 ? "Không thực hiện được yêu cầu." : null,
        status: value.status < 400,
      }),
    });
  });
}
const receipt = {
  userId: actor,
  accessExpiresAt: timestamp,
  refreshExpiresAt: timestamp,
  absoluteExpiresAt: timestamp,
};
const profile = {
  id: actor,
  email: "candidate@example.test",
  displayName: "Lan",
  emailVerifiedAt: timestamp,
  leaderboardOptIn: false,
  revision: 1,
};

test("PORT-05F four Identity pages match Web/tablet layouts without posting verification", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1100 });
    for (const [route, title, name] of [
      ["/login", "Đăng nhập", "login"],
      ["/register", "Tạo tài khoản", "register"],
      ["/check-email", "Kiểm tra email", "check-email"],
      [`/verify-email#token=${"A".repeat(43)}`, "Xác nhận email", "verify"],
    ]) {
      await page.goto(route!);
      await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
      if (name === "verify") {
        await expect(page.getByLabel("Mật khẩu mới")).toBeEnabled();
        expect(new URL(page.url()).hash).toBe("");
      }
      await capture(page, name + "-normal-" + width);
    }
  }
  await page.goto("/verify-email");
  await capture(page, "verify-missing-1440");
  await page.goto("/verify-email#token=bad");
  await capture(page, "verify-malformed-1440");
  await page.goto("/login");
  await page.getByLabel("Email").focus();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Mật khẩu", { exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Hiện mật khẩu", exact: true })).toBeFocused();
  await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: "Ẩn mật khẩu", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Ẩn mật khẩu", exact: true }).click();
  await capture(page, "login-reduced-motion-1440");
  expect(errors).toEqual([]);
});

test("PORT-05F registration validates, accepts generically and keeps only safe history metadata", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 1100 });
  await page.goto("/register");
  await page.getByRole("button", { name: "Tạo tài khoản", exact: true }).click();
  await expect(page.getByText("Nhập email hợp lệ.", { exact: true })).toBeVisible();
  await capture(page, "register-validation-1024");
  await page.getByLabel("Email").fill("new-candidate@example.test");
  await page.getByLabel("Tên hiển thị").fill("Lan Nguyễn");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("fixture-password-ok");
  await page.getByLabel("Nhập lại mật khẩu").fill("fixture-password-ok");
  await page.getByRole("button", { name: "Tạo tài khoản", exact: true }).click();
  await expect(page.getByText("Đã nhận yêu cầu", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => Object.keys(history.state.usr).sort())).toEqual(["accepted"]);
  await capture(page, "check-email-register-accepted-1024");
  await page.getByRole("button", { name: "Gửi lại hướng dẫn", exact: true }).click();
  await expect(page.getByText("Nhập email hợp lệ.", { exact: true })).toBeVisible();
  await page.getByLabel("Email cần gửi lại").fill("new-candidate@example.test");
  await page.getByRole("button", { name: "Gửi lại hướng dẫn", exact: true }).click();
  await expect(page.getByRole("button", { name: /Gửi lại sau/ })).toBeDisabled();
  await capture(page, "check-email-resend-cooldown-1024");
});

test("PORT-05F verification unknown retry preserves the original body and rejected links close the form", async ({
  page,
}) => {
  let calls = 0,
    firstBody: string | null = null,
    sameBody = false;
  await liveFixture(page, async (pathname, method, body) => {
    if (pathname === "/v1/auth/email-verification/confirm" && method === "POST") {
      calls++;
      if (calls === 1) {
        firstBody = body;
        return { status: 503 };
      }
      sameBody = body === firstBody;
      firstBody = null;
      return { status: 400 };
    }
    return null;
  });
  await page.setViewportSize({ width: 1280, height: 1100 });
  await page.goto(`http://127.0.0.1:4174/verify-email#token=${"A".repeat(43)}`);
  await expect(page.getByLabel("Mật khẩu mới")).toBeEnabled();
  expect(calls).toBe(0);
  await page.getByLabel("Mật khẩu mới").fill("fixture-password-ok");
  await page.getByLabel("Nhập lại mật khẩu").fill("fixture-password-ok");
  await page.getByRole("button", { name: "Xác nhận email", exact: true }).click();
  await expect(page.getByRole("button", { name: "Thử xác nhận lại", exact: true })).toBeVisible();
  expect(calls).toBe(1);
  await capture(page, "verify-unknown-1280");
  await page.getByRole("button", { name: "Thử xác nhận lại", exact: true }).click();
  await expect(
    page.getByText("Liên kết không hợp lệ hoặc đã hết hạn. Hãy yêu cầu hướng dẫn mới."),
  ).toBeVisible();
  await expect(page.getByLabel("Mật khẩu mới")).toHaveCount(0);
  expect(calls).toBe(2);
  expect(sameBody).toBe(true);
  await capture(page, "verify-rejected-1280");
});

test("PORT-05F live adapter respects resend wait and does not report delivery after errors", async ({
  page,
}) => {
  let calls = 0;
  await page.clock.install();
  await liveFixture(page, async (pathname) => {
    if (pathname.endsWith("/email-verification/request")) {
      calls++;
      return calls === 1 ? { status: 429, wait: 90 } : { status: 503 };
    }
    return null;
  });
  await page.setViewportSize({ width: 768, height: 1100 });
  await page.goto("http://127.0.0.1:4174/check-email");
  await expect(page.getByLabel("Email cần gửi lại")).toBeEnabled();
  await page.getByLabel("Email cần gửi lại").fill("pending@example.test");
  await page.getByRole("button", { name: "Gửi lại hướng dẫn", exact: true }).click();
  await expect(page.getByText("Hãy chờ trước khi gửi lại", { exact: true })).toBeVisible();
  await capture(page, "check-email-rate-limit-768");
  await page.clock.fastForward(91000);
  await expect(page.getByRole("button", { name: "Gửi lại hướng dẫn", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Gửi lại hướng dẫn", exact: true }).click();
  await expect(page.getByText("Chưa gửi lại được", { exact: true })).toBeVisible();
  await expect(page.getByText("Đã nhận yêu cầu", { exact: true })).toHaveCount(0);
  await capture(page, "check-email-unknown-768");
  expect(calls).toBe(2);
});

test("PORT-05F login ACK profile failure retries only GET", async ({ page }) => {
  let logins = 0,
    reads = 0;
  await liveFixture(page, async (pathname) => {
    if (pathname === "/v1/auth/login") {
      logins++;
      return { status: 200, data: receipt };
    }
    if (pathname === "/v1/me" && logins > 0) {
      reads++;
      return reads === 1 ? { status: 503 } : { status: 200, data: profile };
    }
    return null;
  });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("http://127.0.0.1:4174/login?return=%2Fprofile");
  await expect(page.getByLabel("Email")).toBeEnabled();
  await page.getByLabel("Email").fill("candidate@example.test");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("fixture-password-ok");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("button", { name: "Thử tải lại hồ sơ", exact: true })).toBeVisible();
  await capture(page, "login-profile-read-recovery-1440");
  await page.getByRole("button", { name: "Thử tải lại hồ sơ", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hồ sơ thí sinh", exact: true })).toBeVisible();
  expect(logins).toBe(1);
  expect(reads).toBe(2);
});

test("PORT-05F verified acknowledgement leads to explicit login and session conflict blocks activation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 1100 });
  await page.goto(`/verify-email#token=${"A".repeat(43)}`);
  await page.getByLabel("Mật khẩu mới").fill("fixture-password-ok");
  await page.getByLabel("Nhập lại mật khẩu").fill("fixture-password-ok");
  await page.getByRole("button", { name: "Xác nhận email", exact: true }).click();
  await expect(page.getByText("Email đã xác nhận", { exact: true })).toBeVisible();
  await capture(page, "login-after-verification-1024");
  await page.getByLabel("Email").fill("pending@example.test");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("fixture-password-ok");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Bảng làm việc", exact: true })).toBeVisible();
  // SPA route retains this runtime and authenticated actor; no full-page demo reset.
  await page.evaluate(() => {
    history.pushState(null, "", "/verify-email");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page.getByText("Hãy đăng xuất trước", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Mật khẩu mới")).toHaveCount(0);
  await capture(page, "verify-session-conflict-1024");
});

test("PORT-05F late login acknowledgement cannot navigate away from registration", async ({
  page,
}) => {
  let release!: () => void,
    posted = false,
    lateReads = 0;
  const barrier = new Promise<void>((done) => {
    release = done;
  });
  await liveFixture(page, async (pathname) => {
    if (pathname === "/v1/auth/login") {
      posted = true;
      await barrier;
      return { status: 200, data: receipt };
    }
    if (pathname === "/v1/me" && posted) {
      lateReads++;
      return { status: 200, data: profile };
    }
    return null;
  });
  await page.goto("http://127.0.0.1:4174/login");
  await expect(page.getByLabel("Email")).toBeEnabled();
  await page.getByLabel("Email").fill("candidate@example.test");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("fixture-password-ok");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("button", { name: "Đang đăng nhập…" })).toBeDisabled();
  await page.getByRole("link", { name: "Chưa có tài khoản", exact: true }).click();
  await expect(page.getByLabel("Tên hiển thị")).toBeVisible();
  const response = page.waitForResponse((r) => new URL(r.url()).pathname === "/v1/auth/login");
  release();
  await response;
  await expect(page.getByRole("heading", { name: "Tạo tài khoản", exact: true })).toBeVisible();
  expect(lateReads).toBe(0);
});

test("PORT-05F checking-session state blocks activation and login honors server wait", async ({
  page,
}) => {
  let release!: () => void,
    hold = true,
    postCount = 0;
  const barrier = new Promise<void>((done) => {
    release = done;
  });
  await page.clock.install();
  await liveFixture(page, async (pathname) => {
    if (pathname === "/v1/me" && hold) {
      await barrier;
      return { status: 503 };
    }
    if (pathname === "/v1/auth/login") {
      postCount++;
      return { status: 429, wait: 90 };
    }
    return null;
  });
  await page.setViewportSize({ width: 1024, height: 1100 });
  await page.goto(`http://127.0.0.1:4174/verify-email#token=${"A".repeat(43)}`);
  await expect(page.getByText("Đang kiểm tra phiên trình duyệt…", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Mật khẩu mới")).toHaveCount(0);
  await capture(page, "verify-checking-session-1024");
  hold = false;
  release();
  await expect(page.getByText("Chưa kiểm tra được phiên", { exact: true })).toBeVisible();
  await capture(page, "verify-session-unavailable-1024");
  await page.getByRole("button", { name: "Kiểm tra lại phiên", exact: true }).click();
  await expect(page.getByLabel("Mật khẩu mới")).toBeEnabled();
  await page.getByRole("link", { name: "Về đăng nhập", exact: true }).click();
  await page.getByLabel("Email").fill("candidate@example.test");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("fixture-password-ok");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByText("Thử lại sau 90 giây.", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Mật khẩu", { exact: true })).toHaveValue("");
  await expect(page.getByRole("button", { name: "Đăng nhập", exact: true })).toBeDisabled();
  await capture(page, "login-rate-limit-1024");
  await page.clock.fastForward(91000);
  await expect(page.getByRole("button", { name: "Đăng nhập", exact: true })).toBeEnabled();
  expect(postCount).toBe(1);
});
