import { mkdir } from "node:fs/promises";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "playwright/test";

const evidence = path.resolve(process.cwd(), "../../docs/web-ui/evidence/vao-nhip-thi-2026-10-07");
test.use({ launchOptions: { args: ["--enable-unsafe-swiftshader"] } });

async function screenshot(page: Page, name: string) {
  await mkdir(evidence, { recursive: true });
  await page.screenshot({ path: path.join(evidence, `${name}.png`), fullPage: true });
}
async function accessible(page: Page) {
  const result = await new AxeBuilder({ page }).analyze();
  expect(
    result.violations.filter((item) => item.impact === "serious" || item.impact === "critical"),
  ).toEqual([]);
}
async function fits(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

for (const [mode, baseURL] of [
  ["demo", "http://127.0.0.1:4173"],
  ["live", "http://127.0.0.1:4174"],
] as const) {
  test.describe(`public experience ${mode}`, () => {
    test.use({ baseURL });

    test("homepage renders 3D, fits five widths and supports motion pause", async ({ page }) => {
      const errors: string[] = [],
        external: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("request", (request) => {
        if (!request.url().startsWith(baseURL) && !request.url().startsWith("data:"))
          external.push(request.url());
      });
      await page.goto("/");
      await expect(page.getByRole("heading", { name: /Vào nhịp thi/ })).toBeVisible();
      await expect(page.locator('[data-renderer="webgl"] canvas')).toBeVisible();
      await page.getByRole("button", { name: "Dừng hiệu ứng" }).click();
      await expect(page.getByRole("button", { name: "Bật hiệu ứng" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      for (const width of [320, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await fits(page);
        if ([320, 1024].includes(width)) await screenshot(page, `${mode}-home-${width}`);
        if (width === 320 || width === 1440) await accessible(page);
      }
      await page.emulateMedia({ reducedMotion: "reduce" });
      await expect(page.getByRole("button", { name: "Hiệu ứng tĩnh" })).toBeDisabled();
      expect(
        await page
          .locator("[data-renderer] > div")
          .filter({ hasText: "Không gian để tập trung" })
          .evaluate((element) => getComputedStyle(element).animationName),
      ).toBe("none");
      expect(errors).toEqual([]);
      expect(external).toEqual([]);
    });

    test("public sample works without business requests and leads to registration", async ({
      page,
    }) => {
      const requests: string[] = [],
        errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.setViewportSize({ width: 390, height: 840 });
      await page.goto("/");
      await page.getByRole("link", { name: "Trải nghiệm 3 câu mẫu" }).first().click();
      await expect(page.getByRole("heading", { name: "Vào nhịp với 3 câu hỏi" })).toBeVisible();
      page.on("request", (request) => {
        if (
          new URL(request.url()).pathname.startsWith("/v1/") &&
          !new URL(request.url()).pathname.startsWith("/v1/auth/") &&
          new URL(request.url()).pathname !== "/v1/me"
        )
          requests.push(`${request.method()} ${request.url()}`);
      });
      for (const width of [320, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await fits(page);
      }
      await page.setViewportSize({ width: 390, height: 840 });
      await page.getByRole("radio", { name: "C 32" }).check();
      await page.getByRole("button", { name: "Đánh dấu" }).click();
      await screenshot(page, `${mode}-sample-390`);
      await accessible(page);
      await page.getByRole("button", { name: "Câu tiếp theo" }).click();
      await page.getByRole("checkbox", { name: "A 12" }).check();
      await page.getByRole("checkbox", { name: "C 28" }).check();
      await page.getByRole("button", { name: "Câu trước" }).click();
      await expect(page.getByRole("radio", { name: "C 32" })).toBeChecked();
      await expect(page.getByRole("button", { name: "Đã đánh dấu", exact: true })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await page.getByRole("button", { name: "Câu tiếp theo" }).click();
      await expect(page.getByRole("checkbox", { name: "A 12" })).toBeChecked();
      await page.getByRole("button", { name: "Câu tiếp theo" }).click();
      await page.getByRole("radio", { name: "A Đúng" }).check();
      await page.getByRole("button", { name: "Xem lại lựa chọn" }).click();
      await expect(page.getByRole("heading", { name: "Xem lại trước khi kết thúc" })).toBeFocused();
      await page.getByRole("button", { name: "Xem kết quả mẫu" }).click();
      await expect(page.getByText("3 / 3", { exact: true })).toBeVisible();
      await accessible(page);
      await fits(page);
      await screenshot(page, `${mode}-result-390`);
      await page.getByRole("button", { name: "Thử lại 3 câu" }).click();
      await expect(page.getByRole("radio", { name: "C 32" })).not.toBeChecked();
      await page.getByRole("radio", { name: "C 32" }).check();
      await page.getByRole("button", { name: "Xóa lựa chọn" }).click();
      await expect(page.getByRole("radio", { name: "C 32" })).not.toBeChecked();
      await page.getByRole("radio", { name: "C 32" }).check();
      await page.reload();
      await expect(page.getByRole("radio", { name: "C 32" })).not.toBeChecked();
      await page.getByRole("button", { name: "Menu", exact: true }).click();
      await page
        .getByRole("navigation", { name: "Chính", exact: true })
        .getByRole("link", { name: "Tạo tài khoản" })
        .click();
      await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
      await expect(page.getByLabel("Tên hiển thị")).toBeVisible();
      expect(requests).toEqual([]);
      expect(errors).toEqual([]);
    });

    test("fallback and keyboard navigation remain useful", async ({ page }) => {
      await page.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (...args: Parameters<typeof original>) {
          if (String(args[0]).startsWith("webgl")) return null;
          return original.apply(this, args);
        };
      });
      await page.goto("/");
      await expect(page.locator('[data-renderer="fallback"]')).toBeVisible();
      await page.getByRole("link", { name: "Trải nghiệm 3 câu mẫu" }).first().focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("radio", { name: "C 32" })).toBeVisible();
      await page.getByRole("radio", { name: "C 32" }).focus();
      await page.keyboard.press("Space");
      await expect(page.getByRole("radio", { name: "C 32" })).toBeChecked();
      await page.getByRole("button", { name: "Câu tiếp theo" }).focus();
      await page.keyboard.press("Enter");
      await expect(
        page.getByRole("heading", { name: "Những số nào sau đây là số chẵn?" }),
      ).toBeFocused();
      await page.goto("/attempts/00000000-0000-4000-8000-000000000401");
      await expect(
        page.getByRole("heading", {
          name: mode === "demo" ? "Đăng nhập" : "Không kết nối được phiên",
          exact: true,
        }),
      ).toBeVisible();
    });

    test("3D stops when paused or offscreen and recovers after context loss", async ({ page }) => {
      await page.addInitScript(() => {
        const target = window as Window & { sampleDraws?: number };
        target.sampleDraws = 0;
        const draw = WebGL2RenderingContext.prototype.drawElements;
        WebGL2RenderingContext.prototype.drawElements = function (...args) {
          target.sampleDraws = (target.sampleDraws ?? 0) + 1;
          draw.apply(this, args);
        };
      });
      const draws = () =>
        page.evaluate(() => (window as Window & { sampleDraws?: number }).sampleDraws ?? 0);
      await page.goto("/");
      const canvas = page.locator('[data-renderer="webgl"] canvas');
      await expect(canvas).toBeVisible();
      await page.getByRole("button", { name: "Dừng hiệu ứng" }).click();
      await page.waitForTimeout(150);
      const paused = await draws();
      await page.waitForTimeout(150);
      expect(await draws()).toBe(paused);
      await page.getByRole("button", { name: "Bật hiệu ứng" }).click();
      await expect.poll(draws).toBeGreaterThan(paused);
      await page.locator("footer").scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      const offscreen = await draws();
      await page.waitForTimeout(150);
      expect(await draws()).toBe(offscreen);
      await page.locator("#home-title").scrollIntoViewIfNeeded();
      await canvas.evaluate((element) => {
        const target = element as HTMLCanvasElement & { sampleLoss?: WEBGL_lose_context };
        const extension = target.getContext("webgl2")?.getExtension("WEBGL_lose_context");
        if (!extension) throw new Error("Context-loss extension unavailable");
        target.sampleLoss = extension;
        extension.loseContext();
      });
      await expect(page.locator('[data-renderer="fallback"]')).toBeVisible();
      await page.locator('[data-renderer="fallback"] canvas').evaluate((element) => {
        (
          element as HTMLCanvasElement & { sampleLoss?: WEBGL_lose_context }
        ).sampleLoss?.restoreContext();
      });
      await expect(page.locator('[data-renderer="webgl"] canvas')).toBeVisible();
      await page.getByRole("link", { name: "Trải nghiệm 3 câu mẫu" }).first().click();
      await expect(page.locator("canvas")).toHaveCount(0);
    });
  });
}
