import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "playwright/test";

test.use({
  trace: "off",
  screenshot: "off",
  video: "off",
  launchOptions: { args: ["--enable-unsafe-swiftshader"] },
});
const output = path.resolve(
  process.env.WEB_EVIDENCE_DIR ?? "../../.local/web-evidence/port-06c",
  "home-convergence",
);
const widths = [768, 1024, 1280, 1440];
const sections = [
  "home-title",
  "home-sample-title",
  "category-title",
  "values-title",
  "home-journey-title",
  "faq-title",
  "try-title",
];

async function capture(page: Page, name: string, screenshot = false) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.evaluate(() => document.fonts.ready);
  const scan = await new AxeBuilder({ page }).analyze();
  const state = await page.evaluate(() => {
    const text = Array.from(
      document.querySelectorAll<HTMLElement>(
        "main p, main span, main a, main label, main button, main summary, main h3",
      ),
    );
    const smallText = text
      .filter(
        (n) =>
          n.checkVisibility() &&
          n.getBoundingClientRect().height > 0 &&
          !n.closest('[aria-hidden="true"]') &&
          /[\p{L}\p{N}]/u.test(n.textContent ?? "") &&
          parseFloat(getComputedStyle(n).fontSize) < 14,
      )
      .map((n) => ({ text: n.textContent?.trim().slice(0, 80), px: getComputedStyle(n).fontSize }));
    const copy = document.querySelector<HTMLElement>(
      'section[aria-labelledby="home-title"] > div > div:first-child',
    )!;
    const scene = document.querySelector<HTMLElement>("[data-renderer]")!;
    const box = (n: Element) => {
      const r = n.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    };
    const guide = document.querySelector('section[aria-labelledby="home-journey-title"]')!;
    return {
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      fontLoaded: document.fonts.check('400 16px "Be Vietnam Pro"', "Hướng dẫn tiếng Việt"),
      smallText,
      sections: Array.from(document.querySelectorAll("main > div > section")).map((n) =>
        n.getAttribute("aria-labelledby"),
      ),
      copy: { ...box(copy), background: getComputedStyle(copy).backgroundColor },
      scene: box(scene),
      renderer: scene.dataset.renderer,
      guide: {
        ...box(guide),
        links: Array.from(guide.querySelectorAll("a")).map((n) => n.getAttribute("href")),
      },
      footer: getComputedStyle(document.querySelector("footer")!).backgroundColor,
    };
  });
  await mkdir(output, { recursive: true });
  await writeFile(
    path.join(output, `${name}.json`),
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
  if (screenshot) await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });
  expect(scan.violations.map((v) => v.id)).toEqual([]);
  expect(state.sections).toEqual(sections);
  expect(state.smallText).toEqual([]);
  expect(state.fontLoaded).toBe(true);
  expect(state.scrollWidth).toBeLessThanOrEqual(state.width);
  expect(state.copy.background).toBe("rgb(255, 255, 255)");
  expect(state.footer).toBe("rgb(255, 255, 255)");
  expect(state.guide.links).toEqual(["/how-it-works", "/help"]);
  expect(state.copy.x).toBeGreaterThanOrEqual(24);
  if (state.width > 900) {
    expect(state.copy.x).toBeLessThan(state.scene.x);
    expect(Math.abs(state.copy.y - state.scene.y)).toBeLessThanOrEqual(1);
    expect
      .soft(Math.abs(state.copy.height - state.scene.height), `${name}: aligned hero cards`)
      .toBeLessThanOrEqual(1);
    expect(Math.abs(state.copy.width - state.scene.width)).toBeLessThanOrEqual(1);
  } else expect(state.copy.y + state.copy.height).toBeLessThan(state.scene.y);
}

test("PORT-06C Home follows reference section order and legible card geometry on Web/tablet", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of widths) {
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Vào nhịp thi.");
    await expect(page.locator('[data-renderer="webgl"] canvas')).toBeVisible();
    await page.getByRole("button", { name: "Dừng hiệu ứng", exact: true }).click();
    await capture(page, `home-${width}`, true);
    const faq = page.getByRole("region", { name: "Những điều bạn có thể muốn biết." });
    const deadline = faq
      .locator("summary")
      .filter({ hasText: "Rời phòng thi có dừng đồng hồ không?" });
    await deadline.focus();
    await page.keyboard.press("Enter");
    await expect(deadline.locator("..")).toHaveAttribute("open", "");
    await expect(deadline.locator("..")).toContainText("Thời hạn do máy chủ đặt vẫn tiếp tục");
    await capture(page, `home-faq-${width}`);
    await page.keyboard.press("Space");
    await expect(deadline.locator("..")).not.toHaveAttribute("open", "");
  }
  expect(errors).toEqual([]);
});

test("PORT-06C inline sample, guide/category routing and signed-in destinations retain real behavior", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const business: string[] = [];
  page.on("request", (r) => {
    const p = new URL(r.url()).pathname;
    if (p.startsWith("/v1/") && p !== "/v1/me" && !p.startsWith("/v1/auth/")) business.push(p);
  });
  for (const width of widths) {
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/");
    const sample = page.getByRole("region", { name: "Thử ngay 3 câu mẫu." });
    await sample.getByRole("radio", { name: "C 32" }).check();
    await sample.getByRole("button", { name: "Đánh dấu", exact: true }).click();
    await sample.getByRole("button", { name: "Câu tiếp theo" }).click();
    await sample.getByRole("checkbox", { name: "A 12" }).check();
    await sample.getByRole("checkbox", { name: "C 28" }).check();
    await sample.getByRole("button", { name: "Câu tiếp theo" }).click();
    await sample.getByRole("radio", { name: "A Đúng" }).check();
    await sample.getByRole("button", { name: "Rà soát bài mẫu" }).click();
    await expect(sample.getByRole("heading", { name: "Xem lại trước khi kết thúc" })).toBeFocused();
    await capture(page, `home-review-${width}`);
    await sample.getByRole("button", { name: "Xem kết quả mẫu" }).click();
    await expect(sample.getByText("3 / 3", { exact: true })).toBeVisible();
    await capture(page, `home-result-${width}`, width === 768);
    await sample.getByRole("button", { name: "Thử lại 3 câu" }).click();
    await expect(sample.getByRole("radio", { name: "C 32" })).not.toBeChecked();
    await page.getByRole("link", { name: "Xem hướng dẫn 5 bước" }).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/how-it-works$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Bắt đầu rõ ràng.");
    await page.goBack();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Vào nhịp thi.");
    await expect(page.getByRole("radio", { name: "C 32" })).not.toBeChecked();
  }
  expect(business).toEqual([]);
  const category = page.getByRole("region", { name: "Danh mục đề thi" });
  await category
    .getByRole("link")
    .filter({ has: page.getByRole("heading", { name: "IELTS", exact: true }) })
    .click();
  await expect(page).toHaveURL(/\/login\?return=%2Fexams%3Fcategory%3DIELTS$/);
  await page.goto("/login?return=%2Fdashboard");
  await page.getByLabel("Email", { exact: true }).fill("candidate@example.test");
  await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("fixture-password-ok");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.evaluate(() => {
    history.pushState(null, "", "/");
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page.getByRole("link", { name: "Đi tới đề thi", exact: true })).toHaveAttribute(
    "href",
    "/exams",
  );
  await expect(page.getByRole("link", { name: "Tạo tài khoản thí sinh" })).toHaveCount(0);
  await capture(page, "home-signed-in-1440");
});

test("PORT-06C fallback and live session-unavailable Home keep readable guidance and reduced motion", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (...args: Parameters<typeof original>) {
      if (String(args[0]).startsWith("webgl")) return null;
      return original.apply(this, args);
    };
  });
  for (const width of widths) {
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/");
    await expect(page.locator('[data-renderer="fallback"]')).toBeVisible();
    await capture(page, `home-fallback-${width}`, width === 1280);
  }
  const requests: string[] = [];
  await page.route("**/v1/**", async (route) => {
    requests.push(new URL(route.request().url()).pathname);
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        data: null,
        status: false,
        errorCode: "Unavailable",
        message: "Chưa kết nối được.",
      }),
    });
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of widths) {
    await page.setViewportSize({ width, height: 960 });
    await page.goto("http://127.0.0.1:4174/");
    await expect(page.getByRole("button", { name: "Hiệu ứng tĩnh" })).toBeDisabled();
    await expect(page.getByRole("link", { name: "Xem hướng dẫn 5 bước" })).toBeVisible();
    await capture(page, `home-live-reduced-${width}`, width === 1280);
  }
  expect(requests.length).toBeGreaterThan(0);
  expect(requests.every((p) => p === "/v1/me")).toBe(true);
});
