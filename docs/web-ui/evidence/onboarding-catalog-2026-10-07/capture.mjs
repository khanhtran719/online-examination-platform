import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const require = createRequire(resolve("apps/web/package.json"));
const { chromium, expect } = require("playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const out = resolve("docs/web-ui/evidence/onboarding-catalog-2026-10-07/screenshots");
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const errors = [],
  external = [],
  checks = [];
const id = (suffix) => `00000000-0000-4000-8000-000000000${suffix}`;
const entries = [
  ["login", "/login"],
  ["register", "/register"],
  ["check-email", "/check-email"],
  ["verify", `/verify-email#token=${"A".repeat(43)}`],
  ["verify-missing", "/verify-email"],
  ["verify-invalid", "/verify-email#token=bad"],
  ["dashboard", "/dashboard", true],
  ["catalog", "/exams", true],
  ["catalog-empty", "/exams?category=IELTS", true],
  ["catalog-invalid", "/exams?category=unknown", true],
  ["detail", `/exams/${id("101")}`, true],
  ["detail-long", `/exams/${id("103")}`, true],
  ["start-dialog", `/exams/${id("103")}`, true, true],
];
for (const [name, route, protectedRoute, dialog] of entries) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push({ name, message: error.message }));
  page.on("request", (request) => {
    if (!request.url().startsWith("http://127.0.0.1:") && !request.url().startsWith("data:"))
      external.push({ name, url: request.url() });
  });
  if (protectedRoute) {
    await page.goto(`http://127.0.0.1:4173/login?return=${encodeURIComponent(route)}`);
    await page.getByLabel("Email", { exact: true }).fill("candidate@example.test");
    await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("fixture-password-ok");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await page.waitForURL(`**${route}`);
  } else await page.goto(`http://127.0.0.1:4173${route}`);
  await page.waitForFunction((privateRoute) => {
    const title = document.querySelector("h1")?.textContent;
    return !!title && (!privateRoute || title !== "Đăng nhập");
  }, !!protectedRoute);
  if (name.startsWith("catalog"))
    await expect(
      page.getByText("Đã hết danh sách trong bộ lọc này.", { exact: true }),
    ).toBeVisible();
  if (name === "dashboard")
    await expect(page.getByRole("heading", { name: "Lượt gần đây", exact: true })).toBeVisible();
  if (dialog) await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(950);
  const record = { name, route: route.split("#")[0], widths: [], violations: [] };
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 960 });
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
  if (name === "login") {
    await page.emulateMedia({ reducedMotion: "reduce" });
    record.reducedMotion = await page.locator('[class*="paper_"]').evaluate((node) => ({
      animation: getComputedStyle(node).animationName,
      transform: getComputedStyle(node).transform,
    }));
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.evaluate(() => {
      document.documentElement.style.zoom = "2";
    });
    record.zoom = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      fits: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    }));
    await page.screenshot({ path: `${out}/login-zoom-200.png`, fullPage: true });
  }
  checks.push(record);
  console.log(
    `${name}: ${record.widths.filter((w) => !w.fits).length} overflow, ${record.violations.length} serious/critical axe findings`,
  );
  await context.close();
}
await browser.close();
await writeFile(
  resolve(out, "../visual-checks.json"),
  JSON.stringify(
    {
      checks,
      errors,
      external,
      mode: "demo only; synthetic fixtures; screenshots contain no live credentials",
    },
    null,
    2,
  ) + "\n",
);
if (
  errors.length ||
  external.length ||
  checks.some(
    (check) =>
      check.widths.some((w) => !w.fits) || check.violations.length || check.zoom?.fits === false,
  )
)
  process.exitCode = 1;
