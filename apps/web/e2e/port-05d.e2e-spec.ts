import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "playwright/test";

const evidence = path.resolve(
  process.env.WEB_EVIDENCE_DIR ?? "../../docs/web-ui/evidence/port-05d-2026-10-13",
  "exam-room",
);
const exam = "00000000-0000-4000-8000-000000000102";
async function start(page: Page) {
  await page.goto(`/login?return=${encodeURIComponent(`/exams/${exam}`)}`);
  await page.getByLabel("Email").fill("candidate@example.test");
  await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("fixture-password-ok");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Bắt đầu", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Choose the best word." })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}
async function fault(page: Page, value: string) {
  const menu = page.locator("summary").filter({ hasText: "Kịch bản mẫu" });
  await menu.click();
  await page.getByLabel("Lỗi lưu tiếp theo").selectOption(value);
  await menu.click();
}
async function saved(page: Page) {
  await expect(page.getByRole("status").filter({ hasText: "Đã lưu lúc" })).toBeVisible();
}
async function capture(page: Page, name: string) {
  await mkdir(evidence, { recursive: true });
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  const state = await page.evaluate(() => {
    const content = document.querySelector("main > div")!.getBoundingClientRect();
    const dialog = document.querySelector('[role="dialog"]');
    const dialogBounds = dialog?.getBoundingClientRect();
    const backdropBounds = dialog?.parentElement?.getBoundingClientRect();
    return {
      width: document.documentElement.scrollWidth,
      left: content.left,
      right: content.right,
      fontLoaded: document.fonts.check('400 16px "Be Vietnam Pro"', "Phòng thi tiếng Việt"),
      dialog:
        dialogBounds && backdropBounds
          ? {
              left: dialogBounds.left,
              width: dialogBounds.width,
              backdropLeft: backdropBounds.left,
              backdropWidth: backdropBounds.width,
              backdropHeight: backdropBounds.height,
            }
          : null,
    };
  });
  await writeFile(
    path.join(evidence, `${name}.json`),
    JSON.stringify(
      { ...state, viewport: page.viewportSize(), url: page.url(), violations: scan.violations },
      null,
      2,
    ),
  );
  await page.screenshot({
    path: path.join(evidence, `${name}.png`),
    fullPage: (await page.getByRole("dialog").count()) === 0,
  });
  expect(scan.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }))).toEqual(
    [],
  );
  expect(state.fontLoaded).toBe(true);
  expect(state.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(state.left).toBeGreaterThanOrEqual(16);
  expect(state.right).toBeLessThanOrEqual(page.viewportSize()!.width - 16);
  if (state.dialog) {
    expect(state.dialog.backdropLeft).toBe(0);
    expect(state.dialog.backdropWidth).toBe(page.viewportSize()!.width);
    expect(state.dialog.backdropHeight).toBe(page.viewportSize()!.height);
    expect(
      Math.abs(state.dialog.left + state.dialog.width / 2 - page.viewportSize()!.width / 2),
    ).toBeLessThanOrEqual(1);
  }
}
test("PORT-05D three native question types, save receipts, tablet sheet and submit confirmation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await start(page);
  for (const width of [768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1100 });
    await page.getByRole("radio", { name: "accurate", exact: true }).check();
    await saved(page);
    await capture(page, `room-single-${width}`);
    const next = page.getByRole("button", { name: "Câu sau", exact: true });
    await next.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "The invoice was paid." })).toBeFocused();
    await page.getByRole("radio", { name: "Sai", exact: true }).check();
    await saved(page);
    await capture(page, `room-true-false-${width}`);
    await next.click();
    await page.getByRole("checkbox", { name: "meeting", exact: true }).check();
    await page.getByRole("checkbox", { name: "report", exact: true }).check();
    await page.getByRole("checkbox", { name: "Đánh dấu để xem lại" }).check();
    await saved(page);
    await capture(page, `room-multiple-${width}`);
    if (width <= 1024) {
      const sheet = page.getByRole("button", { name: "Danh sách câu hỏi", exact: true });
      await sheet.click();
      await page
        .getByRole("dialog")
        .getByRole("checkbox", { name: "Chỉ xem câu đánh dấu" })
        .check();
      await expect(page.getByRole("dialog").getByRole("button", { name: /Câu 3,/ })).toBeVisible();
      await capture(page, `room-sheet-${width}`);
      await page.keyboard.press("Escape");
      await expect(sheet).toBeFocused();
    }
    await page.getByRole("button", { name: "Nộp bài", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Sau khi nộp, bạn không thể sửa đáp án");
    await capture(page, `room-confirm-${width}`);
    await page.getByRole("button", { name: "Chưa nộp", exact: true }).click();
    const previous = page.getByRole("button", { name: "Câu trước", exact: true });
    await previous.click();
    await previous.click();
  }
  await page.getByRole("button", { name: "Nộp bài", exact: true }).click();
  await page.getByRole("button", { name: "Nộp các đáp án đã lưu", exact: true }).click();
  await page.waitForURL("**/status");
  await page.getByRole("link", { name: "Xem kết quả", exact: true }).click();
  await expect(page.getByRole("region", { name: "Điểm bài thi", exact: true })).toContainText(
    /6\s*\/6 điểm/,
  );
  expect(errors).toEqual([]);
});
test("PORT-05D delayed ACK retains newer choice, retries wait and conflict compares actual options", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1100 });
  await start(page);
  await fault(page, "delay-ack");
  await page.getByRole("radio", { name: "accurate", exact: true }).check();
  await expect(page.getByRole("status").filter({ hasText: "Đang lưu…" })).toBeVisible();
  await page.getByRole("radio", { name: "late", exact: true }).check();
  await capture(page, "room-saving-newer-intent-1280");
  await saved(page);
  await expect(page.getByRole("radio", { name: "late", exact: true })).toBeChecked();
  await fault(page, "save-429");
  await page.getByRole("radio", { name: "accurate", exact: true }).check();
  await expect(page.getByRole("status").filter({ hasText: "Đang thử lưu lại" })).toBeVisible();
  await capture(page, "room-retry-1280");
  await saved(page);
  await fault(page, "conflict-save");
  await page.getByRole("radio", { name: "late", exact: true }).check();
  const conflict = page.getByRole("dialog", { name: "Đáp án đã thay đổi ở nơi khác" });
  await expect(conflict).toContainText("late");
  await expect(conflict).toContainText("accurate");
  await expect(page.getByRole("button", { name: "Dùng bản máy chủ" })).toBeEnabled();
  await capture(page, "room-conflict-1280");
  await page.getByRole("button", { name: "Giữ lựa chọn của tôi" }).click();
  await saved(page);
  await expect(page.getByRole("radio", { name: "late", exact: true })).toBeChecked();
});
test("PORT-05D a lost submit ACK stays unknown until durable synthetic status is checked", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 1100 });
  await start(page);
  await page.getByRole("radio", { name: "accurate", exact: true }).check();
  await saved(page);
  await fault(page, "lose-ack");
  await page.getByRole("button", { name: "Nộp bài", exact: true }).click();
  await page.getByRole("button", { name: "Nộp các đáp án đã lưu", exact: true }).click();
  await expect(page.getByText("Chưa xác nhận đã nộp", { exact: true })).toBeVisible();
  await expect(page.getByRole("radio").first()).toBeDisabled();
  await capture(page, "room-submit-unknown-1024");
  await page.waitForURL("**/status");
  await expect(page.getByRole("heading", { name: "Trạng thái bài", exact: true })).toBeVisible();
});
test("PORT-05D same-actor reauth and offline local choices retain truthful save feedback", async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1100 });
  await start(page);
  await fault(page, "save-503");
  await page.getByRole("radio", { name: "accurate", exact: true }).check();
  await expect(page.getByRole("status").filter({ hasText: "Đang thử lưu lại" })).toBeVisible();
  await page.evaluate(() => {
    const channel = new BroadcastChannel("exam-platform-session");
    channel.postMessage({ type: "reauth" });
    channel.close();
  });
  await expect(page.getByRole("heading", { name: "Đăng nhập lại" })).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(0);
  await capture(page, "room-reauth-768");
  await page.getByLabel("Email").fill("candidate@example.test");
  await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("fixture-password-ok");
  await page.getByRole("button", { name: "Đăng nhập lại", exact: true }).click();
  await saved(page);
  await expect(page.getByRole("radio", { name: "accurate", exact: true })).toBeChecked();
  // Controlled browser event exercises the coordinator; DemoApi is in process.
  await page.evaluate(() => dispatchEvent(new Event("offline")));
  await page.getByRole("radio", { name: "late", exact: true }).check();
  await expect(page.locator('[role="status"][data-phase="offline"]')).toBeVisible();
  await capture(page, "room-offline-768");
  await page.evaluate(() => dispatchEvent(new Event("online")));
  await saved(page);
  await expect(page.getByRole("radio", { name: "late", exact: true })).toBeChecked();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await capture(page, "room-reduced-motion-768");
});
test("PORT-05D a paged 120-question room permits the first answer without eagerly loading all questions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 1100 });
  await start(page);
  const menu = page.locator("summary").filter({ hasText: "Kịch bản mẫu" });
  await menu.click();
  await page.getByRole("button", { name: "Tạo đề 120 câu", exact: true }).click();
  await page.locator("details p").filter({ hasText: "Đề tải nặng:" }).getByRole("link").click();
  await menu.click();
  await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Bắt đầu", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Stress prompt 1", exact: true })).toBeVisible();
  await page.getByRole("radio", { name: "Một", exact: true }).check();
  await saved(page);
  await expect(page.getByText(/Đã trả lời 1 trên 20 câu đã tải/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Tải thêm câu", exact: true })).toBeEnabled();
  await capture(page, "room-paged-120-1024");
});
