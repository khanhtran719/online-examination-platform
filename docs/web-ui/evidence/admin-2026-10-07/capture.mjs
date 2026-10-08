import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const require = createRequire(resolve("apps/web/package.json"));
const { chromium, expect } = require("playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const out = resolve("docs/web-ui/evidence/admin-2026-10-07/screenshots");
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const errors = [], external = [], checks = [];
const id = (suffix) => `00000000-0000-4000-8000-${suffix.padStart(12, "0")}`;
const button = (page, name) => page.getByRole("button", { name, exact: true });
async function structure(page) { await button(page, "Các phần & câu hỏi").click(); }
async function dry(page) {
  await button(page, "Kiểm tra dữ liệu").click();
  await expect(page.getByText("Chưa ghi ngân hàng", { exact: true })).toBeVisible();
}
async function filledQuestion(page) {
  await page.getByLabel("Đề bài", { exact: true }).fill("Chọn những phương án giúp bạn chuẩn bị tốt cho kỳ thi.");
  await page.getByLabel("Lựa chọn 1").fill("Đọc kỹ hướng dẫn trước khi bắt đầu.");
  await page.getByLabel("Lựa chọn 2").fill("Bỏ qua thời hạn nộp bài.");
  await button(page, "Thêm lựa chọn").click();
  await page.getByLabel("Lựa chọn 3").fill("Kiểm tra lại các câu được đánh dấu.");
  await page.getByRole("combobox", { name: "Loại", exact: true }).selectOption("MULTIPLE_CHOICE");
  await page.getByRole("checkbox", { name: "Đáp án đúng 3" }).check();
}
const edit = `/admin/exams/${id("102")}/edit`;
const entries = [
  ["overview", "/admin"],
  ["exams", "/admin/exams"],
  ["exam-new", "/admin/exams/new"],
  ["exam-information", edit],
  ["exam-structure", edit, structure],
  ["exam-picker", edit, async (page) => { await structure(page); await button(page, "Chọn câu cho phần 1").click(); await expect(page.getByRole("dialog")).toBeVisible(); }],
  ["exam-check", edit, async (page) => { await button(page, "Kiểm tra & phát hành").click(); }],
  ["exam-publish-confirm", edit, async (page) => { await button(page, "Lưu và phát hành").click(); }],
  ["questions", "/admin/questions"],
  ["question-new", "/admin/questions/new"],
  ["question-edit", `/admin/questions/${id("b01")}/edit`],
  ["question-archive-confirm", `/admin/questions/${id("b01")}/edit`, async (page) => { await button(page, "Lưu trữ").click(); }],
  ["question-multiple", "/admin/questions/new", filledQuestion],
  ["question-type-confirm", "/admin/questions/new", async (page) => { await filledQuestion(page); await page.getByRole("combobox", { name: "Loại", exact: true }).selectOption("TRUE_FALSE"); }],
  ["import", "/admin/imports/new"],
  ["import-dry-run", "/admin/imports/new", dry],
  ["import-invalid", "/admin/imports/new", async (page) => { await page.getByLabel("Nội dung JSON", { exact: true }).fill("{}"); }],
  ["import-confirm", "/admin/imports/new", async (page) => { await dry(page); await button(page, "Nhập câu hỏi").click(); }],
  ["import-report", "/admin/imports/new", async (page) => { await dry(page); await button(page, "Nhập câu hỏi").click(); await button(page, "Nhập vào ngân hàng").click(); await expect(page.getByRole("heading", { name: "Báo cáo nhập", exact: true })).toBeVisible(); }],
  ["monitor-index", "/admin/monitor"],
  ["monitor", `/admin/exams/${id("103")}/monitor`],
  ["monitor-empty", `/admin/exams/${id("102")}/monitor`],
  ["submissions", `/admin/exams/${id("102")}/submissions`],
  ["attempt-completed", `/admin/attempts/${id("401")}`],
  ["attempt-failed", `/admin/attempts/${id("403")}`],
  ["statistics", `/admin/exams/${id("102")}/versions/${id("202")}/statistics`],
  ["statistics-zero", `/admin/exams/${id("103")}/versions/${id("203")}/statistics`],
  ["metrics", "/admin/metrics"],
  ["audit", "/admin/audit"],
  ["audit-detail", "/admin/audit", async (page) => { await button(page, "Chi tiết").first().click(); await expect(page.getByRole("dialog")).toBeVisible(); }],
  ["admin-denied", "/admin", undefined, "candidate"],
];
try {
  for (const [name, route, setup, preset = "admin"] of entries) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push({ name, message: error.message }));
    page.on("request", (request) => {
      if (!request.url().startsWith("http://127.0.0.1:") && !request.url().startsWith("data:")) external.push({ name, url: request.url() });
    });
    await page.goto(`http://127.0.0.1:4173/login?return=${encodeURIComponent(route)}`);
    await page.getByLabel("Email").fill("candidate@example.test");
    await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("fixture-password-ok");
    await button(page, "Đăng nhập").click();
    await page.waitForURL(`**${route}`);
    const scenarios = page.locator("summary").filter({ hasText: "Kịch bản mẫu" });
    await scenarios.click();
    await page.getByLabel("Quyền mẫu").selectOption(preset);
    await scenarios.click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    if (route === edit) await expect(page.getByLabel("Tiêu đề", { exact: true })).toHaveValue("TOEIC — Reading practice");
    if (setup) await setup(page);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(180);
    const record = { name, route: new URL(page.url()).pathname, widths: [], violations: [] };
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 960 });
      await page.mouse.move(0, 0);
      await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))));
      record.widths.push(await page.evaluate(() => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth, fits: document.documentElement.scrollWidth <= innerWidth })));
      if (width === 390 || width === 1440) {
        await page.screenshot({ path: `${out}/${name}-${width}.png`, fullPage: true });
        const axe = await new AxeBuilder({ page }).analyze();
        record.violations.push(...axe.violations.filter((v) => ["serious", "critical"].includes(v.impact)).map((v) => ({ width, id: v.id, targets: v.nodes.map((n) => n.target) })));
      }
    }
    if (["overview", "exam-information", "metrics"].includes(name)) {
      await page.emulateMedia({ reducedMotion: "reduce" });
      record.runningAnimations = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").length);
      await page.evaluate(() => { document.documentElement.style.zoom = "2"; });
      record.cssZoom200 = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, fits: document.documentElement.scrollWidth <= document.documentElement.clientWidth }));
      await page.screenshot({ path: `${out}/${name}-css-zoom-200.png`, fullPage: true });
    }
    checks.push(record);
    console.log(`${name}: ${record.widths.filter((w) => !w.fits).length} overflow, ${record.violations.length} serious/critical axe findings`);
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(resolve(out, "../visual-checks.json"), JSON.stringify({ checks, errors, external, mode: "demo fixtures only; CSS zoom is not browser zoom" }, null, 2) + "\n");
}
if (checks.length !== entries.length || errors.length || external.length || checks.some((c) => c.widths.some((w) => !w.fits) || c.violations.length || c.cssZoom200?.fits === false || (c.runningAnimations ?? 0) > 0)) process.exitCode = 1;
