import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "playwright/test";

test.use({ trace: "off", screenshot: "off", video: "off" });
const evidence = path.resolve(
  process.env.WEB_EVIDENCE_DIR ?? "../../docs/web-ui/evidence/port-05h-2026-10-13",
  "public-guides",
);
const widths = [768, 1024, 1280, 1440];
const topics = [
  { label: "Trong phòng thi", count: 5, id: "room" },
  { label: "Tài khoản", count: 2, id: "account" },
  { label: "Chọn đề", count: 3, id: "catalog" },
  { label: "Nộp bài & Kết quả", count: 3, id: "result" },
];
async function capture(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  const state = await page.evaluate(() => {
    const node = document.querySelector("main > div")!;
    const frame = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    const controls = Array.from(
      document.querySelectorAll<HTMLElement>("main button, main a, main summary"),
    ).filter((node) => node.getBoundingClientRect().height > 0);
    return {
      documentWidth: document.documentElement.scrollWidth,
      outerLeft: frame.left,
      outerRight: frame.right,
      left: frame.left + parseFloat(style.paddingLeft),
      right: frame.right - parseFloat(style.paddingRight),
      fontLoaded: document.fonts.check('400 16px "Be Vietnam Pro"', "Hướng dẫn thí sinh"),
      headingCount: document.querySelectorAll("h1").length,
      minControlHeight: Math.min(...controls.map((node) => node.getBoundingClientRect().height)),
    };
  });
  await mkdir(evidence, { recursive: true });
  await writeFile(
    path.join(evidence, `${name}.json`),
    JSON.stringify(
      {
        ...state,
        viewport: page.viewportSize(),
        violations: scan.violations.map((v) => ({
          id: v.id,
          targets: v.nodes.map((node) => node.target),
        })),
        mode: name.startsWith("live-")
          ? "synthetic unavailable HTTP; not actual business/HTTPS acceptance"
          : "demo",
      },
      null,
      2,
    ),
  );
  await page.screenshot({ path: path.join(evidence, `${name}.png`), fullPage: true });
  expect(scan.violations.map((v) => v.id)).toEqual([]);
  expect(state.fontLoaded).toBe(true);
  expect(state.headingCount).toBe(1);
  expect(state.documentWidth).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(state.left).toBeGreaterThanOrEqual(24);
  expect(state.right).toBeLessThanOrEqual(page.viewportSize()!.width - 24);
  expect(state.minControlHeight).toBeGreaterThanOrEqual(44);
}

test("PORT-05H public guide, four FAQ topics and 404 Web/tablet matrix", async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/how-it-works");
    await expect(page.getByRole("heading", { name: "Hành trình 5 bước" })).toBeVisible();
    await expect(page.locator("main ol > li")).toHaveCount(5);
    await capture(page, `how-${width}`);
    await page.goto("/help");
    for (const topic of topics) {
      await page
        .getByRole("button", { name: `${topic.label} ${topic.count} câu`, exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: topic.label, level: 2, exact: true }),
      ).toBeVisible();
      await expect(page.locator("main details")).toHaveCount(topic.count);
      await capture(page, `help-${topic.id}-${width}`);
    }
    await page.goto("/missing-page");
    await expect(page.getByRole("heading", { name: "Không có trang này" })).toBeVisible();
    await capture(page, `404-${width}`);
  }
  expect(errors).toEqual([]);
});

test("PORT-05H FAQ native keyboard disclosure, topic reset and reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/help");
  const first = page.locator("main details").first();
  const summary = first.locator("summary");
  await summary.focus();
  await expect(summary).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(first).not.toHaveAttribute("open", "");
  await page.keyboard.press("Space");
  await expect(first).toHaveAttribute("open", "");
  const topic = page.getByRole("button", { name: "Tài khoản 2 câu", exact: true });
  await topic.focus();
  await page.keyboard.press("Enter");
  await expect(topic).toBeFocused();
  await expect(topic).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Trong phòng thi 5 câu", exact: true }).click();
  await expect(first).toHaveAttribute("open", "");
  await capture(page, "help-keyboard-768");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Trong phòng thi 5 câu", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  for (const item of topics) {
    await page
      .getByRole("button", { name: `${item.label} ${item.count} câu`, exact: true })
      .click();
    for (const question of await page.locator("main details").all()) {
      if ((await question.getAttribute("open")) === null) {
        await question.locator("summary").focus();
        await page.keyboard.press("Enter");
      }
      await expect(question.locator("div").first()).toBeVisible();
    }
  }
  await page.getByRole("button", { name: "Trong phòng thi 5 câu", exact: true }).click();
  for (const question of await page.locator("main details").all()) {
    if ((await question.getAttribute("open")) === null) await question.locator("summary").click();
  }
  await capture(page, "help-all-room-open-768");
});

test("PORT-05H public links preserve route guards and recover unknown routes", async ({ page }) => {
  await page.goto("/how-it-works");
  await page.locator("main").getByRole("link", { name: "Khám phá đề thi" }).click();
  await expect(page).toHaveURL(/\/login\?return=%2Fexams$/);
  await page.goto("/help");
  await page
    .locator("main")
    .getByRole("link", { name: /Lịch sử thi/ })
    .click();
  await expect(page).toHaveURL(/\/login\?return=%2Fhistory$/);
  await page.goto("/unknown-public-placeholder?token=synthetic-private#synthetic-fragment");
  await expect(page.locator("main")).not.toContainText(
    /unknown-public-placeholder|synthetic-private|synthetic-fragment/,
  );
  await page.locator("main").getByRole("link", { name: "Trợ giúp", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Bạn cần hướng dẫn gì?" })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Không có trang này" })).toBeVisible();
  await page.locator("main").getByRole("link", { name: "Thử trải nghiệm" }).click();
  await expect(page).toHaveURL(/\/experience$/);
  await page.goto("/missing-page");
  await page.locator("main").getByRole("link", { name: "Về trang chủ" }).click();
  await expect(page.getByRole("heading", { name: /Vào nhịp thi/ })).toBeVisible();
});

test("PORT-05H live public pages remain usable when session API is unavailable without business reads", async ({
  page,
}) => {
  const paths: string[] = [];
  await page.route("**/v1/**", async (route) => {
    paths.push(new URL(route.request().url()).pathname);
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        data: null,
        errorCode: "Tạm thời chưa kết nối được.",
        message: "Tạm thời chưa kết nối được.",
        status: false,
      }),
    });
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("http://127.0.0.1:4174/help");
  await expect(page.getByRole("heading", { name: "Bạn cần hướng dẫn gì?" })).toBeVisible();
  await page.getByRole("button", { name: "Tài khoản 2 câu", exact: true }).click();
  await expect(page.getByText("Tại sao đăng ký xong chưa đăng nhập được?")).toBeVisible();
  await capture(page, "live-help-unavailable-1280");
  await page
    .locator("header")
    .first()
    .getByRole("link", { name: "Cách bắt đầu", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Hành trình 5 bước" })).toBeVisible();
  await page.goto("http://127.0.0.1:4174/dev/ui");
  await expect(page.getByRole("heading", { name: "Không có trang này" })).toBeVisible();
  await capture(page, "live-dev-404-1280");
  expect(paths.length).toBeGreaterThan(0);
  expect(paths.every((pathname) => pathname === "/v1/me")).toBe(true);
  await writeFile(
    path.join(evidence, "public-request-budget.json"),
    JSON.stringify(
      {
        requests: paths,
        pageOwnedBusinessRequests: 0,
        scope: "synthetic session-unavailable HTTP; app bootstrap only",
      },
      null,
      2,
    ),
  );
});
