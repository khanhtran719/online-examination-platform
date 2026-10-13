import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "playwright/test";

test.use({ trace: "off", screenshot: "off", video: "off" });
const output = path.resolve(
  process.env.WEB_EVIDENCE_DIR ?? "../../.local/web-evidence/port-06b",
  "admin-typography",
);

async function admin(page: Page, route: string) {
  await page.goto(`/login?return=${encodeURIComponent(route)}`);
  await page.getByLabel("Email", { exact: true }).fill("candidate@example.test");
  await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("fixture-password-ok");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.waitForURL(`**${route}`);
  const scenario = page.locator("summary").filter({ hasText: "Kịch bản mẫu" });
  await scenario.click();
  await page.getByLabel("Quyền mẫu").selectOption("admin");
  await scenario.click();
}

async function matrix(page: Page, name: string, screenshot = false) {
  for (const width of [768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    if (!(await page.getByRole("dialog").count()))
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.evaluate(() => document.fonts.ready);
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    const state = await page.evaluate(() => {
      const elements = new Set<HTMLElement>();
      for (const root of document.querySelectorAll("main, [role='dialog']")) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const parent = n.parentElement;
          if (
            parent &&
            /[\p{L}\p{N}]/u.test(n.textContent ?? "") &&
            !parent.closest('option,script,style,[aria-hidden="true"]') &&
            parent.checkVisibility() &&
            parent.getBoundingClientRect().height > 0
          )
            elements.add(parent);
        }
      }
      const small = [...elements]
        .filter((n) => parseFloat(getComputedStyle(n).fontSize) < 14)
        .map((n) => ({
          text: n.textContent?.trim().slice(0, 90),
          px: getComputedStyle(n).fontSize,
          tag: n.tagName,
        }));
      const heading = document.querySelector("main h1");
      const dialog = document.querySelector('[role="dialog"]')?.getBoundingClientRect();
      return {
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        small,
        primarySizes: Array.from(
          document.querySelectorAll('main [aria-label="Ngân hàng câu hỏi"] tbody th a'),
        ).map((n) => parseFloat(getComputedStyle(n).fontSize)),
        fontLoaded: document.fonts.check('400 16px "Be Vietnam Pro"', "Câu hỏi tiếng Việt"),
        h1: heading ? parseFloat(getComputedStyle(heading).fontSize) : null,
        dialog: dialog
          ? { x: dialog.x, y: dialog.y, width: dialog.width, height: dialog.height }
          : null,
      };
    });
    await mkdir(output, { recursive: true });
    await writeFile(
      path.join(output, `${name}-${width}.json`),
      JSON.stringify(
        {
          ...state,
          violations: scan.violations.map((v) => ({
            id: v.id,
            targets: v.nodes.map((n) => n.target),
          })),
        },
        null,
        2,
      ),
    );
    if (screenshot && [768, 1280].includes(width))
      await page.screenshot({
        path: path.join(output, `${name}-${width}.png`),
        fullPage: !state.dialog,
      });
    expect.soft(state.small, `${name}-${width}: helper minimum 14px`).toEqual([]);
    if (name === "question-bank") {
      expect(state.primarySizes.length).toBeGreaterThan(0);
      expect
        .soft(
          state.primarySizes.every((size) => size === 16),
          `${name}-${width}: primary text 16px`,
        )
        .toBe(true);
    }
    expect.soft(state.h1, `${name}-${width}: page title hierarchy`).toBeLessThanOrEqual(32);
    expect(scan.violations.map((v) => v.id)).toEqual([]);
    expect(state.fontLoaded).toBe(true);
    expect(state.scrollWidth).toBeLessThanOrEqual(width);
    if (state.dialog) {
      expect(state.dialog.x).toBeGreaterThanOrEqual(16);
      expect(state.dialog.y).toBeGreaterThanOrEqual(16);
      expect(state.dialog.x + state.dialog.width).toBeLessThanOrEqual(width - 16);
    }
  }
}

test("PORT-06B exam validation, section totals, preflight and dialogs use legible helper text", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await admin(page, "/admin/exams/new");
  await expect(page.locator("main small").first()).toBeVisible();
  await matrix(page, "exam-validation");
  await page
    .getByLabel("Tiêu đề", { exact: true })
    .fill(
      "Nền tảng điện toán đám mây — Bài ôn tập về quyền truy cập và các tình huống triển khai dành cho quản trị viên",
    );
  await page.getByLabel("Thời lượng (phút)", { exact: true }).fill("90");
  await page.getByLabel("Mở", { exact: true }).fill("2026-11-15T08:00");
  await page.getByLabel("Đóng", { exact: true }).fill("2026-11-15T12:00");
  await page.getByLabel("Giới hạn lượt", { exact: true }).fill("3");
  await matrix(page, "exam-information");
  await page.getByRole("button", { name: "Các phần & câu hỏi", exact: true }).click();
  await matrix(page, "exam-structure-empty");
  await page
    .getByLabel("Tên phần", { exact: true })
    .fill("Quyền truy cập, bảo mật và tình huống triển khai trong môi trường doanh nghiệp");
  await page.getByRole("button", { name: "Chọn câu cho phần 1", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "Chọn câu từ ngân hàng" });
  await expect(picker.getByRole("button", { name: /^Thêm:/ }).first()).toBeVisible();
  await matrix(page, "exam-picker");
  await picker
    .getByRole("button", { name: /^Thêm:/ })
    .first()
    .click();
  await picker
    .getByRole("button", { name: /^Thêm:/ })
    .first()
    .click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Thêm phần", exact: true }).click();
  await page.getByLabel("Tên phần", { exact: true }).nth(1).fill("Kiến thức nền");
  await page.getByRole("button", { name: "Chọn câu cho phần 2", exact: true }).click();
  await picker
    .getByRole("button", { name: /^Thêm:/ })
    .first()
    .click();
  await page.keyboard.press("Escape");
  await page
    .getByRole("group", { name: "Phần 2", exact: true })
    .getByLabel("Điểm câu 1", { exact: true })
    .fill("1");
  await matrix(page, "exam-structure");
  await page.getByRole("button", { name: "Bỏ phần 1", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("1 phần · 1 câu · 1 điểm");
  await matrix(page, "exam-remove-dialog");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Bỏ phần 1", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Kiểm tra & phát hành", exact: true }).click();
  await expect(page.getByText("5/5 mục đạt", { exact: true })).toBeVisible();
  await matrix(page, "exam-preflight", true);
  await page.getByRole("button", { name: "Lưu và phát hành", exact: true }).click();
  await matrix(page, "exam-publish-dialog");
  await page.keyboard.press("Escape");
  expect(errors).toEqual([]);
});

test("PORT-06B bank captions, exam list and question validation/preview fit Web/tablet", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await admin(page, "/admin/questions");
  await expect(
    page.getByRole("region", { name: "Ngân hàng câu hỏi" }).getByRole("link").first(),
  ).toBeVisible();
  await expect(page.getByText("Đã hết danh sách đã tải.", { exact: true })).toBeVisible();
  await matrix(page, "question-bank", true);
  await page.getByLabel("Tìm trong phần đã tải", { exact: true }).fill("no-matching-question");
  await expect(page.getByRole("heading", { name: "Không khớp bộ lọc" })).toBeVisible();
  await matrix(page, "question-bank-empty");
  await page
    .getByRole("navigation", { name: "Quản trị", exact: true })
    .getByRole("link", { name: "Đề thi", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Đề thi", exact: true })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Danh sách đề thi quản trị" }).getByRole("row").nth(1),
  ).toBeVisible();
  await matrix(page, "exam-list");
  await page
    .getByRole("navigation", { name: "Quản trị", exact: true })
    .getByRole("link", { name: "Ngân hàng câu", exact: true })
    .click();
  await page.getByRole("link", { name: "+ Tạo câu", exact: true }).click();
  await page.getByRole("button", { name: "Lưu câu", exact: true }).click();
  await expect(page.getByText("Kiểm tra lại câu hỏi", { exact: true })).toBeVisible();
  await matrix(page, "question-validation");
  await page
    .getByLabel("Đề bài", { exact: true })
    .fill(
      "Biện pháp nào giúp bảo vệ tài khoản quản trị trong môi trường doanh nghiệp có nhiều nhóm cùng tham gia vận hành hệ thống?",
    );
  await page
    .getByLabel("Lựa chọn 1", { exact: true })
    .fill(
      "Chỉ cấp quyền tối thiểu cần thiết và kiểm tra định kỳ các quyền truy cập được phân công.",
    );
  await page
    .getByLabel("Lựa chọn 2", { exact: true })
    .fill("Dùng chung tài khoản quản trị cho tất cả thành viên để tránh phải quản lý quyền riêng.");
  await page.getByLabel("Giải thích", { exact: true }).fill("PRIVATE_EXPLANATION_SENTINEL");
  await matrix(page, "question-long-content");
  await page.getByRole("button", { name: "Xem như thí sinh", exact: true }).click();
  const preview = page.getByRole("dialog", { name: "Xem câu hỏi như thí sinh" });
  await expect(preview).not.toContainText("PRIVATE_EXPLANATION_SENTINEL");
  await matrix(page, "question-preview", true);
  await page.keyboard.press("Escape");
});

test("PORT-06B import validation, confirmation and committed report retain readable typography", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await admin(page, "/admin/imports/new");
  await page.getByLabel("Nội dung JSON", { exact: true }).fill("{}");
  await expect(page.getByText("JSON chưa hợp lệ", { exact: true })).toBeVisible();
  await matrix(page, "import-invalid");
  const sample = await readFile(
    path.resolve(
      "../../docs/web-ui/templates/codex-desktop-v1/groups/questions-import/sample-import.json",
    ),
    "utf8",
  );
  await page.getByLabel("Nội dung JSON", { exact: true }).fill(sample);
  await matrix(page, "import-input");
  await page.getByRole("button", { name: "Kiểm tra dữ liệu", exact: true }).click();
  await expect(page.getByText("Chưa ghi ngân hàng", { exact: true })).toBeVisible();
  await matrix(page, "import-validated");
  await page.getByRole("button", { name: "Nhập câu hỏi", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await matrix(page, "import-confirm-dialog");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Nhập vào ngân hàng", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Báo cáo nhập", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Các câu đã nhập" }).getByRole("row")).toHaveCount(
    4,
  );
  await matrix(page, "import-report", true);
});
