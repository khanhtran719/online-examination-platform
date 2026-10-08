import { mkdir } from "node:fs/promises";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "playwright/test";

const shotDir = process.env.WEB_EVIDENCE_DIR
  ? path.resolve(process.env.WEB_EVIDENCE_DIR, "regression")
  : path.resolve(process.cwd(), "../../docs/web-ui/evidence/vao-nhip-thi-2026-10-07/regression");
const widths = [320, 390, 768, 1024, 1440] as const;

async function shot(page: Page, name: string): Promise<void> {
  await mkdir(shotDir, { recursive: true });
  await page.screenshot({ path: path.join(shotDir, `${name}.png`), fullPage: true });
}

async function axe(page: Page, name: string): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (item) => item.impact === "serious" || item.impact === "critical",
  );
  expect(serious, `${name}: ${serious.map((item) => item.id).join(",")}`).toEqual([]);
}

function scenarios(page: Page) {
  return page.locator("summary").filter({ hasText: "Kịch bản mẫu" });
}

async function login(page: Page, returnPath = "/dashboard"): Promise<void> {
  await page.goto(`/login?return=${encodeURIComponent(returnPath)}`);
  await page.getByLabel("Email").fill("candidate@example.test");
  await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("fixture-password-ok");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(
    page.getByRole("heading", {
      name: returnPath === "/admin" ? "Quản trị" : "Bảng làm việc",
      exact: true,
    }),
  ).toBeVisible();
}

test.describe("demo", () => {
  test.beforeEach(async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      (window as Window & { __pageErrors?: string[] }).__pageErrors = [];
    });
    page.on("pageerror", (error) => {
      void page
        .evaluate((message) => {
          const target = window as Window & { __pageErrors?: string[] };
          target.__pageErrors?.push(message);
        }, error.message)
        .catch(() => undefined);
    });
  });

  test("public pages at five widths", async ({ page }) => {
    for (const width of widths) {
      await page.setViewportSize({ width, height: width < 768 ? 720 : 900 });
      await page.goto("/");
      await expect(page.getByRole("status").filter({ hasText: "Dữ liệu mẫu" })).toBeVisible();
      await expect(page.getByRole("heading", { name: /Vào nhịp thi/ })).toBeVisible();
      await shot(page, `home-${width}`);
      if (width === 1440 || width === 320) await axe(page, `home-${width}`);
    }
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto("/login");
    await page.getByLabel("Email").fill("disabled@example.test");
    await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("fixture-password-ok");
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page.getByRole("alert")).toContainText("Email hoặc mật khẩu không đúng.");
    await shot(page, "login-401-390");
    await page.goto("/register");
    await page.getByLabel("Email").fill("person@example.test");
    await page.getByLabel("Tên hiển thị").fill("Lan Nguyễn");
    await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("short");
    await page.getByLabel("Nhập lại mật khẩu").fill("short");
    await page.getByRole("button", { name: "Tạo tài khoản" }).click();
    await expect(page.getByText(/15/)).toBeVisible();
    await shot(page, "register-short-password-390");
    await page.goto("/missing-page");
    await expect(page.getByRole("heading", { name: "Không có trang này" })).toBeVisible();
    await shot(page, "not-found-390");
  });

  test("exam save, conflict, frozen attempt and result", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page);
    await shot(page, "dashboard-1440");
    const stored = await page.evaluate(() => ({
      local: window.localStorage.length,
      session: window.sessionStorage.length,
    }));
    expect(stored).toEqual({ local: 0, session: 0 });
    await page.getByRole("link", { name: "Đề thi", exact: true }).click();
    await page.getByRole("link", { name: /Đại học/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Đại học");
    await shot(page, "exam-detail-long-title-1440");
    await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Bắt đầu", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Đại học");
    await expect(page.getByLabel("Thời gian còn lại")).not.toHaveText("—:—");
    const first = page.getByRole("radio").first();
    await first.check();
    await expect(page.getByRole("status").filter({ hasText: "Đã lưu lúc" })).toBeVisible();
    await shot(page, "exam-room-saved-1440");
    await axe(page, "exam-room-1440");
    await scenarios(page).click();
    await page.getByLabel("Lỗi lưu tiếp theo").selectOption("conflict-save");
    await page.getByRole("radio").nth(1).check();
    await expect(page.getByRole("dialog", { name: "Đáp án đã thay đổi ở nơi khác" })).toBeVisible();
    await shot(page, "exam-conflict-1440");
    await page.setViewportSize({ width: 320, height: 720 });
    await page.getByRole("button", { name: "Dùng bản máy chủ" }).click();
    await expect(page.getByRole("dialog", { name: "Đáp án đã thay đổi ở nơi khác" })).toHaveCount(
      0,
    );
    await expect(page.getByRole("button", { name: "Phiếu câu hỏi" })).toBeVisible();
    await page.getByRole("button", { name: "Phiếu câu hỏi" }).click();
    await expect(page.getByRole("dialog", { name: "Phiếu câu hỏi" })).toBeVisible();
    await shot(page, "exam-sheet-320");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Phiếu câu hỏi" })).toHaveCount(0);
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.getByRole("link", { name: "mở phòng" }).click();
    await expect(page.getByText(/Bài làm không kèm tiêu đề đã khóa/)).toBeVisible();
    await expect(page.getByText("Version 1 prompt")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).not.toContainText(
      "Networking Fundamentals",
    );
    await shot(page, "frozen-attempt-gap-1024");
    await page.setViewportSize({ width: 768, height: 900 });
    await page.getByRole("link", { name: "mở kết quả" }).click();
    await expect(page.getByText("83.33%")).toBeVisible();
    await expect(page.getByText("5/6 điểm")).toBeVisible();
    await shot(page, "result-8333-768");
  });

  test("admin permission boundary and honest metrics", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await login(page, "/admin");
    await expect(page.getByRole("link", { name: "Quản trị", exact: true })).toHaveCount(0);
    await expect(page.getByText("Preset này không có quyền quản trị")).toBeVisible();
    await shot(page, "admin-denied-candidate-1024");
    await scenarios(page).click();
    await page.getByLabel("Quyền mẫu").selectOption("admin");
    await page.getByRole("link", { name: "Đề thi", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Đề thi" })).toBeVisible();
    await shot(page, "admin-exams-1024");
    await page.getByRole("link", { name: "Số liệu", exact: true }).click();
    await expect(page.getByText("HTTP p99: Chưa có dữ liệu")).toBeVisible();
    await expect(page.getByText("Chi phí: Chưa có dữ liệu")).toBeVisible();
    await shot(page, "admin-metrics-missing-1024");
    await page.getByRole("link", { name: "Nhật ký", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Nhật ký" })).toBeVisible();
    await shot(page, "admin-audit-1024");
    await page.getByRole("link", { name: "Ngân hàng câu", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Ngân hàng câu" })).toBeVisible();
    await page.getByLabel("Quyền mẫu").selectOption("reviewer");
    await expect(page.getByRole("link", { name: "Ngân hàng câu", exact: true })).toHaveCount(0);
    await expect(page.getByText("catalog.manage")).toBeVisible();
    await shot(page, "admin-reviewer-denied-questions-1024");
  });
});

test.describe("live", () => {
  test.use({ baseURL: "http://127.0.0.1:4174" });

  test("does not fall back to demo data", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page.getByText("Dữ liệu mẫu")).toHaveCount(0);
    await expect(page.getByText("candidate@example.test")).toHaveCount(0);
    await shot(page, "live-home-1440");
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Không kết nối được phiên" })).toBeVisible();
    await expect(page.getByText("Dữ liệu mẫu")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Về trang chủ" })).toBeVisible();
    await shot(page, "live-session-unavailable-1440");
    await page.goto("/login");
    await page.getByLabel("Email").fill("candidate@example.test");
    await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("fixture-password-ok");
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Bảng làm việc" })).toHaveCount(0);
    await shot(page, "live-login-unavailable-1440");
  });
});
