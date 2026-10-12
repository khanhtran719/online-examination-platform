# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: public-experience.e2e-spec.ts >> public experience live >> fallback and keyboard navigation remain useful
- Location: e2e/public-experience.e2e-spec.ts:132:5

# Error details

```
Error: expect(locator).toBeChecked() failed

Locator:  getByRole('radio', { name: 'C 32' })
Expected: checked
Received: unchecked
Timeout:  12000ms

Call log:
  - Expect "toBeChecked" getByRole('radio', { name: 'C 32' }) with timeout 12000ms
  - waiting for getByRole('radio', { name: 'C 32' })
    28 × locator resolved to <input type="radio" name="sample-answer"/>
       - unexpected value "unchecked"

```

```yaml
- radio "C 32"
```

# Test source

```ts
  47  |       );
  48  |       for (const width of [320, 390, 768, 1024, 1440]) {
  49  |         await page.setViewportSize({ width, height: 900 });
  50  |         await fits(page);
  51  |         if ([320, 1024].includes(width)) await screenshot(page, `${mode}-home-${width}`);
  52  |         if (width === 320 || width === 1440) await accessible(page);
  53  |       }
  54  |       await page.emulateMedia({ reducedMotion: "reduce" });
  55  |       await expect(page.getByRole("button", { name: "Hiệu ứng tĩnh" })).toBeDisabled();
  56  |       expect(
  57  |         await page
  58  |           .locator("[data-renderer] > div")
  59  |           .filter({ hasText: "Không gian để tập trung" })
  60  |           .evaluate((element) => getComputedStyle(element).animationName),
  61  |       ).toBe("none");
  62  |       expect(errors).toEqual([]);
  63  |       expect(external).toEqual([]);
  64  |     });
  65  | 
  66  |     test("public sample works without business requests and leads to registration", async ({
  67  |       page,
  68  |     }) => {
  69  |       const requests: string[] = [],
  70  |         errors: string[] = [];
  71  |       page.on("pageerror", (error) => errors.push(error.message));
  72  |       await page.setViewportSize({ width: 390, height: 840 });
  73  |       await page.goto("/");
  74  |       await page.getByRole("link", { name: "Trải nghiệm 3 câu mẫu" }).first().click();
  75  |       await expect(page.getByRole("heading", { name: "Vào nhịp với 3 câu hỏi" })).toBeVisible();
  76  |       page.on("request", (request) => {
  77  |         if (
  78  |           new URL(request.url()).pathname.startsWith("/v1/") &&
  79  |           !new URL(request.url()).pathname.startsWith("/v1/auth/") &&
  80  |           new URL(request.url()).pathname !== "/v1/me"
  81  |         )
  82  |           requests.push(`${request.method()} ${request.url()}`);
  83  |       });
  84  |       for (const width of [320, 390, 768, 1024, 1440]) {
  85  |         await page.setViewportSize({ width, height: 900 });
  86  |         await fits(page);
  87  |       }
  88  |       await page.setViewportSize({ width: 390, height: 840 });
  89  |       await page.getByRole("radio", { name: "C 32" }).check();
  90  |       await page.getByRole("button", { name: "Đánh dấu" }).click();
  91  |       await screenshot(page, `${mode}-sample-390`);
  92  |       await accessible(page);
  93  |       await page.getByRole("button", { name: "Câu tiếp theo" }).click();
  94  |       await page.getByRole("checkbox", { name: "A 12" }).check();
  95  |       await page.getByRole("checkbox", { name: "C 28" }).check();
  96  |       await page.getByRole("button", { name: "Câu trước" }).click();
  97  |       await expect(page.getByRole("radio", { name: "C 32" })).toBeChecked();
  98  |       await expect(page.getByRole("button", { name: "Đã đánh dấu", exact: true })).toHaveAttribute(
  99  |         "aria-pressed",
  100 |         "true",
  101 |       );
  102 |       await page.getByRole("button", { name: "Câu tiếp theo" }).click();
  103 |       await expect(page.getByRole("checkbox", { name: "A 12" })).toBeChecked();
  104 |       await page.getByRole("button", { name: "Câu tiếp theo" }).click();
  105 |       await page.getByRole("radio", { name: "A Đúng" }).check();
  106 |       await page.getByRole("button", { name: "Xem lại lựa chọn" }).click();
  107 |       await expect(page.getByRole("heading", { name: "Xem lại trước khi kết thúc" })).toBeFocused();
  108 |       await page.getByRole("button", { name: "Xem kết quả mẫu" }).click();
  109 |       await expect(page.getByText("3 / 3", { exact: true })).toBeVisible();
  110 |       await accessible(page);
  111 |       await fits(page);
  112 |       await screenshot(page, `${mode}-result-390`);
  113 |       await page.getByRole("button", { name: "Thử lại 3 câu" }).click();
  114 |       await expect(page.getByRole("radio", { name: "C 32" })).not.toBeChecked();
  115 |       await page.getByRole("radio", { name: "C 32" }).check();
  116 |       await page.getByRole("button", { name: "Xóa lựa chọn" }).click();
  117 |       await expect(page.getByRole("radio", { name: "C 32" })).not.toBeChecked();
  118 |       await page.getByRole("radio", { name: "C 32" }).check();
  119 |       await page.reload();
  120 |       await expect(page.getByRole("radio", { name: "C 32" })).not.toBeChecked();
  121 |       await page.getByRole("button", { name: "Menu", exact: true }).click();
  122 |       await page
  123 |         .getByRole("navigation", { name: "Chính", exact: true })
  124 |         .getByRole("link", { name: "Tạo tài khoản" })
  125 |         .click();
  126 |       await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  127 |       await expect(page.getByLabel("Tên hiển thị")).toBeVisible();
  128 |       expect(requests).toEqual([]);
  129 |       expect(errors).toEqual([]);
  130 |     });
  131 | 
  132 |     test("fallback and keyboard navigation remain useful", async ({ page }) => {
  133 |       await page.addInitScript(() => {
  134 |         const original = HTMLCanvasElement.prototype.getContext;
  135 |         HTMLCanvasElement.prototype.getContext = function (...args: Parameters<typeof original>) {
  136 |           if (String(args[0]).startsWith("webgl")) return null;
  137 |           return original.apply(this, args);
  138 |         };
  139 |       });
  140 |       await page.goto("/");
  141 |       await expect(page.locator('[data-renderer="fallback"]')).toBeVisible();
  142 |       await page.getByRole("link", { name: "Trải nghiệm 3 câu mẫu" }).first().focus();
  143 |       await page.keyboard.press("Enter");
  144 |       await expect(page.getByRole("radio", { name: "C 32" })).toBeVisible();
  145 |       await page.getByRole("radio", { name: "C 32" }).focus();
  146 |       await page.keyboard.press("Space");
> 147 |       await expect(page.getByRole("radio", { name: "C 32" })).toBeChecked();
      |                                                               ^ Error: expect(locator).toBeChecked() failed
  148 |       await page.getByRole("button", { name: "Câu tiếp theo" }).focus();
  149 |       await page.keyboard.press("Enter");
  150 |       await expect(
  151 |         page.getByRole("heading", { name: "Những số nào sau đây là số chẵn?" }),
  152 |       ).toBeFocused();
  153 |       await page.goto("/attempts/00000000-0000-4000-8000-000000000401");
  154 |       await expect(
  155 |         page.getByRole("heading", {
  156 |           name: mode === "demo" ? "Đăng nhập" : "Không kết nối được phiên",
  157 |           exact: true,
  158 |         }),
  159 |       ).toBeVisible();
  160 |     });
  161 | 
  162 |     test("3D stops when paused or offscreen and recovers after context loss", async ({ page }) => {
  163 |       await page.addInitScript(() => {
  164 |         const target = window as Window & { sampleDraws?: number };
  165 |         target.sampleDraws = 0;
  166 |         const draw = WebGL2RenderingContext.prototype.drawElements;
  167 |         WebGL2RenderingContext.prototype.drawElements = function (...args) {
  168 |           target.sampleDraws = (target.sampleDraws ?? 0) + 1;
  169 |           draw.apply(this, args);
  170 |         };
  171 |       });
  172 |       const draws = () =>
  173 |         page.evaluate(() => (window as Window & { sampleDraws?: number }).sampleDraws ?? 0);
  174 |       await page.goto("/");
  175 |       const canvas = page.locator('[data-renderer="webgl"] canvas');
  176 |       await expect(canvas).toBeVisible();
  177 |       await page.getByRole("button", { name: "Dừng hiệu ứng" }).click();
  178 |       await page.waitForTimeout(150);
  179 |       const paused = await draws();
  180 |       await page.waitForTimeout(150);
  181 |       expect(await draws()).toBe(paused);
  182 |       await page.getByRole("button", { name: "Bật hiệu ứng" }).click();
  183 |       await expect.poll(draws).toBeGreaterThan(paused);
  184 |       await page.locator("footer").scrollIntoViewIfNeeded();
  185 |       await page.waitForTimeout(200);
  186 |       const offscreen = await draws();
  187 |       await page.waitForTimeout(150);
  188 |       expect(await draws()).toBe(offscreen);
  189 |       await page.locator("#home-title").scrollIntoViewIfNeeded();
  190 |       await canvas.evaluate((element) => {
  191 |         const target = element as HTMLCanvasElement & { sampleLoss?: WEBGL_lose_context };
  192 |         const extension = target.getContext("webgl2")?.getExtension("WEBGL_lose_context");
  193 |         if (!extension) throw new Error("Context-loss extension unavailable");
  194 |         target.sampleLoss = extension;
  195 |         extension.loseContext();
  196 |       });
  197 |       await expect(page.locator('[data-renderer="fallback"]')).toBeVisible();
  198 |       await page.locator('[data-renderer="fallback"] canvas').evaluate((element) => {
  199 |         (
  200 |           element as HTMLCanvasElement & { sampleLoss?: WEBGL_lose_context }
  201 |         ).sampleLoss?.restoreContext();
  202 |       });
  203 |       await expect(page.locator('[data-renderer="webgl"] canvas')).toBeVisible();
  204 |       await page.getByRole("link", { name: "Trải nghiệm 3 câu mẫu" }).first().click();
  205 |       await expect(page.locator("canvas")).toHaveCount(0);
  206 |     });
  207 |   });
  208 | }
  209 | 
```