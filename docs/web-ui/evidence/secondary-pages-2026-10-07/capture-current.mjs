import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const require = createRequire(resolve("apps/web/package.json"));
const { chromium } = require("playwright");
const out = resolve("docs/web-ui/evidence/secondary-pages-2026-10-07/current");
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ["--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", error => errors.push(error.message));
const id = n => `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
const entries = [
  ["login", "/login"], ["register", "/register"], ["check-email", "/check-email"],
  ["verify-email", "/verify-email"], ["how", "/how-it-works"], ["help", "/help"], ["not-found", "/missing"],
  ["dashboard", "/dashboard", "candidate"], ["catalog", "/exams", "candidate"],
  ["exam-detail", `/exams/${id(0x102)}`, "candidate"],
  ["exam-room", `/attempts/${id(0x402)}`, "candidate"],
  ["result", `/attempts/${id(0x401)}/result`, "candidate"],
  ["review", `/attempts/${id(0x401)}/review`, "candidate"],
  ["status", `/attempts/${id(0x403)}/status`, "candidate"],
  ["history", "/history", "candidate"], ["profile", "/profile", "candidate"],
  ["leaderboard", `/exams/${id(0x102)}/versions/${id(0x202)}/leaderboard`, "candidate"],
  ["admin-home", "/admin", "admin"], ["admin-exams", "/admin/exams", "admin"],
  ["admin-editor", `/admin/exams/${id(0x102)}/edit`, "admin"],
  ["admin-questions", "/admin/questions", "admin"], ["admin-question-editor", "/admin/questions/new", "admin"],
  ["admin-import", "/admin/imports/new", "admin"], ["admin-monitor", "/admin/monitor", "admin"],
  ["admin-submissions", `/admin/exams/${id(0x102)}/submissions`, "admin"],
  ["admin-attempt", `/admin/attempts/${id(0x403)}`, "admin"],
  ["admin-statistics", `/admin/exams/${id(0x102)}/versions/${id(0x202)}/statistics`, "admin"],
  ["admin-metrics", "/admin/metrics", "admin"], ["admin-audit", "/admin/audit", "admin"],
];
const captures = [];
for (const [name, route, role] of entries) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  if (role) {
    await page.goto(`http://127.0.0.1:4173/login?return=${encodeURIComponent(route)}`);
    await page.getByLabel("Email", { exact: true }).fill("candidate@example.test");
    await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("fixture-password-ok");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await page.waitForURL(`**${route}`);
    if (role === "admin") {
      await page.locator("summary").filter({ hasText: "Kịch bản mẫu" }).click();
      await page.getByLabel("Quyền mẫu").selectOption("admin");
      await page.locator("summary").filter({ hasText: "Kịch bản mẫu" }).click();
    }
  } else await page.goto(`http://127.0.0.1:4173${route}`);
  await page.locator("h1").first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(180);
  await page.screenshot({ path: `${out}/${name}-1440.png`, fullPage: true });
  const detail = await page.evaluate(() => ({
    title: document.querySelector("h1")?.textContent,
    width: innerWidth, documentWidth: document.documentElement.scrollWidth,
    text: document.querySelector("main")?.innerText.slice(0, 500) ?? "",
  }));
  captures.push({ name, route, role: role ?? "public", ...detail });
  if (["register", "catalog", "exam-room", "admin-editor"].includes(name)) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `${out}/${name}-390.png`, fullPage: true });
  }
  console.log(`Captured ${name}: ${detail.title}`);
}
await page.goto("http://127.0.0.1:4174/login");
await page.screenshot({ path: `${out}/live-login-1440.png`, fullPage: true });
await browser.close();
await writeFile(resolve(out, "../current-capture.json"), JSON.stringify({ captures, errors, synthetic: true }, null, 2));
console.log(`Captured ${captures.length} current screens; ${errors.length} page errors.`);
