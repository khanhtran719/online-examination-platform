import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "playwright/test";

const evidence = path.resolve(
  process.env.WEB_EVIDENCE_DIR ?? "../../docs/web-ui/evidence/port-05b-2026-10-13",
  "history-leaderboard",
);
const exam = "00000000-0000-4000-8000-000000000102";
const version = "00000000-0000-4000-8000-000000000202";
async function candidate(page: Page, route = `/exams/${exam}`) {
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
  await page.waitForURL(`**${route}`);
}
async function capture(page: Page, name: string) {
  await mkdir(evidence, { recursive: true });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
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
  await page.screenshot({ path: path.join(evidence, `${name}.png`), fullPage: true });
  expect(scan.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }))).toEqual(
    [],
  );
  expect(state.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(state.fontLoaded).toBe(true);
  expect(state.contentLeft).toBeGreaterThanOrEqual(16);
  expect(state.contentRight).toBeLessThanOrEqual(page.viewportSize()!.width - 16);
}
test("PORT-05B History and version board fit Web/tablet with truthful metadata and scores", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await candidate(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("TOEIC — Reading practice");
  await navigate(page, "/exams/00000000-0000-4000-8000-000000000101");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "IT Certification — Networking Fundamentals",
  );
  for (const width of [1440, 1280, 1024, 768]) {
    await page.setViewportSize({ width, height: 1000 });
    await navigate(page, "/history");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lịch sử thi");
    const history = page.getByRole("region", { name: "Lịch sử các lượt thi" });
    await expect(history).toContainText("TOEIC — Reading practice");
    await expect(history).toContainText("Phiên bản …000211");
    await expect(history.getByText("Chưa có điểm", { exact: true })).toHaveCount(2);
    await expect(history.getByRole("link", { name: "Tiếp tục", exact: true })).toHaveAttribute(
      "href",
      "/attempts/00000000-0000-4000-8000-000000000402",
    );
    await expect(
      history.getByRole("link", { name: "Xem trạng thái", exact: true }),
    ).toHaveAttribute("href", "/attempts/00000000-0000-4000-8000-000000000403/status");
    await expect(
      page.getByText("Đã tải 3 lượt thi · Đã hết danh sách", { exact: true }),
    ).toBeVisible();
    await capture(page, `history-${width}`);
    if (width === 768) {
      await history.focus();
      await page.keyboard.press("ArrowRight");
      await expect.poll(() => history.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
      const refresh = page.getByRole("button", { name: "Làm mới", exact: true });
      await refresh.focus();
      await page.keyboard.press("Enter");
      await expect(refresh).toBeFocused();
    }
    await navigate(page, `/exams/${exam}/versions/${version}/leaderboard`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bảng xếp hạng");
    const board = page.getByRole("region", { name: "Xếp hạng bằng bí danh" });
    await expect(board).toContainText("candidate-8b473ec4");
    await expect(board).not.toContainText("Lan Nguyễn");
    await expect(board).not.toContainText("candidate@example.test");
    await expect(page.getByText(/Xem trang không đồng nghĩa/)).toBeVisible();
    await capture(page, `leaderboard-${width}`);
  }
  expect(errors).toEqual([]);
});
test("PORT-05B fallback and closed boards do not invent titles or unlock on refresh", async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1000 });
  await candidate(page, "/history");
  await expect(page.getByRole("region", { name: "Lịch sử các lượt thi" })).not.toContainText(
    "TOEIC — Reading practice",
  );
  await capture(page, "history-fallback-768");
  await navigate(page, `/exams/${exam}/versions/${version}/leaderboard`);
  await expect(page.getByRole("region", { name: "Xếp hạng bằng bí danh" })).toBeVisible();
  await capture(page, "leaderboard-fallback-768");
  await page.getByRole("link", { name: "Quản lý tham gia →", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "Tham gia bảng xếp hạng", exact: true }),
  ).not.toBeChecked();
  await navigate(page, `/exams/${exam}/versions/00000000-0000-4000-8000-000000000999/leaderboard`);
  await expect(page.getByRole("heading", { name: "Bảng xếp hạng không mở" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Làm mới", exact: true })).toBeDisabled();
  await expect(page.getByRole("region", { name: "Xếp hạng bằng bí danh" })).toHaveCount(0);
  await capture(page, "leaderboard-closed-768");
});
