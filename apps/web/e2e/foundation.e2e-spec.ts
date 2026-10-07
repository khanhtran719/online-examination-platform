import { expect, test, type Page } from "playwright/test";

async function login(page: Page, returnPath = "/dashboard") {
  await page.goto(`/login?return=${encodeURIComponent(returnPath)}`);
  await page.getByLabel("Email").fill("candidate@example.test");
  await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("fixture-password-ok");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Đăng nhập");
}

test("public mobile menu closes on Escape and restores trigger focus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  const trigger = page.getByRole("button", { name: "Menu", exact: true });
  await trigger.click();
  await expect(page.getByRole("button", { name: "Đóng menu", exact: true })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await page
    .getByRole("navigation", { name: "Chính", exact: true })
    .getByRole("link")
    .first()
    .focus();
  await page.keyboard.press("Escape");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
  await expect(page.getByRole("navigation", { name: "Chính", exact: true })).toBeHidden();
});

test("candidate mobile navigation closes after choosing a route and shows its active link", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await login(page);
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Chính", exact: true })
    .getByRole("link", { name: "Đề thi", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Đề thi", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Menu", exact: true })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await expect(
    page
      .getByRole("navigation", { name: "Chính", exact: true })
      .getByRole("link", { name: "Đề thi", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "Quản trị", exact: true })).toHaveCount(0);
  await page
    .locator("main")
    .getByRole("link", { name: /Networking Fundamentals/ })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Networking Fundamentals");
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Đề thi", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Menu", exact: true })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
});

test("admin mobile menu preserves capability filtering and logout", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "/admin");
  await page.locator("summary").filter({ hasText: "Kịch bản mẫu" }).click();
  await page.getByLabel("Quyền mẫu").selectOption("admin");
  await expect(
    page.getByRole("heading", { name: "Quản trị đề và kết quả", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Quản trị", exact: true })
    .getByRole("link", { name: "Đề thi", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Đề thi", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Menu", exact: true })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await page.getByLabel("Quyền mẫu").selectOption("reviewer");
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  const nav = page.getByRole("navigation", { name: "Quản trị", exact: true });
  await expect(nav.getByRole("link", { name: "Ngân hàng câu", exact: true })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Giám sát", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Đăng nhập", exact: true })).toBeVisible();
});

test("shared controls support keyboard entry, table scrolling and dialog focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/dev/ui");
  await expect(
    page.getByRole("heading", { name: "Thư viện giao diện", exact: true }),
  ).toBeVisible();
  const password = page.getByLabel("Mật khẩu mẫu", { exact: true });
  await password.focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Hiện mật khẩu" })).toBeFocused();
  await page.keyboard.press("Space");
  await expect(password).toHaveAttribute("type", "text");
  await expect(page.getByRole("button", { name: "Ẩn mật khẩu" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.keyboard.press("Tab");
  const select = page.getByLabel("Danh mục mẫu");
  await expect(select).toBeFocused();
  // Native popup arrows are not dispatched by headless macOS Chromium.
  // Typeahead exercises the select with a real keyboard event.
  await page.keyboard.press("t");
  await expect(select).toHaveValue("TOEIC");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Nội dung mẫu")).toBeFocused();
  await page.keyboard.press("End");
  await page.keyboard.type(" Nội dung nhập bằng bàn phím.");
  await expect(page.getByLabel("Nội dung mẫu")).toHaveValue(/Nội dung nhập bằng bàn phím/);
  await expect(page.getByLabel("Ô nhập bị khóa")).toBeDisabled();
  const table = page.getByRole("region", { name: "Bảng đề thi minh họa" });
  await table.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => table.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  const trigger = page.getByRole("button", { name: "Mở hộp thoại" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const close = page
    .getByRole("dialog", { name: "Hộp thoại" })
    .getByRole("button", { name: "Đóng", exact: true });
  await expect(close).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
