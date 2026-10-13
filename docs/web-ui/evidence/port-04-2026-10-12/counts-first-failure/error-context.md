# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: port-04.e2e-spec.ts >> PORT-04 counts multiple selections independently against completed attempts
- Location: e2e/port-04.e2e-spec.ts:172:1

# Error details

```
Error: expect(locator).toBeEnabled() failed

Locator:  getByRole('button', { name: 'Câu sau', exact: true })
Expected: enabled
Received: disabled
Timeout:  12000ms

Call log:
  - Expect "toBeEnabled" getByRole('button', { name: 'Câu sau', exact: true }) with timeout 12000ms
  - waiting for getByRole('button', { name: 'Câu sau', exact: true })
    23 × locator resolved to <button disabled type="button" class="_buttonSecondary_r2gsm_2">Câu sau</button>
       - unexpected value "disabled"

```

```yaml
- button "Câu sau" [disabled]
```

# Test source

```ts
  80  |   page,
  81  | }) => {
  82  |   await admin(page, "/admin/monitor");
  83  |   for (const width of [1440, 1280, 1024, 768]) {
  84  |     await page.setViewportSize({ width, height: 1000 });
  85  |     await navigate(page, "/admin/monitor");
  86  |     await expect(page.getByRole("link", { name: "Mở giám sát →" }).first()).toBeVisible();
  87  |     await capture(page, `monitor-index-${width}`);
  88  |     await navigate(page, `/admin/exams/${exam}/monitor`);
  89  |     await expect(page.getByText(/Mốc máy chủ của trang đầu/)).toBeVisible();
  90  |     await capture(page, `monitor-exam-${width}`);
  91  |     await navigate(page, `/admin/exams/${exam}/submissions`);
  92  |     await expect(page.getByText("Chưa có điểm", { exact: true }).first()).toBeVisible();
  93  |     await capture(page, `submissions-${width}`);
  94  |   }
  95  |   await page.getByLabel("Lọc theo phiên bản đã phát hành").fill("invalid");
  96  |   await page.getByRole("button", { name: "Áp dụng bộ lọc" }).click();
  97  |   await expect(page.getByRole("alert")).toContainText("Mã phiên bản không đúng định dạng");
  98  |   await expect(page.getByText("Chưa có điểm", { exact: true }).first()).toBeVisible();
  99  | });
  100 | test("PORT-04 statistics, audit drawer and failed detail match selected layouts", async ({
  101 |   page,
  102 | }) => {
  103 |   await admin(page, "/admin/audit");
  104 |   for (const width of [1440, 1280, 1024, 768]) {
  105 |     await page.setViewportSize({ width, height: 1000 });
  106 |     await navigate(page, "/admin/audit");
  107 |     const detail = page.getByRole("button", { name: "Chi tiết", exact: true }).first();
  108 |     await expect(detail).toBeVisible();
  109 |     await capture(page, `audit-${width}`);
  110 |     await detail.click();
  111 |     await expect(page.getByRole("dialog")).toContainText("Không được cung cấp");
  112 |     const panel = await page.getByRole("dialog").boundingBox();
  113 |     expect(panel!.x + panel!.width).toBeCloseTo(width, 0);
  114 |     await capture(page, `audit-drawer-${width}`);
  115 |     await page.keyboard.press("Escape");
  116 |     await expect(detail).toBeFocused();
  117 |     await navigate(
  118 |       page,
  119 |       `/admin/exams/${exam}/versions/00000000-0000-4000-8000-000000000201/statistics`,
  120 |     );
  121 |     await expect(page.getByRole("button", { name: "Xem lựa chọn" }).first()).toBeVisible();
  122 |     await expect(page.getByText("Chưa có mẫu", { exact: true }).first()).toBeVisible();
  123 |     await capture(page, `statistics-zero-${width}`);
  124 |     await navigate(page, `/admin/attempts/${failed}`);
  125 |     await expect(page.getByText("Chưa có điểm", { exact: true })).toBeVisible();
  126 |     await expect(page.getByRole("heading", { name: "Xử lý thất bại", exact: true })).toHaveCount(0);
  127 |     await capture(page, `failed-detail-${width}`);
  128 |   }
  129 | });
  130 | test("PORT-04 replay confirmation restores focus, retries a frozen request and clears on permission loss", async ({
  131 |   page,
  132 | }) => {
  133 |   await admin(page, `/admin/attempts/${failed}`);
  134 |   const errors: string[] = [];
  135 |   page.on("pageerror", (e) => errors.push(e.message));
  136 |   const request = page.getByRole("button", { name: "Yêu cầu xử lý lại", exact: true });
  137 |   await page
  138 |     .getByLabel("Lý do", { exact: true })
  139 |     .fill("Phụ thuộc đã được khôi phục; xử lý lại bài nộp gốc.");
  140 |   await request.click();
  141 |   await page.keyboard.press("Escape");
  142 |   await expect(request).toBeFocused();
  143 |   for (const width of [1440, 1280, 1024, 768]) {
  144 |     await page.setViewportSize({ width, height: 1000 });
  145 |     await request.click();
  146 |     const dialog = page.getByRole("dialog", { name: "Yêu cầu xử lý lại" });
  147 |     await expect(dialog.getByLabel("Lý do xác nhận")).toHaveValue(
  148 |       "Phụ thuộc đã được khôi phục; xử lý lại bài nộp gốc.",
  149 |     );
  150 |     await capture(page, `replay-confirm-${width}`);
  151 |     await page.keyboard.press("Escape");
  152 |   }
  153 |   const menu = page.locator("summary").filter({ hasText: "Kịch bản mẫu" });
  154 |   await menu.click();
  155 |   await page.getByLabel("Lỗi lưu tiếp theo").selectOption("lose-ack");
  156 |   await menu.click();
  157 |   await request.click();
  158 |   await page.getByRole("dialog").getByRole("button", { name: "Gửi yêu cầu" }).click();
  159 |   await expect(page.getByText("Chưa nhận được xác nhận", { exact: true })).toBeVisible();
  160 |   await expect(page.getByLabel("Lý do", { exact: true })).toBeDisabled();
  161 |   await capture(page, "replay-unknown-768");
  162 |   await page.getByRole("button", { name: "Thử gửi lại cùng nội dung" }).click();
  163 |   await expect(
  164 |     page.getByText("Đã nhận yêu cầu xử lý lại. Kết quả chưa được tính là xong.", { exact: true }),
  165 |   ).toBeVisible();
  166 |   await preset(page, "reviewer");
  167 |   await expect(request).toHaveCount(0);
  168 |   await preset(page, "admin");
  169 |   await expect(page.getByLabel("Lý do", { exact: true })).toHaveValue("");
  170 |   expect(errors).toEqual([]);
  171 | });
  172 | test("PORT-04 counts multiple selections independently against completed attempts", async ({
  173 |   page,
  174 | }) => {
  175 |   await page.setViewportSize({ width: 1440, height: 1000 });
  176 |   await admin(page);
  177 |   await navigate(page, `/exams/${exam}`);
  178 |   await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
  179 |   await page.getByRole("dialog").getByRole("button", { name: "Bắt đầu", exact: true }).click();
> 180 |   await expect(page.getByRole("button", { name: "Câu sau", exact: true })).toBeEnabled();
      |                                                                            ^ Error: expect(locator).toBeEnabled() failed
  181 |   await page.getByRole("button", { name: "Câu sau", exact: true }).click();
  182 |   const choices = page
  183 |     .getByRole("group", { name: "Chọn các đáp án bạn cho là đúng." })
  184 |     .getByRole("checkbox");
  185 |   const count = await choices.count();
  186 |   expect(count).toBeGreaterThan(1);
  187 |   for (const choice of await choices.all()) await choice.check();
  188 |   await expect(page.getByRole("status").filter({ hasText: "Đã lưu lúc" })).toBeVisible();
  189 |   await page.getByRole("button", { name: "Nộp bài", exact: true }).click();
  190 |   await page.getByRole("dialog").getByRole("button", { name: "Nộp các đáp án đã lưu" }).click();
  191 |   await expect(page.getByRole("heading", { name: "Kết quả đã sẵn sàng" })).toBeVisible();
  192 |   await navigate(
  193 |     page,
  194 |     `/admin/exams/${exam}/versions/00000000-0000-4000-8000-000000000201/statistics`,
  195 |   );
  196 |   await page.getByRole("button", { name: "Xem lựa chọn" }).nth(1).click();
  197 |   await expect(page.getByText(`Tổng lượt lựa chọn: ${count}`, { exact: true })).toBeVisible();
  198 |   const bars = page
  199 |     .getByRole("region", { name: "Lượt lựa chọn của câu đã chọn" })
  200 |     .getByRole("img", { name: "1 trên 1 lượt", exact: true });
  201 |   await expect(bars).toHaveCount(count);
  202 |   for (const bar of await bars.all()) {
  203 |     const track = await bar.boundingBox(),
  204 |       fill = await bar.locator("span").boundingBox();
  205 |     expect(fill!.width / track!.width).toBeCloseTo(1, 2);
  206 |   }
  207 |   for (const width of [1440, 1280, 1024, 768]) {
  208 |     await page.setViewportSize({ width, height: 1000 });
  209 |     await capture(page, `statistics-counts-${width}`);
  210 |   }
  211 | });
  212 | 
```