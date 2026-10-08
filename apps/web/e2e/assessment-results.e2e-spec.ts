import { expect, test, type Page } from "playwright/test";

async function login(page: Page, returnPath: string) {
  await page.goto(`/login?return=${encodeURIComponent(returnPath)}`);
  await page.getByLabel("Email").fill("candidate@example.test");
  await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("fixture-password-ok");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Đăng nhập");
}

test("mobile room saves three native question types before submitting and opening released review", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "/exams/00000000-0000-4000-8000-000000000102");
  await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Bắt đầu", exact: true }).click();
  const first = page.getByRole("radio", { name: "accurate", exact: true });
  await first.focus();
  await page.keyboard.press("Space");
  await expect(first).toBeChecked();
  await page.getByRole("checkbox", { name: "Đánh dấu để xem lại" }).check();
  await expect(page.getByRole("status").filter({ hasText: "Đã lưu lúc" })).toBeVisible();
  const sheet = page.getByRole("button", { name: "Danh sách câu hỏi, phiếu câu hỏi" });
  await sheet.click();
  const dialog = page.getByRole("dialog", { name: "Phiếu câu hỏi" });
  await dialog.getByRole("checkbox", { name: "Chỉ xem câu đánh dấu" }).check();
  await expect(dialog.getByRole("button", { name: /Câu 1,/ })).toBeVisible();
  await expect(dialog.getByRole("button", { name: /Câu 2,/ })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(sheet).toBeFocused();
  await page.getByRole("button", { name: "Câu sau", exact: true }).click();
  await page.getByRole("radio", { name: "Sai", exact: true }).check();
  await expect(page.getByRole("status").filter({ hasText: "Đã lưu lúc" })).toBeVisible();
  await page.getByRole("button", { name: "Câu sau", exact: true }).click();
  const choices = page.getByRole("group", { name: "Chọn các đáp án bạn cho là đúng." });
  await choices.getByRole("checkbox", { name: "meeting", exact: true }).check();
  await choices.getByRole("checkbox", { name: "report", exact: true }).check();
  await expect(page.getByRole("status").filter({ hasText: "Đã lưu lúc" })).toBeVisible();
  await page.getByRole("button", { name: "Nộp bài", exact: true }).first().click();
  await expect(page.getByRole("dialog", { name: "Nộp bài", exact: true })).toContainText(
    "Đã trả lời 3 trên 3 câu đã tải",
  );
  await page.getByRole("button", { name: "Nộp các đáp án đã lưu" }).click();
  await expect(page.getByRole("heading", { name: "Trạng thái bài", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Xem kết quả", exact: true }).click();
  await expect(page.getByText("6/6 điểm", { exact: true })).toBeVisible();
  await expect(page.getByText("100.00%", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Xem giải thích đã mở" }).click();
  await expect(
    page.getByRole("heading", { name: "Giải thích", exact: true, level: 1 }),
  ).toBeVisible();
  await expect(page.getByText(/Bạn đã chọn · ✓ Đáp án của đề/)).toHaveCount(4);
  await expect(page.getByRole("radio")).toHaveCount(0);
  await expect(page.getByRole("checkbox")).toHaveCount(0);
});

test("history and pseudonymous leaderboard remain keyboard scrollable on narrow screens", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await login(page, "/history");
  const history = page.getByRole("region", { name: "Lịch sử các lượt thi" });
  await history.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => history.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  await expect(page.getByText("Chưa có điểm", { exact: true })).toHaveCount(2);
  await page.getByRole("button", { name: "Làm mới", exact: true }).click();
  await expect(page.getByRole("link", { name: "Kết quả", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Kết quả", exact: true }).click();
  await page.getByRole("link", { name: "Bảng xếp hạng của phiên bản này" }).click();
  const board = page.getByRole("region", { name: "Xếp hạng bằng bí danh" });
  await board.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => board.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  await expect(board).not.toContainText("Lan Nguyễn");
  await expect(board).not.toContainText("candidate@example.test");
  await expect(page.getByRole("button", { name: "Làm mới", exact: true })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
