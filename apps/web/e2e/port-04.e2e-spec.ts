import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "playwright/test";

const evidence = path.resolve(
  process.env.WEB_EVIDENCE_DIR ?? "../../.local/web-evidence/latest",
  "operations-reporting",
);
const exam = "00000000-0000-4000-8000-000000000101";
const failed = "00000000-0000-4000-8000-000000000403";
async function admin(page: Page, route = "/admin") {
  await page.goto(`/login?return=${encodeURIComponent(route)}`);
  await page.getByLabel("Email").fill("candidate@example.test");
  await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("fixture-password-ok");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.waitForURL(`**${route}`);
  await preset(page, "admin");
  await page.evaluate(() => document.fonts.ready);
}
async function preset(page: Page, value: string) {
  const menu = page.locator("summary").filter({ hasText: "Kịch bản mẫu" });
  await menu.click();
  await page.getByLabel("Quyền mẫu").selectOption(value);
  await menu.click();
}
async function navigate(page: Page, route: string) {
  await page.evaluate((to) => {
    history.pushState(null, "", to);
    dispatchEvent(new PopStateEvent("popstate"));
  }, route);
}
async function capture(page: Page, name: string) {
  await mkdir(evidence, { recursive: true });
  const dialog = await page.getByRole("dialog").count();
  if (!dialog) await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  const state = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
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
  await page.screenshot({ path: path.join(evidence, `${name}.png`), fullPage: !dialog });
  expect(scan.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }))).toEqual(
    [],
  );
  expect(state.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(state.fontLoaded).toBe(true);
}
test("PORT-04 overview, scoped business metrics and unavailable technical providers fit Web/tablet", async ({
  page,
}) => {
  await admin(page);
  for (const width of [1440, 1280, 1024, 768]) {
    await page.setViewportSize({ width, height: 1000 });
    await navigate(page, "/admin");
    await expect(page.getByText(/Mốc dữ liệu máy chủ:/)).toBeVisible();
    await capture(page, `overview-${width}`);
    await navigate(page, "/admin/metrics");
    await expect(page.getByRole("heading", { name: "Chờ xử lý toàn hệ thống" })).toBeVisible();
    await expect(page.getByText("Chưa có dữ liệu", { exact: true })).toHaveCount(4);
    await capture(page, `metrics-${width}`);
  }
  await preset(page, "reviewer");
  await expect(page.getByRole("heading", { name: "Chờ xử lý toàn hệ thống" })).toBeVisible();
  await expect(page.getByText("Chưa có quyền xem số liệu kỹ thuật")).toBeVisible();
  await expect(page.getByText("Chưa có dữ liệu", { exact: true })).toHaveCount(0);
});
test("PORT-04 monitor and nullable ledger retain their actual scope at four widths", async ({
  page,
}) => {
  await admin(page, "/admin/monitor");
  for (const width of [1440, 1280, 1024, 768]) {
    await page.setViewportSize({ width, height: 1000 });
    await navigate(page, "/admin/monitor");
    await expect(page.getByRole("link", { name: "Mở giám sát →" }).first()).toBeVisible();
    await capture(page, `monitor-index-${width}`);
    await navigate(page, `/admin/exams/${exam}/monitor`);
    await expect(page.getByText(/Mốc máy chủ của trang đầu/)).toBeVisible();
    await capture(page, `monitor-exam-${width}`);
    await navigate(page, `/admin/exams/${exam}/submissions`);
    await expect(page.getByText("Chưa có điểm", { exact: true }).first()).toBeVisible();
    await capture(page, `submissions-${width}`);
  }
  await page.getByLabel("Lọc theo phiên bản đã phát hành").fill("invalid");
  await page.getByRole("button", { name: "Áp dụng bộ lọc" }).click();
  await expect(page.getByRole("alert")).toContainText("Mã phiên bản không đúng định dạng");
  await expect(page.getByText("Chưa có điểm", { exact: true }).first()).toBeVisible();
});
test("PORT-04 statistics, audit drawer and failed detail match selected layouts", async ({
  page,
}) => {
  await admin(page, "/admin/audit");
  for (const width of [1440, 1280, 1024, 768]) {
    await page.setViewportSize({ width, height: 1000 });
    await navigate(page, "/admin/audit");
    const detail = page.getByRole("button", { name: "Chi tiết", exact: true }).first();
    await expect(detail).toBeVisible();
    await capture(page, `audit-${width}`);
    await detail.click();
    await expect(page.getByRole("dialog")).toContainText("Không được cung cấp");
    const panel = await page.getByRole("dialog").boundingBox();
    expect(panel!.x + panel!.width).toBeCloseTo(width, 0);
    await capture(page, `audit-drawer-${width}`);
    await page.keyboard.press("Escape");
    await expect(detail).toBeFocused();
    await navigate(
      page,
      `/admin/exams/${exam}/versions/00000000-0000-4000-8000-000000000201/statistics`,
    );
    await expect(page.getByRole("button", { name: "Xem lựa chọn" }).first()).toBeVisible();
    await expect(page.getByText("Chưa có mẫu", { exact: true }).first()).toBeVisible();
    await capture(page, `statistics-zero-${width}`);
    await navigate(page, `/admin/attempts/${failed}`);
    await expect(page.getByText("Chưa có điểm", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Xử lý thất bại", exact: true })).toHaveCount(0);
    await capture(page, `failed-detail-${width}`);
  }
});
test("PORT-04 replay confirmation restores focus, retries a frozen request and clears on permission loss", async ({
  page,
}) => {
  await admin(page, `/admin/attempts/${failed}`);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const request = page.getByRole("button", { name: "Yêu cầu xử lý lại", exact: true });
  await page
    .getByLabel("Lý do", { exact: true })
    .fill("Phụ thuộc đã được khôi phục; xử lý lại bài nộp gốc.");
  await request.click();
  await page.keyboard.press("Escape");
  await expect(request).toBeFocused();
  for (const width of [1440, 1280, 1024, 768]) {
    await page.setViewportSize({ width, height: 1000 });
    await request.click();
    const dialog = page.getByRole("dialog", { name: "Yêu cầu xử lý lại" });
    await expect(dialog.getByLabel("Lý do xác nhận")).toHaveValue(
      "Phụ thuộc đã được khôi phục; xử lý lại bài nộp gốc.",
    );
    await capture(page, `replay-confirm-${width}`);
    await page.keyboard.press("Escape");
  }
  const menu = page.locator("summary").filter({ hasText: "Kịch bản mẫu" });
  await menu.click();
  await page.getByLabel("Lỗi lưu tiếp theo").selectOption("lose-ack");
  await menu.click();
  await request.click();
  await page.getByRole("dialog").getByRole("button", { name: "Gửi yêu cầu" }).click();
  await expect(page.getByText("Chưa nhận được xác nhận", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Lý do", { exact: true })).toBeDisabled();
  await capture(page, "replay-unknown-768");
  await page.getByRole("button", { name: "Thử gửi lại cùng nội dung" }).click();
  await expect(
    page.getByText("Đã nhận yêu cầu xử lý lại. Kết quả chưa được tính là xong.", { exact: true }),
  ).toBeVisible();
  await preset(page, "reviewer");
  await expect(request).toHaveCount(0);
  await preset(page, "admin");
  await expect(page.getByLabel("Lý do", { exact: true })).toHaveValue("");
  expect(errors).toEqual([]);
});
test("PORT-04 counts multiple selections independently against completed attempts", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await admin(page);
  await navigate(page, "/exams/00000000-0000-4000-8000-000000000102");
  await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Bắt đầu", exact: true }).click();
  await expect(page.getByRole("button", { name: "Câu sau", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Câu sau", exact: true }).click();
  await page.getByRole("button", { name: "Câu sau", exact: true }).click();
  const choices = page
    .getByRole("group", { name: "Chọn các đáp án bạn cho là đúng." })
    .getByRole("checkbox");
  const count = await choices.count();
  expect(count).toBeGreaterThan(1);
  for (const choice of await choices.all()) await choice.check();
  await expect(page.getByRole("status").filter({ hasText: "Đã lưu lúc" })).toBeVisible();
  await page.getByRole("button", { name: "Nộp bài", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Nộp các đáp án đã lưu" }).click();
  await expect(page.getByRole("heading", { name: "Kết quả đã sẵn sàng" })).toBeVisible();
  await navigate(
    page,
    "/admin/exams/00000000-0000-4000-8000-000000000102/versions/00000000-0000-4000-8000-000000000202/statistics",
  );
  await page.getByRole("button", { name: "Xem lựa chọn" }).nth(2).click();
  await expect(page.getByText(`Tổng lượt lựa chọn: ${count}`, { exact: true })).toBeVisible();
  const bars = page
    .getByRole("region", { name: "Lượt lựa chọn của câu đã chọn" })
    .getByRole("img", { name: "1 trên 2 lượt", exact: true });
  await expect(bars).toHaveCount(count);
  for (const bar of await bars.all()) {
    const track = await bar.boundingBox(),
      fill = await bar.locator("span").boundingBox();
    expect(fill!.width / track!.width).toBeCloseTo(0.5, 2);
  }
  for (const width of [1440, 1280, 1024, 768]) {
    await page.setViewportSize({ width, height: 1000 });
    await capture(page, `statistics-counts-${width}`);
  }
});
