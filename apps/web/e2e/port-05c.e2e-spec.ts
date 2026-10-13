import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "playwright/test";

const evidence = path.resolve(
  process.env.WEB_EVIDENCE_DIR ?? "../../.local/web-evidence/latest",
  "status-result-review",
);
const exam = "00000000-0000-4000-8000-000000000102";
async function candidate(page: Page, route = `/exams/${exam}`) {
  await page.goto(`/login?return=${encodeURIComponent(route)}`);
  await page.getByLabel("Email").fill("candidate@example.test");
  await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("fixture-password-ok");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.waitForURL(`**${route}`);
  await page.evaluate(() => document.fonts.ready);
}
async function navigate(page: Page, route: string) {
  await page.evaluate((to) => {
    history.pushState(null, "", to);
    dispatchEvent(new PopStateEvent("popstate"));
  }, route);
  await page.waitForURL(`**${route}`);
}
async function capture(page: Page, name: string) {
  await mkdir(evidence, { recursive: true });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  const state = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    contentLeft: document.querySelector("main > div")!.getBoundingClientRect().left,
    contentRight: document.querySelector("main > div")!.getBoundingClientRect().right,
    fontLoaded: document.fonts.check('400 16px "Be Vietnam Pro"', "Câu hỏi tiếng Việt"),
  }));
  await writeFile(
    path.join(evidence, `${name}.json`),
    JSON.stringify(
      { ...state, viewport: page.viewportSize(), url: page.url(), violations: scan.violations },
      null,
      2,
    ),
  );
  await page.screenshot({ path: path.join(evidence, `${name}.png`), fullPage: true });
  expect(scan.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }))).toEqual(
    [],
  );
  expect(state.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(state.fontLoaded).toBe(true);
  expect(state.contentLeft).toBeGreaterThanOrEqual(16);
  expect(state.contentRight).toBeLessThanOrEqual(page.viewportSize()!.width - 16);
}
const completed = "00000000-0000-4000-8000-000000000401";
const active = "00000000-0000-4000-8000-000000000402";
const failed = "00000000-0000-4000-8000-000000000403";
test("PORT-05C hidden empty status stops at its budget and resumes only on an explicit check", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 1000 });
  await candidate(page, "/history");
  await expect(page.getByRole("heading", { name: "Lịch sử thi", exact: true })).toBeVisible();
  await page.clock.install();
  await page.evaluate(() =>
    Object.defineProperty(document, "hidden", { configurable: true, value: true }),
  );
  await navigate(page, `/attempts/${active}/status`);
  await expect(page.getByRole("heading", { name: "Trạng thái bài", exact: true })).toBeVisible();
  await page.clock.fastForward(300_001);
  await expect(
    page.getByRole("heading", { name: "Đã dừng kiểm tra tự động", exact: true }),
  ).toBeVisible();
  await capture(page, "status-cap-empty-1024");
  await page.evaluate(() =>
    Object.defineProperty(document, "hidden", { configurable: true, value: false }),
  );
  await page.getByRole("button", { name: "Kiểm tra lại", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Lượt thi đang mở", exact: true })).toBeVisible();
});
test("PORT-05C status, score and readonly released workspace fit Web/tablet", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await candidate(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("TOEIC — Reading practice");
  // Use one real demo attempt across all three screens. The historical seeded
  // result has no saved answers and cannot prove result/review consistency.
  await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Bắt đầu", exact: true }).click();
  await page.getByRole("radio", { name: "accurate", exact: true }).check();
  await expect(page.getByRole("status").filter({ hasText: "Đã lưu lúc" })).toBeVisible();
  await page.getByRole("button", { name: "Câu sau", exact: true }).click();
  await page.getByRole("radio", { name: "Đúng", exact: true }).check();
  await expect(page.getByRole("status").filter({ hasText: "Đã lưu lúc" })).toBeVisible();
  await page.getByRole("button", { name: "Câu sau", exact: true }).click();
  const choices = page.getByRole("group", { name: "Chọn các đáp án bạn cho là đúng." });
  await choices.getByRole("checkbox", { name: "meeting", exact: true }).check();
  await choices.getByRole("checkbox", { name: "report", exact: true }).check();
  await expect(page.getByRole("status").filter({ hasText: "Đã lưu lúc" })).toBeVisible();
  await page.getByRole("button", { name: "Nộp bài", exact: true }).first().click();
  await page.getByRole("button", { name: "Nộp các đáp án đã lưu" }).click();
  await page.waitForURL(/\/attempts\/[^/]+\/status$/);
  const attemptId = new URL(page.url()).pathname.split("/")[2]!;
  await expect(page.getByRole("link", { name: "Xem kết quả", exact: true })).toBeVisible();
  for (const width of [1440, 1280, 1024, 768]) {
    await page.setViewportSize({ width, height: 1000 });
    await navigate(page, `/attempts/${attemptId}/status`);
    await expect(page.getByRole("heading", { name: "Kết quả đã sẵn sàng" })).toBeVisible();
    await capture(page, `status-${width}`);
    await page.getByRole("link", { name: "Xem kết quả", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kết quả");
    await expect(page.getByText("66.67%", { exact: true })).toBeVisible();
    await expect(page.getByText("TOEIC — Reading practice", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Bảng xếp hạng của phiên bản này" }),
    ).toHaveAttribute("href", /000102\/versions\/.*000202\/leaderboard$/);
    await capture(page, `result-${width}`);
    await page.getByRole("link", { name: "Xem giải thích đã mở" }).click();
    await expect(page.getByRole("heading", { name: "Choose the best word." })).toBeVisible();
    await expect(page.getByRole("radio")).toHaveCount(0);
    await expect(page.getByRole("checkbox")).toHaveCount(0);
    await capture(page, `review-${width}`);
    const next = page.getByRole("button", { name: "Câu sau", exact: true });
    await next.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "The invoice was paid." })).toBeFocused();
    await expect(
      page.getByRole("button", { name: "Câu 2, Chưa đúng", exact: true }),
    ).toHaveAttribute("aria-current", "true");
    await page.getByRole("button", { name: "Chưa đúng (1)", exact: true }).click();
    await expect(page.getByRole("button", { name: "Câu 1, Đúng", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Tất cả (3)", exact: true }).click();
    await page.getByRole("button", { name: "Câu 3, Đúng", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Select the nouns." })).toBeFocused();
    if (width === 768) await capture(page, "review-multiple-768");
    await page.getByRole("button", { name: "Làm mới quyền xem" }).click();
    await expect(page.getByText("3 câu đã tải · Đã tải hết", { exact: true })).toBeVisible();
  }
  expect(errors).toEqual([]);
});
test("PORT-05C pending, failed, active, denied and unreleased states remain truthful", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 1000 });
  await candidate(page, `/attempts/${failed}/status`);
  await expect(page.getByRole("heading", { name: "Bài chưa xử lý xong" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Xem kết quả", exact: true })).toHaveCount(0);
  await capture(page, "status-failed-1024");
  await page.getByRole("button", { name: "Kiểm tra lại", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Bài chưa xử lý xong" })).toBeVisible();
  await navigate(page, `/attempts/${active}/status`);
  await expect(page.getByRole("heading", { name: "Lượt thi đang mở" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Các bước xử lý bài" })).toHaveCount(0);
  await capture(page, "status-active-1024");
  await navigate(page, `/attempts/${active}/result`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kết quả chưa sẵn sàng");
  await expect(page.getByText("Máy chủ đã nhận yêu cầu", { exact: true })).toHaveCount(0);
  await capture(page, "result-pending-1024");
  await navigate(page, `/attempts/${active}/review`);
  await expect(page.getByRole("heading", { name: "Chưa mở giải thích" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Chọn câu để xem" })).toHaveCount(0);
  await capture(page, "review-closed-1024");
  await navigate(page, "/attempts/00000000-0000-4000-8000-000000000999/status");
  await expect(page.getByText("Không tìm thấy nội dung", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Thử lại", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Kiểm tra lại", exact: true })).toHaveCount(0);
  await capture(page, "status-not-found-1024");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await navigate(page, `/attempts/${completed}/review`);
  await expect(page.getByRole("heading", { name: "Choose the best word." })).toBeVisible();
  await capture(page, "review-reduced-motion-1024");
});
