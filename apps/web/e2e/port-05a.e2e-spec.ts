import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "playwright/test";

const evidence = path.resolve(
  process.env.WEB_EVIDENCE_DIR ?? "../../docs/web-ui/evidence/port-05a-2026-10-12",
  "catalog-start",
);
const exam = "00000000-0000-4000-8000-000000000102";
async function candidate(page: Page, route = "/exams") {
  await page.goto(`/login?return=${encodeURIComponent(route)}`);
  await page.getByLabel("Email").fill("candidate@example.test");
  await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("fixture-password-ok");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.waitForURL(`**${route}`);
  await page.evaluate(() => document.fonts.ready);
}
async function navigate(page: Page, route: string) {
  await page.evaluate((to) => {
    history.pushState(null, "", to);
    dispatchEvent(new PopStateEvent("popstate"));
  }, route);
}
async function fault(page: Page, value: string) {
  const menu = page.locator("summary").filter({ hasText: "Kịch bản mẫu" });
  await menu.click();
  await page.getByLabel("Lỗi lưu tiếp theo").selectOption(value);
  await menu.click();
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
    contentLeft: document.querySelector("main > div")!.getBoundingClientRect().left,
    contentRight: document.querySelector("main > div")!.getBoundingClientRect().right,
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
  expect(
    scan.violations.map((violation) => ({
      id: violation.id,
      targets: violation.nodes.map((node) => node.target),
    })),
  ).toEqual([]);
  expect(state.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(state.fontLoaded).toBe(true);
  expect(state.contentLeft).toBeGreaterThanOrEqual(16);
  expect(state.contentRight).toBeLessThanOrEqual(page.viewportSize()!.width - 16);
}
test("PORT-05A catalog, detail and start confirmation fit four Web/tablet widths", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await candidate(page);
  for (const width of [1440, 1280, 1024, 768]) {
    await page.setViewportSize({ width, height: 1000 });
    await navigate(page, "/exams");
    await expect(
      page.getByRole("link", {
        name: "Xem đề IT Certification — Networking Fundamentals",
        exact: true,
      }),
    ).toBeVisible();
    await capture(page, `browse-${width}`);
    await navigate(page, `/exams/${exam}`);
    await page.waitForURL(`**/exams/${exam}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("TOEIC — Reading practice");
    await expect(page.getByRole("heading", { name: "Cấu trúc từng phần thi" })).toBeVisible();
    await capture(page, `detail-${width}`);
    const trigger = page.getByRole("button", { name: "Bắt đầu", exact: true });
    await trigger.click();
    await expect(page.getByRole("dialog", { name: "Xác nhận bắt đầu" })).toContainText(
      "Phiên bản đang xem",
    );
    await capture(page, `confirmation-${width}`);
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});
test("PORT-05A loaded-only search, empty filter and URL Back retain truthful counts", async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1000 });
  await candidate(page);
  await page.getByLabel("Tìm trong các đề đã tải").fill("no-match-fixture");
  await expect(page.getByRole("heading", { name: "Không khớp trong các đề đã tải" })).toBeVisible();
  await capture(page, "loaded-search-empty-768");
  await page.getByRole("button", { name: "Xóa từ khóa", exact: true }).click();
  const emptyCategory = page.getByRole("button", { name: "IELTS", exact: true });
  await emptyCategory.focus();
  await page.keyboard.press("Enter");
  await expect(emptyCategory).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/category=IELTS/);
  await expect(page.getByRole("heading", { name: "Không có đề trong bộ lọc này" })).toBeVisible();
  await capture(page, "category-empty-768");
  await page.goBack();
  await expect(page.getByRole("button", { name: "Tất cả", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await navigate(page, "/exams?category=invalid&keep=1");
  await expect(page.getByText("Bộ lọc không hợp lệ", { exact: true })).toBeVisible();
  await capture(page, "category-invalid-768");
  await page.getByRole("button", { name: "Xóa bộ lọc", exact: true }).click();
  await expect(page).toHaveURL(/keep=1/);
  await expect(page).not.toHaveURL(/category=/);
});
test("PORT-05A lost start ACK retries the same attempt; delayed start cannot be cancelled", async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1000 });
  await candidate(page, `/exams/${exam}`);
  await fault(page, "lose-ack");
  await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Bắt đầu", exact: true }).click();
  await expect(page.getByText("Chưa nhận được xác nhận", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "Chưa bắt đầu" }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  await capture(page, "start-unknown-768");
  await page.getByRole("button", { name: "Thử lại cùng yêu cầu" }).click();
  await expect(page.getByRole("button", { name: "Câu sau", exact: true })).toBeEnabled();
  const acceptedUrl = page.url();
  await navigate(page, `/exams/${exam}`);
  await expect(page.getByRole("heading", { name: "Cấu trúc từng phần thi" })).toBeVisible();
  await fault(page, "delay-ack");
  await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Bắt đầu", exact: true }).click();
  await expect(page.getByRole("button", { name: "Đang bắt đầu…" })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  await capture(page, "start-pending-768");
  await expect(page).toHaveURL(acceptedUrl);
  await expect(page.getByRole("button", { name: "Câu sau", exact: true })).toBeEnabled();
});
