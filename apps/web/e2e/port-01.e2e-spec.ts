import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "playwright/test";

const evidence = path.resolve(
  process.env.WEB_EVIDENCE_DIR ?? "../../docs/web-ui/evidence/port-01-2026-10-12",
  "pilot",
);
async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("candidate@example.test");
  await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("fixture-password-ok");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Bảng làm việc", exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}
async function capture(page: Page, name: string) {
  await mkdir(evidence, { recursive: true });
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  await writeFile(
    path.join(evidence, `${name}.json`),
    JSON.stringify(
      {
        viewport: page.viewportSize(),
        violations: result.violations,
        url: page.url(),
        fonts: await page.evaluate(() => getComputedStyle(document.body).fontFamily),
        fontLoaded: await page.evaluate(() =>
          document.fonts.check('400 16px "Be Vietnam Pro"', "Bài thi tiếng Việt"),
        ),
        bodyWidth: await page.evaluate(() => document.documentElement.scrollWidth),
        fontResources: await page.evaluate(() =>
          performance
            .getEntriesByType("resource")
            .filter((entry) => /\.woff2?(?:$|\?)/.test(entry.name))
            .map((entry) => entry.name),
        ),
      },
      null,
      2,
    ),
  );
  await page.screenshot({ path: path.join(evidence, `${name}.png`), fullPage: true });
  expect(
    result.violations.map((item) => ({
      id: item.id,
      impact: item.impact,
      targets: item.nodes.map((node) => node.target),
    })),
  ).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test("PORT-01 desktop pilots match shared tokens, keep loaded-only filters and keyboard links", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page);
  const rail = page.getByRole("complementary", { name: "Không gian làm việc" });
  expect((await rail.boundingBox())?.width).toBe(72);
  await expect(
    page
      .getByRole("navigation", { name: "Chính", exact: true })
      .getByRole("link", { name: "Bảng làm việc" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "Vào phòng thi" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Một nhịp làm bài rõ ràng" })).toBeVisible();
  const colors = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return [
      style.getPropertyValue("--color-primary").trim(),
      style.getPropertyValue("--color-canvas").trim(),
    ];
  });
  expect(colors).toEqual(["#315cf4", "#f3f6fc"]);
  await capture(page, "dashboard-1440");
  await page.setViewportSize({ width: 1280, height: 1000 });
  await capture(page, "dashboard-1280");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator("summary").filter({ hasText: "Kịch bản mẫu" }).click();
  await page.getByLabel("Quyền mẫu").selectOption("admin");
  await page.locator("summary").filter({ hasText: "Kịch bản mẫu" }).click();
  await page
    .getByRole("navigation", { name: "Chính", exact: true })
    .getByRole("link", { name: "Quản trị", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Quản trị", exact: true })
    .getByRole("link", { name: "Đề thi", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Đề thi", exact: true })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Lịch thi" })).toBeVisible();
  await expect(page.getByText("Đã tải 3 đề", { exact: true })).toBeVisible();
  await capture(page, "admin-exams-1440");
  await page.setViewportSize({ width: 1280, height: 1000 });
  await capture(page, "admin-exams-1280");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByLabel("Tìm trong các đề đã tải").fill("absent-fixture");
  await expect(page.getByText("Không khớp trong phần đã tải")).toBeVisible();
  await expect(page.getByText("Đã tải 3 đề", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Xóa bộ lọc" }).click();
  await expect(page.getByRole("region", { name: "Danh sách đề thi quản trị" })).toBeVisible();
  await page.getByRole("combobox", { name: "Trạng thái", exact: true }).selectOption("draft");
  await expect(page.getByText(/Hiển thị 0 trong phần đã tải/)).toBeVisible();
  await page.getByRole("combobox", { name: "Trạng thái", exact: true }).selectOption("all");
  await page.getByLabel("Tìm trong các đề đã tải").focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("combobox", { name: "Trạng thái", exact: true })).toBeFocused();
  await page.getByRole("link", { name: "Tạo bản nháp", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Tạo bản nháp", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("PORT-01 pilots preserve body width and accessible navigation on narrow screens", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await login(page);
  await expect(page.getByRole("link", { name: "Vào phòng thi" })).toBeVisible();
  await capture(page, "dashboard-320");
  await page.locator("summary").filter({ hasText: "Kịch bản mẫu" }).click();
  await page.getByLabel("Quyền mẫu").selectOption("admin");
  await page.locator("summary").filter({ hasText: "Kịch bản mẫu" }).click();
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Chính", exact: true })
    .getByRole("link", { name: "Quản trị", exact: true })
    .click();
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Quản trị", exact: true })
    .getByRole("link", { name: "Đề thi", exact: true })
    .click();
  const table = page.getByRole("region", { name: "Danh sách đề thi quản trị" });
  await expect(table).toBeVisible();
  await expect(page.getByText("Đã tải 3 đề", { exact: true })).toBeVisible();
  await capture(page, "admin-exams-320");
  await table.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => table.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
});
