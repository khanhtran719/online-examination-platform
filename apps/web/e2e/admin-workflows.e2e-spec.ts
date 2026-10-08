import { expect, test, type Page } from "playwright/test";

async function admin(page: Page, route: string) {
  await page.goto(`/login?return=${encodeURIComponent(route)}`);
  await page.getByLabel("Email").fill("candidate@example.test");
  await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("fixture-password-ok");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.waitForURL(`**${route}`);
  await page.locator("summary").filter({ hasText: "Kịch bản mẫu" }).click();
  await page.getByLabel("Quyền mẫu").selectOption("admin");
  await page.locator("summary").filter({ hasText: "Kịch bản mẫu" }).click();
}

test("exam draft keeps editor state, prevents duplicate slots and distinguishes saved publication from local edits", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await admin(page, "/admin/exams/new");
  await page.getByLabel("Tiêu đề", { exact: true }).fill("Kỳ thi thử tháng 10");
  await page.getByRole("button", { name: "Các phần & câu hỏi", exact: true }).click();
  await page.getByRole("button", { name: "Chọn câu cho phần 1" }).click();
  const picker = page.getByRole("dialog", { name: "Chọn câu từ ngân hàng" });
  const choices = picker.getByRole("button", { name: /^Thêm:/ });
  await choices.first().click();
  await choices.first().click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Xuống", exact: true }).first().click();
  await page.getByRole("button", { name: "Thêm phần", exact: true }).click();
  await page.getByRole("button", { name: "Chọn câu cho phần 2" }).click();
  await expect(picker.getByRole("button", { name: /^Đã có:/ })).toHaveCount(2);
  await expect(picker.getByRole("button", { name: /^Đã có:/ }).first()).toBeDisabled();
  await choices.first().click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Thông tin", exact: true }).click();
  await expect(page.getByLabel("Tiêu đề", { exact: true })).toHaveValue("Kỳ thi thử tháng 10");
  await page.getByRole("button", { name: "Lưu nháp", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/exams\/[^/]+\/edit$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kỳ thi thử tháng 10");
  await page.getByLabel("Tiêu đề", { exact: true }).fill("Chỉnh sửa chưa lưu");
  await page.getByRole("button", { name: "Phát hành", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("bản nháp đã lưu trên máy chủ");
  await page.getByRole("dialog").getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(page.getByText("✓ Đang phát hành", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kỳ thi thử tháng 10");
  await expect(page.getByLabel("Tiêu đề", { exact: true })).toHaveValue("Chỉnh sửa chưa lưu");
  await page.getByRole("button", { name: "Gỡ phát hành", exact: true }).click();
  await expect(page.getByText("Bản nháp", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Lưu trữ", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(page.getByText("Đã lưu trữ", { exact: true })).toBeVisible();
});

test("question keys use the keyboard and confirm destructive type changes before saving", async ({
  page,
}) => {
  await admin(page, "/admin/questions/new");
  await page.getByLabel("Đề bài", { exact: true }).fill("Chọn các từ đúng.");
  await page.getByLabel("Lựa chọn 1").fill("Một");
  await page.getByLabel("Lựa chọn 2").fill("Hai");
  await page.getByRole("button", { name: "Thêm lựa chọn" }).click();
  await page.getByLabel("Lựa chọn 3").fill("Ba");
  await page.getByRole("combobox", { name: "Loại", exact: true }).selectOption("MULTIPLE_CHOICE");
  const key = page.getByRole("checkbox", { name: "Đáp án đúng 3" });
  await key.focus();
  await page.keyboard.press("Space");
  await expect(key).toBeChecked();
  await page.getByRole("combobox", { name: "Loại", exact: true }).selectOption("SINGLE_CHOICE");
  await page.getByRole("dialog").getByRole("button", { name: "Hủy", exact: true }).click();
  await expect(key).toBeChecked();
  await page.getByRole("combobox", { name: "Loại", exact: true }).selectOption("SINGLE_CHOICE");
  await page.getByRole("dialog").getByRole("button", { name: "Đổi loại", exact: true }).click();
  await expect(page.getByRole("radio", { name: "Đáp án đúng 1" })).toBeChecked();
  await page.getByRole("button", { name: "Lưu câu", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/questions\/[^/]+\/edit$/);
  await expect(page.getByRole("heading", { name: "Sửa câu", exact: true })).toBeVisible();
  await expect(page.getByLabel("Đề bài", { exact: true })).toHaveValue("Chọn các từ đúng.");
  const archive = page.getByRole("button", { name: "Lưu trữ", exact: true });
  await archive.click();
  await page.keyboard.press("Escape");
  await expect(archive).toBeFocused();
  await archive.click();
  await page.getByRole("dialog", { name: "Lưu trữ câu hỏi" }).getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(page.getByText("Đã lưu trữ", { exact: true })).toBeVisible();
  await expect(archive).toBeDisabled();
});

test("import validates first, invalidates a changed file and asks before committing", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await admin(page, "/admin/imports/new");
  const text = page.getByLabel("Nội dung JSON", { exact: true });
  const original = await text.inputValue();
  const commit = page.getByRole("button", { name: "Nhập câu hỏi", exact: true });
  await expect(commit).toBeDisabled();
  await page.getByRole("button", { name: "Kiểm tra dữ liệu", exact: true }).click();
  await expect(page.getByText("Chưa ghi ngân hàng", { exact: true })).toBeVisible();
  await expect(commit).toBeEnabled();
  await text.fill("{}");
  await expect(commit).toBeDisabled();
  await expect(page.getByText("JSON chưa hợp lệ", { exact: true })).toBeVisible();
  await text.fill(original);
  await page.getByRole("button", { name: "Kiểm tra dữ liệu", exact: true }).click();
  await commit.click();
  const dialog = page.getByRole("dialog", { name: "Xác nhận nhập câu hỏi" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(commit).toBeFocused();
  await commit.click();
  await dialog.getByRole("button", { name: "Nhập vào ngân hàng" }).click();
  await expect(page.getByRole("heading", { name: "Báo cáo nhập", exact: true })).toBeVisible();
  await expect(page.getByText("Đã ghi vào ngân hàng", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Các câu đã nhập" })).toContainText("q1");
});

test("audit restores focus, failed replay stays pending and reviewer capabilities filter the page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await admin(page, "/admin/audit");
  const table = page.getByRole("region", { name: "Nhật ký quản trị" });
  await table.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => table.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  const detail = page.getByRole("button", { name: "Chi tiết", exact: true }).first();
  await detail.click();
  await expect(page.getByRole("dialog", { name: "Chi tiết nhật ký" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(detail).toBeFocused();
  // Use client navigation to preserve the in-memory demo session.
  await page.evaluate(() => {
    history.pushState(null, "", "/admin/attempts/00000000-0000-4000-8000-000000000403");
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lượt 00000000…000403");
  await page.getByLabel("Lý do", { exact: true }).fill("Kiểm tra lại lỗi chấm bài");
  await page.getByRole("button", { name: "Gửi xử lý lại", exact: true }).click();
  await expect(
    page.getByText("Đã nhận yêu cầu xử lý lại. Kết quả chưa được tính là xong.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Chưa có điểm", { exact: true })).toBeVisible();
  await page.locator("summary").filter({ hasText: "Kịch bản mẫu" }).click();
  await page.getByLabel("Quyền mẫu").selectOption("reviewer");
  await expect(page.getByRole("button", { name: "Gửi xử lý lại", exact: true })).toHaveCount(0);
  await expect(
    page
      .getByRole("navigation", { name: "Quản trị", exact: true })
      .getByRole("link", { name: "Ngân hàng câu", exact: true }),
  ).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
