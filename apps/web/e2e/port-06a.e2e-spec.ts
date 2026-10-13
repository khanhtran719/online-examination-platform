import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "playwright/test";

test.use({
  trace: "off",
  screenshot: "off",
  video: "off",
  launchOptions: { args: ["--enable-unsafe-swiftshader"] },
});
const output = path.resolve(
  process.env.WEB_EVIDENCE_DIR ?? "../../.local/web-evidence/port-06a",
  "public-convergence",
);

async function capture(page: Page, name: string, screenshot = false) {
  // Full-page capture starts at the document origin, including fixed offscreen controls.
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.evaluate(() => document.fonts.ready);
  const scan = await new AxeBuilder({ page }).analyze();
  const state = await page.evaluate(() => {
    const text = Array.from(
      document.querySelectorAll<HTMLElement>(
        "header p, header span, header a, header button, main p, main span, main label, main button, main a, main figcaption, footer span, footer a",
      ),
    );
    const smallText = text
      .filter(
        (n) =>
          n.getBoundingClientRect().height > 0 &&
          !n.closest('[aria-hidden="true"]') &&
          /[\p{L}\p{N}]/u.test(n.textContent ?? "") &&
          parseFloat(getComputedStyle(n).fontSize) < 14,
      )
      .map((n) => ({ text: n.textContent?.trim().slice(0, 80), px: getComputedStyle(n).fontSize }));
    const question = document
      .querySelector('section[aria-labelledby="sample-question-title"]')
      ?.getBoundingClientRect();
    const navigator = document
      .querySelector('aside[aria-label="Tiến độ làm bài"]')
      ?.getBoundingClientRect();
    const footer = document.querySelector("footer")!;
    const skipLink = document.querySelector(".skip-link")!;
    const skip = skipLink.getBoundingClientRect();
    return {
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      fontLoaded: document.fonts.check('400 16px "Be Vietnam Pro"', "Câu hỏi tiếng Việt"),
      smallText,
      footerBackground: getComputedStyle(footer).backgroundColor,
      skipBottom: skip.bottom,
      skipFocused: document.activeElement === skipLink,
      question: question ? { x: question.x, width: question.width, y: question.y } : null,
      navigator: navigator ? { x: navigator.x, width: navigator.width, y: navigator.y } : null,
    };
  });
  await mkdir(output, { recursive: true });
  await writeFile(
    path.join(output, `${name}.json`),
    JSON.stringify(
      {
        ...state,
        violations: scan.violations.map((v) => ({
          id: v.id,
          targets: v.nodes.map((n) => n.target),
        })),
      },
      null,
      2,
    ),
  );
  if (screenshot) await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });
  expect(scan.violations.map((v) => v.id)).toEqual([]);
  expect(state.smallText).toEqual([]);
  expect(state.scrollWidth).toBeLessThanOrEqual(state.width);
  expect(state.fontLoaded).toBe(true);
  expect(state.footerBackground).toBe("rgb(255, 255, 255)");
  expect(state.skipBottom).toBeLessThanOrEqual(0);
  expect(state.skipFocused).toBe(false);
  if (state.question && state.navigator && state.width > 800) {
    expect(state.question.x).toBeLessThan(state.navigator.x);
    expect(state.question.width / state.navigator.width).toBeCloseTo(2, 1);
  } else if (state.question && state.navigator)
    expect(state.question.y).toBeLessThan(state.navigator.y);
}

test("PORT-06A public chrome, typography and question-first layout fit Web/tablet", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    for (const [name, route, title] of [
      ["home", "/", "Vào nhịp thi."],
      ["sample", "/experience", "Vào nhịp với 3 câu hỏi"],
      ["how", "/how-it-works", "Bắt đầu rõ ràng."],
      ["help", "/help", "Bạn cần hướng dẫn gì?"],
      ["404", "/port-06a-missing", "Không có trang này"],
    ]) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(title);
      if (name === "home") {
        await expect(page.locator('[data-renderer="webgl"] canvas')).toBeVisible();
        await page.getByRole("button", { name: "Dừng hiệu ứng" }).click();
      }
      await expect(page.locator("header").first()).not.toContainText("↗");
      await capture(
        page,
        `${name}-${width}`,
        [768, 1280].includes(width) && ["home", "sample"].includes(name),
      );
    }
    if (width === 1440) {
      for (const [name, route, title] of [
        ["login", "/login", "Đăng nhập"],
        ["register", "/register", "Tạo tài khoản"],
        ["check-email", "/check-email", "Kiểm tra email"],
        ["verify", `/verify-email#token=${"A".repeat(43)}`, "Xác nhận email"],
      ]) {
        await page.goto(route);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
        await capture(page, `auth-${name}-${width}`);
      }
    }
  }
  expect(errors).toEqual([]);
});

test("PORT-06A sample navigator review retains exact choices/marks and all three types", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const calls: string[] = [];
  page.on("request", (r) => {
    const p = new URL(r.url()).pathname;
    if (p.startsWith("/v1/") && p !== "/v1/me" && !p.startsWith("/v1/auth/")) calls.push(p);
  });
  for (const width of [768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/experience");
    await page.getByRole("radio", { name: "C 32" }).check();
    await page.getByRole("button", { name: "Đánh dấu", exact: true }).click();
    await page.getByRole("button", { name: "Rà soát bài mẫu" }).click();
    await expect(page.getByRole("heading", { name: "Xem lại trước khi kết thúc" })).toBeFocused();
    await page.getByRole("button", { name: "Sửa câu 1" }).click();
    await expect(page.getByRole("radio", { name: "C 32" })).toBeChecked();
    await expect(
      page.getByRole("button", { name: /Câu 1, đã trả lời, đã đánh dấu/ }),
    ).toHaveAttribute("aria-current", "step");
    await page.getByRole("button", { name: "Câu tiếp theo" }).click();
    await page.getByRole("checkbox", { name: "A 12" }).check();
    await page.getByRole("checkbox", { name: "C 28" }).check();
    await capture(page, `sample-multiple-${width}`);
    await page.getByRole("button", { name: "Câu tiếp theo" }).click();
    await page.getByRole("radio", { name: "A Đúng" }).check();
    await capture(page, `sample-boolean-${width}`);
    await page.getByRole("button", { name: "Rà soát bài mẫu" }).click();
    await capture(page, `sample-review-${width}`);
    await page.getByRole("button", { name: "Xem kết quả mẫu" }).click();
    await expect(page.getByText("3 / 3", { exact: true })).toBeVisible();
    await capture(page, `sample-result-${width}`, [768, 1280].includes(width));
    await page.getByRole("button", { name: "Thử lại 3 câu" }).click();
    await expect(page.getByRole("radio", { name: "C 32" })).not.toBeChecked();
    await page.getByRole("radio", { name: "C 32" }).check();
    await page.getByRole("button", { name: "Xóa lựa chọn" }).click();
    await expect(page.getByRole("radio", { name: "C 32" })).not.toBeChecked();
    await page.getByRole("radio", { name: "C 32" }).check();
    await page.reload();
    await expect(page.getByRole("radio", { name: "C 32" })).not.toBeChecked();
  }
  expect(calls).toEqual([]);
});

test("PORT-06A public skip link and tablet menu support keyboard focus and navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 960 });
  await page.goto("/experience");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Vào nhịp với 3 câu hỏi");
  const skip = page.getByRole("link", { name: "Đi tới nội dung" });
  await expect
    .poll(async () => (await skip.boundingBox())!.y + (await skip.boundingBox())!.height)
    .toBeLessThanOrEqual(0);
  await page.keyboard.press("Tab");
  await expect(page.locator("summary").filter({ hasText: "Kịch bản mẫu" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(skip).toBeFocused();
  expect((await skip.boundingBox())!.y).toBeGreaterThanOrEqual(0);
  await page.keyboard.press("Enter");
  await expect(page.locator("main#content")).toBeFocused();
  const menu = page.getByRole("button", { name: /^(Menu|Đóng menu)$/ });
  await menu.focus();
  await page.keyboard.press("Enter");
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await menu.click();
  await page
    .getByRole("navigation", { name: "Chính", exact: true })
    .getByRole("link", { name: "Trợ giúp" })
    .click();
  await expect(page.getByRole("heading", { name: "Bạn cần hướng dẫn gì?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Menu", exact: true })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
});

test("PORT-06A signed-in public chrome uses actual session destinations", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 960 });
  await page.goto("/login?return=%2Fdashboard");
  await page.getByLabel("Email", { exact: true }).fill("candidate@example.test");
  await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("fixture-password-ok");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.evaluate(() => {
    history.pushState(null, "", "/experience");
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Vào nhịp với 3 câu hỏi");
  const nav = page.getByRole("navigation", { name: "Chính", exact: true });
  await expect(nav.getByRole("link", { name: "Đăng nhập" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Bảng làm việc" })).toHaveAttribute(
    "href",
    "/dashboard",
  );
  await expect(nav.getByRole("link", { name: "Đề thi", exact: true })).toHaveAttribute(
    "href",
    "/exams",
  );
  await capture(page, "signed-in-sample-1280", true);
});

test("PORT-06A live public sample remains local when session API is unavailable", async ({
  page,
}) => {
  const requests: string[] = [];
  await page.route("**/v1/**", async (route) => {
    requests.push(new URL(route.request().url()).pathname);
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        data: null,
        errorCode: "Chưa kết nối được.",
        message: "Chưa kết nối được.",
        status: false,
      }),
    });
  });
  await page.setViewportSize({ width: 1280, height: 960 });
  await page.goto("http://127.0.0.1:4174/experience");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Vào nhịp với 3 câu hỏi");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Đi tới nội dung" });
  await expect(skip).toBeFocused();
  expect((await skip.boundingBox())!.y).toBeGreaterThanOrEqual(0);
  await page.keyboard.press("Enter");
  await expect(page.locator("main#content")).toBeFocused();
  await page.getByRole("radio", { name: "C 32" }).check();
  await page.getByRole("button", { name: "Rà soát bài mẫu" }).click();
  await page.getByRole("button", { name: "Xem kết quả mẫu" }).click();
  await expect(page.getByText("1 / 3", { exact: true })).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await capture(page, "live-sample-unavailable-1280", true);
  expect(requests.length).toBeGreaterThan(0);
  expect(requests.every((p) => p === "/v1/me")).toBe(true);
});
