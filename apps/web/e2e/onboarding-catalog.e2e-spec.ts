import { expect, test } from "playwright/test";

test("verification recovery and explicit confirmation remain usable on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/verify-email");
  await expect(page.getByText("Liên kết không có mã", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Mật khẩu mới")).toHaveCount(0);
  await page.getByRole("link", { name: "Gửi lại email xác nhận", exact: true }).click();
  await page.getByLabel("Email cần gửi lại").fill("pending@example.test");
  await page.getByRole("button", { name: "Gửi lại hướng dẫn", exact: true }).click();
  await expect(page.getByText("Đã nhận yêu cầu", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Gửi lại sau/ })).toBeDisabled();
  await page.goto(`/verify-email#token=${"A".repeat(43)}`);
  await expect(page.getByLabel("Mật khẩu mới")).toBeVisible();
  expect(new URL(page.url()).hash).toBe("");
  await expect(page.getByRole("heading", { name: "Xác nhận email", exact: true })).toBeVisible();
  await page.getByLabel("Mật khẩu mới").fill("fixture-final-password");
  await page.getByLabel("Nhập lại mật khẩu").fill("fixture-final-password");
  await page.getByRole("button", { name: "Xác nhận email", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Đăng nhập", exact: true })).toBeVisible();
  await expect(page.getByText("Email đã xác nhận", { exact: true })).toBeVisible();
});

test("catalog filters, browser Back and detail cancellation preserve navigation", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("candidate@example.test");
  await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("fixture-password-ok");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Bảng làm việc", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /5\/6 điểm/ })).toHaveAttribute("href", /\/result$/);
  await page.getByRole("link", { name: "Đề thi", exact: true }).click();
  await page.getByRole("button", { name: "TOEIC", exact: true }).click();
  await expect(page.getByRole("button", { name: "TOEIC", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("link", { name: /Networking Fundamentals/ })).toHaveCount(0);
  await page.getByLabel("Số dòng mỗi trang").selectOption("100");
  await expect(page.getByRole("link", { name: /TOEIC — Reading practice/ })).toBeVisible();
  await page.getByRole("button", { name: "IELTS", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Không có đề trong bộ lọc này" })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("button", { name: "TOEIC", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("link", { name: /TOEIC — Reading practice/ }).click();
  await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Xác nhận bắt đầu" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Bắt đầu", exact: true })).toBeFocused();
  await page.getByRole("link", { name: /Danh sách đề/ }).click();
  await expect(page.getByRole("heading", { name: "Đề thi", exact: true })).toBeVisible();
});
