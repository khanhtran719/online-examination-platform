import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "playwright/test";

const evidence = path.resolve(
  process.env.WEB_EVIDENCE_DIR ?? "../../.local/web-evidence/latest",
  "questions-import",
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
  if ((await page.getByRole("dialog").count()) === 0)
    await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  const fontLoaded = await page.evaluate(() =>
    document.fonts.check('400 16px "Be Vietnam Pro"', "Câu hỏi tiếng Việt"),
  );
  await writeFile(
    path.join(evidence, `${name}.json`),
    JSON.stringify(
      {
        viewport: page.viewportSize(),
        width,
        fontLoaded,
        violations: scan.violations,
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
  expect(scan.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual(
    [],
  );
  expect(fontLoaded).toBe(true);
  expect(width).toBeLessThanOrEqual(page.viewportSize()!.width);
}
test("PORT-03 bank filters loaded questions without keys and fits Web/tablet", async ({ page }) => {
  await admin(page, "/admin/questions");
  const bank = page.getByRole("region", { name: "Ngân hàng câu hỏi" });
  await expect(bank.getByRole("link").first()).toBeVisible();
  await expect(bank.getByRole("columnheader", { name: "Đáp án", exact: true })).toHaveCount(0);
  for (const width of [1440, 1280, 1024, 768]) {
    await page.setViewportSize({ width, height: 1000 });
    await capture(page, `bank-${width}`);
  }
  await page.getByRole("combobox", { name: "Loại câu hỏi" }).selectOption("TRUE_FALSE");
  await expect(bank).toContainText("Đúng / Sai");
  await page.getByLabel("Tìm trong phần đã tải").fill("no-matching-loaded-question");
  await expect(page.getByRole("heading", { name: "Không khớp bộ lọc" })).toBeVisible();
});
test("PORT-03 option identity, candidate projection, type conversion and archive remain correct", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await admin(page, "/admin/questions/new");
  await page
    .getByLabel("Đề bài", { exact: true })
    .fill("Những biện pháp nào giúp bảo vệ tài khoản quản trị?");
  await page.getByLabel("Lựa chọn 1", { exact: true }).fill("Bật xác thực đa yếu tố");
  await page.getByLabel("Lựa chọn 2", { exact: true }).fill("Dùng chung tài khoản quản trị");
  await page.getByRole("button", { name: "Thêm lựa chọn", exact: true }).click();
  await page.getByLabel("Lựa chọn 3", { exact: true }).fill("Cấp quyền tối thiểu cần thiết");
  await page.getByLabel("Giải thích", { exact: true }).fill("PRIVATE_EXPLANATION_SENTINEL");
  await capture(page, "create-single-1440");
  await page.getByRole("combobox", { name: "Loại", exact: true }).selectOption("MULTIPLE_CHOICE");
  await page.getByRole("checkbox", { name: "Đáp án đúng 3" }).check();
  await page.getByRole("button", { name: "Lên lựa chọn 3", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Đáp án đúng 2" })).toBeChecked();
  await expect(page.getByLabel("Lựa chọn 2", { exact: true })).toHaveValue(
    "Cấp quyền tối thiểu cần thiết",
  );
  await capture(page, "create-multiple-1440");
  await page.setViewportSize({ width: 768, height: 1024 });
  await capture(page, "editor-768");
  await page.getByRole("button", { name: "Xem như thí sinh" }).click();
  const preview = page.getByRole("dialog", { name: "Xem câu hỏi như thí sinh" });
  await expect(preview).not.toContainText("PRIVATE_EXPLANATION_SENTINEL");
  await expect(preview.getByRole("checkbox")).toHaveCount(0);
  await capture(page, "candidate-preview-768");
  await page.keyboard.press("Escape");
  await page.getByRole("combobox", { name: "Loại", exact: true }).selectOption("TRUE_FALSE");
  await capture(page, "type-change-768");
  await page.getByRole("button", { name: "Đổi loại", exact: true }).click();
  await expect(page.getByRole("radio", { name: "Đáp án đúng 1" })).toBeChecked();
  await capture(page, "create-true-false-768");
  await page.getByRole("button", { name: "Lưu câu", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/questions\/[^/]+\/edit$/);
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.getByLabel("Đề bài", { exact: true }).fill("Bản đang sửa cục bộ");
  await fault(page, "conflict-save");
  await page.getByRole("button", { name: "Lưu câu", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Câu hỏi đã thay đổi ở nơi khác" })).toContainText(
    "Bản đang sửa cục bộ",
  );
  await capture(page, "question-conflict-1280");
  await page.getByRole("button", { name: "Bỏ sửa và dùng bản mới" }).click();
  await expect(page.getByLabel("Đề bài", { exact: true })).not.toHaveValue("Bản đang sửa cục bộ");
  await fault(page, "lose-ack");
  await page.getByRole("button", { name: "Lưu câu", exact: true }).click();
  await expect(page.getByText("Chưa xác nhận được kết quả", { exact: true })).toBeVisible();
  await capture(page, "question-unknown-1280");
  await page.getByRole("button", { name: "Thử lại yêu cầu", exact: true }).click();
  await expect(page.getByText("Đã lưu câu vào ngân hàng.", { exact: true })).toBeVisible();
  await fault(page, "delay-ack");
  await page.getByRole("button", { name: "Lưu trữ", exact: true }).click();
  await capture(page, "archive-confirm-1280");
  await page.getByRole("dialog").getByRole("button", { name: "Xác nhận", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Lưu trữ câu hỏi" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Lưu câu", exact: true })).toBeDisabled();
  await expect(page.getByText("Đã lưu trữ", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Đề bài", { exact: true })).toBeDisabled();
  expect(errors).toEqual([]);
});
test("PORT-03 validates exact import snapshot and recovers an unknown atomic commit", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await admin(page, "/admin/imports/new");
  const sample = await readFile(
    path.resolve(
      "../../docs/web-ui/templates/codex-desktop-v1/groups/questions-import/sample-import.json",
    ),
    "utf8",
  );
  await page.getByLabel("Nội dung JSON", { exact: true }).fill(sample);
  await capture(page, "import-input-1440");
  await page.getByRole("button", { name: "Kiểm tra dữ liệu", exact: true }).click();
  await expect(page.getByText("Chưa ghi ngân hàng", { exact: true })).toBeVisible();
  for (const width of [1440, 1024, 768]) {
    await page.setViewportSize({ width, height: 1000 });
    await capture(page, `import-valid-${width}`);
  }
  const commit = page.getByRole("button", { name: "Nhập câu hỏi", exact: true });
  await page.getByLabel("Nội dung JSON", { exact: true }).fill("{}");
  await expect(commit).toBeDisabled();
  await page.getByLabel("Nội dung JSON", { exact: true }).fill(sample);
  await page.getByRole("button", { name: "Kiểm tra dữ liệu", exact: true }).click();
  await commit.click();
  await capture(page, "import-confirm-768");
  await page.keyboard.press("Escape");
  await expect(commit).toBeFocused();
  await fault(page, "lose-ack");
  await commit.click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Nhập vào ngân hàng", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Chưa biết kết quả lần gửi");
  await capture(page, "import-unknown-768");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Thử lại yêu cầu", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Báo cáo nhập", exact: true })).toBeVisible();
  const mappings = page.getByRole("region", { name: "Các câu đã nhập" });
  await expect(mappings.getByRole("row")).toHaveCount(4);
  for (const width of [1440, 1280, 1024, 768]) {
    await page.setViewportSize({ width, height: 1000 });
    await capture(page, `report-${width}`);
  }
});
