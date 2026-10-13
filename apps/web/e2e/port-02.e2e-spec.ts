import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "playwright/test";

const evidence = path.resolve(
  process.env.WEB_EVIDENCE_DIR ?? "../../.local/web-evidence/latest",
  "editor",
);
async function admin(page: Page, route: string) {
  await page.goto(`/login?return=${encodeURIComponent(route)}`);
  await page.getByLabel("Email").fill("candidate@example.test");
  await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("fixture-password-ok");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.waitForURL(`**${route}`);
  await page.locator("summary").filter({ hasText: "Kịch bản mẫu" }).click();
  await page.getByLabel("Quyền mẫu").selectOption("admin");
  await page.locator("summary").filter({ hasText: "Kịch bản mẫu" }).click();
  await page.evaluate(() => document.fonts.ready);
}
async function fault(page: Page, value: string) {
  await page.locator("summary").filter({ hasText: "Kịch bản mẫu" }).click();
  await page.getByLabel("Lỗi lưu tiếp theo").selectOption(value);
  await page.locator("summary").filter({ hasText: "Kịch bản mẫu" }).click();
}
async function capture(page: Page, name: string) {
  await mkdir(evidence, { recursive: true });
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  await writeFile(
    path.join(evidence, `${name}.json`),
    JSON.stringify(
      {
        viewport: page.viewportSize(),
        violations: scan.violations,
        width,
        fontLoaded: await page.evaluate(() =>
          document.fonts.check('400 16px "Be Vietnam Pro"', "Bài thi tiếng Việt"),
        ),
        url: page.url(),
      },
      null,
      2,
    ),
  );
  await page.screenshot({
    path: path.join(evidence, `${name}.png`),
    fullPage: (await page.getByRole("dialog").count()) === 0,
  });
  expect(
    scan.violations.map((item) => ({
      id: item.id,
      targets: item.nodes.map((node) => node.target),
    })),
  ).toEqual([]);
  expect(width).toBeLessThanOrEqual(page.viewportSize()!.width);
}

test("PORT-02 creates a structured draft, validates locally and confirms publication/removal/exit", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await admin(page, "/admin/exams/new");
  await page
    .getByLabel("Tiêu đề", { exact: true })
    .fill("Nền tảng điện toán đám mây — Bài ôn tập 01");
  await page.getByLabel("Thời lượng (phút)", { exact: true }).fill("90");
  await page.getByLabel("Mở", { exact: true }).fill("2026-11-15T08:00");
  await page.getByLabel("Đóng", { exact: true }).fill("2026-11-15T12:00");
  await page.getByLabel("Giới hạn lượt", { exact: true }).fill("3");
  await capture(page, "information-1440");
  await page.getByRole("button", { name: "Các phần & câu hỏi", exact: true }).click();
  await capture(page, "structure-empty-1440");
  const names = ["Kiến thức nền", "Quyền truy cập & bảo mật", "Tình huống triển khai"];
  for (let index = 0; index < 3; index += 1) {
    if (index) await page.getByRole("button", { name: "Thêm phần", exact: true }).click();
    await page.getByLabel("Tên phần", { exact: true }).nth(index).fill(names[index]!);
    await page.getByRole("button", { name: `Chọn câu cho phần ${index + 1}`, exact: true }).click();
    const picker = page.getByRole("dialog", { name: "Chọn câu từ ngân hàng" });
    await picker
      .getByRole("button", { name: /^Thêm:/ })
      .first()
      .click();
    await picker
      .getByRole("button", { name: /^Thêm:/ })
      .first()
      .click();
    await page.keyboard.press("Escape");
    const section = page.getByRole("group", { name: `Phần ${index + 1}`, exact: true });
    await section.getByLabel("Điểm câu 1", { exact: true }).fill(String([10, 15, 25][index]));
    await section.getByLabel("Điểm câu 2", { exact: true }).fill(String([10, 15, 25][index]));
  }
  await page.getByRole("button", { name: "Bỏ phần 1", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("2 phần · 4 câu · 80 điểm");
  await capture(page, "remove-section-1440");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Bỏ phần 1", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Kiểm tra & phát hành", exact: true }).click();
  await expect(page.getByText("5/5 mục đạt", { exact: true })).toBeVisible();
  await capture(page, "preflight-1440");
  await page.setViewportSize({ width: 1280, height: 1000 });
  await capture(page, "preflight-1280");
  await page.setViewportSize({ width: 320, height: 844 });
  await capture(page, "preflight-320");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Lưu và phát hành", exact: true }).click();
  await capture(page, "publish-confirm-1440");
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "← Danh sách đề", exact: true }).click();
  await capture(page, "unsaved-exit-1440");
  await page.getByRole("button", { name: "Ở lại chỉnh sửa", exact: true }).click();
  await fault(page, "delay-ack");
  await page.getByRole("button", { name: "Lưu và phát hành", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Đang chờ máy chủ xác nhận");
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "Đóng", exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  await capture(page, "publication-pending-1440");
  await expect(page).toHaveURL(/\/admin\/exams\/[^/]+\/edit$/);
  await expect(page.getByText("✓ Đang phát hành", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Gỡ phát hành", exact: true }).click();
  await capture(page, "unpublish-confirm-1440");
  await page.getByRole("dialog").getByRole("button", { name: "Xác nhận", exact: true }).click();
  await page.getByRole("button", { name: "Lưu trữ", exact: true }).click();
  await capture(page, "archive-confirm-1440");
  await page.getByRole("dialog").getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(page.getByText("Đã lưu trữ", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Tiêu đề", { exact: true })).toBeDisabled();
  expect(errors).toEqual([]);
});

test("PORT-02 compares conflicts, guards reload and retries an unknown write", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await admin(page, "/admin/exams/00000000-0000-4000-8000-000000000101/edit");
  await expect(page.getByLabel("Tiêu đề", { exact: true })).not.toHaveValue("");
  const original = await page.getByLabel("Tiêu đề", { exact: true }).inputValue();
  await page.getByLabel("Tiêu đề", { exact: true }).fill("Bản đang sửa cục bộ");
  await page.getByLabel("Đóng", { exact: true }).fill("2026-01-01T00:00");
  await page.getByRole("button", { name: "Kiểm tra & phát hành", exact: true }).click();
  await capture(page, "preflight-validation-1280");
  await page.getByRole("button", { name: "Giờ đóng phải sau giờ mở. →", exact: true }).click();
  await expect(page.getByLabel("Đóng", { exact: true })).toBeFocused();
  await page.getByLabel("Đóng", { exact: true }).fill("2027-01-01T00:00");
  await fault(page, "conflict-save");
  await page.getByRole("button", { name: "Lưu nháp", exact: true }).click();
  const compare = page.getByRole("dialog", { name: "Bản nháp đã thay đổi ở nơi khác" });
  await expect(compare).toContainText("Bản đã lưu mới nhất");
  await capture(page, "draft-conflict-1280");
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Tiêu đề", { exact: true })).toHaveValue("Bản đang sửa cục bộ");
  await page.getByRole("button", { name: "Đối chiếu bản nháp", exact: true }).click();
  await page.getByRole("button", { name: "Bỏ sửa và dùng bản mới", exact: true }).click();
  await expect(page.getByLabel("Tiêu đề", { exact: true })).toHaveValue(original);
  await fault(page, "lose-ack");
  await page.getByRole("button", { name: "Kiểm tra & phát hành", exact: true }).click();
  await page.getByRole("button", { name: "Lưu và phát hành", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Chưa biết kết quả lần gửi");
  await capture(page, "unknown-write-1280");
  await page.getByRole("button", { name: "Thử lại yêu cầu", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("status").filter({ hasText: "Đã phát hành phiên bản" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Thông tin", exact: true }).click();
  await page.getByLabel("Tiêu đề", { exact: true }).fill("Chưa lưu trước tải lại");
  let warned = false;
  page.once("dialog", async (dialog) => {
    warned = dialog.type() === "beforeunload";
    await dialog.dismiss();
  });
  await page.reload({ timeout: 2000 }).catch(() => undefined);
  expect(warned).toBe(true);
  await expect(page.getByLabel("Tiêu đề", { exact: true })).toHaveValue("Chưa lưu trước tải lại");
  await page.locator("summary").filter({ hasText: "Kịch bản mẫu" }).click();
  await page.getByLabel("Quyền mẫu").selectOption("reviewer");
  await page.locator("summary").filter({ hasText: "Kịch bản mẫu" }).click();
  await expect(page.getByLabel("Tiêu đề", { exact: true })).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Quản trị", exact: true })
    .getByRole("link", { name: "Về bảng làm việc", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Bảng làm việc", exact: true })).toBeVisible();
});
