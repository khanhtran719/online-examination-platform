import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const require = createRequire(resolve("apps/web/package.json"));
const { chromium, expect } = require("playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const out = resolve("docs/web-ui/evidence/assessment-results-2026-10-07/screenshots");
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const errors = [],
  external = [],
  checks = [];
const id = (suffix) => `00000000-0000-4000-8000-000000000${suffix}`;
async function start(page) {
  await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Bắt đầu", exact: true }).click();
  await expect(page.getByRole("radio").first()).toBeVisible();
}
const entries = [
  ["room", `/exams/${id("102")}`, start],
  [
    "room-selected",
    `/exams/${id("102")}`,
    async (page) => {
      await start(page);
      await page.getByRole("radio").first().check();
      await page.getByRole("checkbox", { name: "Đánh dấu để xem lại" }).check();
      await expect(page.getByRole("status").filter({ hasText: "Đã lưu lúc" })).toBeVisible();
    },
  ],
  [
    "room-multiple",
    `/exams/${id("102")}`,
    async (page) => {
      await start(page);
      await page.getByRole("button", { name: "Câu sau", exact: true }).click();
      await page.getByRole("button", { name: "Câu sau", exact: true }).click();
      await page.getByRole("checkbox", { name: "meeting", exact: true }).check();
      await page.getByRole("checkbox", { name: "report", exact: true }).check();
      await expect(page.getByRole("status").filter({ hasText: "Đã lưu lúc" })).toBeVisible();
    },
  ],
  [
    "room-true-false",
    `/exams/${id("102")}`,
    async (page) => {
      await start(page);
      await page.getByRole("button", { name: "Câu sau", exact: true }).click();
    },
  ],
  [
    "room-paged",
    "/dashboard",
    async (page) => {
      const scenarios = page.locator("summary").filter({ hasText: "Kịch bản mẫu" });
      await scenarios.click();
      await page.getByRole("button", { name: "Tạo đề 120 câu" }).click();
      await page.locator('details a[href^="/exams/"]').click();
      await scenarios.click();
      await start(page);
    },
  ],
  [
    "room-long",
    `/attempts/${id("402")}`,
    async (page) => {
      await expect(page.getByText("Version 1 prompt", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Nộp bài", exact: true }).click();
      await page.getByRole("button", { name: "Nộp các đáp án đã lưu" }).click();
      await expect(page.getByRole("link", { name: "Xem kết quả", exact: true })).toBeVisible();
      await page.getByRole("link", { name: "Đề thi", exact: true }).click();
      await page.getByRole("link", { name: /Networking Fundamentals/ }).click();
      await start(page);
      for (let index = 0; index < 4; index++)
        await page.getByRole("button", { name: "Câu sau", exact: true }).click();
      await expect(
        page.getByRole("heading", { name: /^A very long bilingual prompt/ }),
      ).toBeVisible();
    },
  ],
  ["room-frozen", `/attempts/${id("402")}`],
  [
    "room-conflict",
    `/attempts/${id("402")}`,
    async (page) => {
      const scenarios = page.locator("summary").filter({ hasText: "Kịch bản mẫu" });
      await expect(page.getByText("Version 1 prompt", { exact: true })).toBeVisible();
      await scenarios.click();
      await page.getByLabel("Lỗi lưu tiếp theo").selectOption("conflict-save");
      await scenarios.click();
      await page.getByRole("radio").first().check();
      await expect(
        page.getByRole("dialog", { name: "Đáp án đã thay đổi ở nơi khác" }),
      ).toBeVisible();
    },
  ],
  ["status-active", `/attempts/${id("402")}/status`],
  ["status-failed", `/attempts/${id("403")}/status`],
  ["status-completed", `/attempts/${id("401")}/status`],
  ["result", `/attempts/${id("401")}/result`],
  ["review", `/attempts/${id("401")}/review`],
  ["review-locked", `/attempts/${id("403")}/review`],
  ["history", "/history"],
  ["leaderboard", `/exams/${id("102")}/versions/${id("202")}/leaderboard`],
  ["leaderboard-denied", `/exams/${id("103")}/versions/${id("203")}/leaderboard`],
];
try {
  for (const [name, route, setup] of entries) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push({ name, message: error.message }));
    page.on("request", (request) => {
      if (!request.url().startsWith("http://127.0.0.1:") && !request.url().startsWith("data:"))
        external.push({ name, url: request.url() });
    });
    await page.goto(`http://127.0.0.1:4173/login?return=${encodeURIComponent(route)}`);
    await page.getByLabel("Email", { exact: true }).fill("candidate@example.test");
    await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("fixture-password-ok");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await page.waitForURL(`**${route}`);
    await page.waitForFunction(() => {
      const title = document.querySelector("h1")?.textContent;
      return !!title && title !== "Đăng nhập";
    });
    if (setup) await setup(page);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);
    const record = { name, route, widths: [], violations: [] };
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 960 });
      await page.mouse.move(0, 0);
      await page.evaluate(() =>
        Promise.all(
          document.getAnimations().map((animation) => animation.finished.catch(() => undefined)),
        ),
      );
      record.widths.push(
        await page.evaluate(() => ({
          width: innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          fits: document.documentElement.scrollWidth <= innerWidth,
        })),
      );
      if (width === 390 || width === 1440) {
        await page.screenshot({ path: `${out}/${name}-${width}.png`, fullPage: true });
        const axe = await new AxeBuilder({ page }).analyze();
        record.violations.push(
          ...axe.violations
            .filter((v) => ["serious", "critical"].includes(v.impact))
            .map((v) => ({ width, id: v.id, targets: v.nodes.map((n) => n.target) })),
        );
      }
    }
    if (name === "room") {
      await page.emulateMedia({ reducedMotion: "reduce" });
      record.runningAnimations = await page.evaluate(
        () =>
          document.getAnimations().filter((animation) => animation.playState === "running").length,
      );
      await page.setViewportSize({ width: 1440, height: 960 });
      await page.evaluate(() => {
        document.documentElement.style.zoom = "2";
      });
      record.zoom = await page.evaluate(() => ({
        width: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        fits: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      }));
      await page.screenshot({ path: `${out}/room-zoom-200.png`, fullPage: true });
    }
    checks.push(record);
    console.log(
      `${name}: ${record.widths.filter((w) => !w.fits).length} overflow, ${record.violations.length} serious/critical axe findings`,
    );
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(
    resolve(out, "../visual-checks.json"),
    JSON.stringify(
      { checks, errors, external, mode: "demo only; synthetic fixtures; no live credentials" },
      null,
      2,
    ) + "\n",
  );
}
if (
  checks.length !== entries.length ||
  errors.length ||
  external.length ||
  checks.some(
    (check) =>
      check.widths.some((w) => !w.fits) ||
      check.violations.length ||
      check.zoom?.fits === false ||
      (check.runningAnimations ?? 0) > 0,
  )
)
  process.exitCode = 1;
