import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const require = createRequire(resolve("apps/web/package.json"));
const { chromium } = require("playwright");
const AxeBuilder = require("@axe-core/playwright").default;
const out = resolve("docs/web-ui/evidence/foundation-2026-10-07/screenshots");
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const page = await context.newPage();
const errors = [],
  external = [],
  checks = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("request", (req) => {
  if (!req.url().startsWith("http://127.0.0.1:") && !req.url().startsWith("data:"))
    external.push(req.url());
});
const id = (suffix) => `00000000-0000-4000-8000-000000000${suffix}`;
const entries = [
  ["home", "/"],
  ["login", "/login"],
  ["register", "/register"],
  ["controls", "/dev/ui"],
  ["how", "/how-it-works"],
  ["help", "/help"],
  ["dashboard", "/dashboard", "candidate"],
  ["catalog", "/exams", "candidate"],
  ["profile", "/profile", "candidate"],
  ["result", `/attempts/${id("401")}/result`, "candidate"],
  ["room", `/attempts/${id("402")}`, "candidate"],
  ["admin-exams", "/admin/exams", "admin"],
  ["admin-editor", `/admin/exams/${id("102")}/edit`, "admin"],
  ["admin-question", "/admin/questions/new", "admin"],
  ["admin-import", "/admin/imports/new", "admin"],
  ["admin-audit", "/admin/audit", "admin"],
];
for (const [name, route, role] of entries) {
  await page.setViewportSize({ width: 1440, height: 960 });
  if (role) {
    await page.goto(`http://127.0.0.1:4173/login?return=${encodeURIComponent(route)}`);
    await page.getByLabel("Email", { exact: true }).fill("candidate@example.test");
    await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("fixture-password-ok");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await page.waitForURL(`**${route}`);
    if (role === "admin") {
      const scenarios = page.locator("summary").filter({ hasText: "Kịch bản mẫu" });
      await scenarios.click();
      await page.getByLabel("Quyền mẫu").selectOption("admin");
      await scenarios.click();
    }
  } else await page.goto(`http://127.0.0.1:4173${route}`);
  await page.waitForFunction((protectedRoute) => {
    const title = document.querySelector("h1")?.textContent;
    return !!title && (!protectedRoute || title !== "Đăng nhập");
  }, !!role);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  const record = { name, route, widths: [], violations: [] };
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 960 });
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
          .map((v) => ({
            width,
            id: v.id,
            impact: v.impact,
            targets: v.nodes.map((n) => n.target),
          })),
      );
    }
  }
  if (role && name !== "room") {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    await page.screenshot({ path: `${out}/${name}-menu-390.png`, fullPage: true });
    record.menuFits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
    const axe = await new AxeBuilder({ page }).analyze();
    record.menuViolations = axe.violations
      .filter((v) => ["serious", "critical"].includes(v.impact))
      .map((v) => v.id);
    await page.keyboard.press("Escape");
  }
  checks.push(record);
  console.log(
    `${name}: ${record.widths.filter((w) => !w.fits).length} overflow, ${record.violations.length} axe findings`,
  );
}
await page.emulateMedia({ reducedMotion: "reduce" });
await page.goto("http://127.0.0.1:4173/");
await page.getByRole("link", { name: "ExamPlatform — trang chủ", exact: true }).hover();
const reducedMotion = await page
  .locator('a[aria-label="ExamPlatform — trang chủ"] > span')
  .first()
  .evaluate((node) => ({
    transition: getComputedStyle(node).transitionDuration,
    animation: getComputedStyle(node).animationName,
  }));
await page.setViewportSize({ width: 1440, height: 960 });
await page.goto("http://127.0.0.1:4173/dev/ui");
await page.evaluate(() => {
  document.documentElement.style.zoom = "2";
});
const zoom = await page.evaluate(() => ({
  layoutWidth: document.documentElement.clientWidth,
  documentWidth: document.documentElement.scrollWidth,
  fits: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
}));
await page.screenshot({ path: `${out}/controls-zoom-200.png`, fullPage: true });
await page.evaluate(() => {
  document.documentElement.style.zoom = "";
});
await page.goto("http://127.0.0.1:4174/login");
await page.getByRole("heading", { name: "Đăng nhập", exact: true }).waitFor();
await page.screenshot({ path: `${out}/live-login-1440.png`, fullPage: true });
await browser.close();
await writeFile(
  resolve(out, "../visual-checks.json"),
  JSON.stringify(
    {
      checks,
      reducedMotion,
      zoom,
      errors,
      external,
      modes: "demo routes and live login only; synthetic data",
    },
    null,
    2,
  ) + "\n",
);
