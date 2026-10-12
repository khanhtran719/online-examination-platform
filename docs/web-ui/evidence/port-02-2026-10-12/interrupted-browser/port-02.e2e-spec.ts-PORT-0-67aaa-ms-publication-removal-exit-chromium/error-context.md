# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: port-02.e2e-spec.ts >> PORT-02 creates a structured draft, validates locally and confirms publication/removal/exit
- Location: e2e/port-02.e2e-spec.ts:62:1

# Error details

```
Test timeout of 45000ms exceeded.
```

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('✓ Đang phát hành', { exact: true })
Expected: visible
Timeout: 12000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText('✓ Đang phát hành', { exact: true }) with timeout 12000ms
  - waiting for getByText('✓ Đang phát hành', { exact: true })

```

```yaml
- status: Dữ liệu mẫu. Đây không phải dữ liệu vận hành và không chứng minh bản live.
- group: Kịch bản mẫu
- link "Đi tới nội dung":
  - /url: "#content"
- complementary "Không gian làm việc":
  - link "ExamPlatform — trang chủ":
    - /url: /
  - navigation "Quản trị":
    - link "Tổng quan":
      - /url: /admin
    - link "Đề thi":
      - /url: /admin/exams
    - link "Ngân hàng câu":
      - /url: /admin/questions
    - link "Nhập JSON":
      - /url: /admin/imports/new
    - link "Giám sát":
      - /url: /admin/monitor
    - link "Số liệu":
      - /url: /admin/metrics
    - link "Nhật ký":
      - /url: /admin/audit
    - link "Về bảng làm việc":
      - /url: /dashboard
  - link "Trợ giúp":
    - /url: /help
- banner:
  - link "ExamPlatform — trang chủ":
    - /url: /
    - text: ExamPlatform
  - text: Quản trị
  - 'link "Hồ sơ: Lan Nguyễn"':
    - /url: /profile
    - text: Lan Nguyễn
  - button "Đăng xuất"
- main:
  - paragraph:
    - text: Quản trị /
    - link "Đề thi":
      - /url: /admin/exams
    - text: / Sửa bản nháp
  - heading "Sửa đề" [level=1]
  - text: Bản nháp
  - paragraph: IT Certification · Chưa lưu trên máy chủ
  - link "← Danh sách đề":
    - /url: /admin/exams
- contentinfo: ExamPlatform · Vào nhịp thi
```

# Test source

```ts
  28  |   await mkdir(evidence, { recursive: true });
  29  |   const scan = await new AxeBuilder({ page })
  30  |     .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
  31  |     .analyze();
  32  |   const width = await page.evaluate(() => document.documentElement.scrollWidth);
  33  |   await writeFile(
  34  |     path.join(evidence, `${name}.json`),
  35  |     JSON.stringify(
  36  |       {
  37  |         viewport: page.viewportSize(),
  38  |         violations: scan.violations,
  39  |         width,
  40  |         fontLoaded: await page.evaluate(() =>
  41  |           document.fonts.check('400 16px "Be Vietnam Pro"', "Bài thi tiếng Việt"),
  42  |         ),
  43  |         url: page.url(),
  44  |       },
  45  |       null,
  46  |       2,
  47  |     ),
  48  |   );
  49  |   await page.screenshot({
  50  |     path: path.join(evidence, `${name}.png`),
  51  |     fullPage: (await page.getByRole("dialog").count()) === 0,
  52  |   });
  53  |   expect(
  54  |     scan.violations.map((item) => ({
  55  |       id: item.id,
  56  |       targets: item.nodes.map((node) => node.target),
  57  |     })),
  58  |   ).toEqual([]);
  59  |   expect(width).toBeLessThanOrEqual(page.viewportSize()!.width);
  60  | }
  61  | 
  62  | test("PORT-02 creates a structured draft, validates locally and confirms publication/removal/exit", async ({
  63  |   page,
  64  | }) => {
  65  |   const errors: string[] = [];
  66  |   page.on("pageerror", (error) => errors.push(error.message));
  67  |   await page.setViewportSize({ width: 1440, height: 1000 });
  68  |   await admin(page, "/admin/exams/new");
  69  |   await page
  70  |     .getByLabel("Tiêu đề", { exact: true })
  71  |     .fill("Nền tảng điện toán đám mây — Bài ôn tập 01");
  72  |   await page.getByLabel("Thời lượng (phút)", { exact: true }).fill("90");
  73  |   await page.getByLabel("Mở", { exact: true }).fill("2026-11-15T08:00");
  74  |   await page.getByLabel("Đóng", { exact: true }).fill("2026-11-15T12:00");
  75  |   await page.getByLabel("Giới hạn lượt", { exact: true }).fill("3");
  76  |   await capture(page, "information-1440");
  77  |   await page.getByRole("button", { name: "Các phần & câu hỏi", exact: true }).click();
  78  |   await capture(page, "structure-empty-1440");
  79  |   const names = ["Kiến thức nền", "Quyền truy cập & bảo mật", "Tình huống triển khai"];
  80  |   for (let index = 0; index < 3; index += 1) {
  81  |     if (index) await page.getByRole("button", { name: "Thêm phần", exact: true }).click();
  82  |     await page.getByLabel("Tên phần", { exact: true }).nth(index).fill(names[index]!);
  83  |     await page.getByRole("button", { name: `Chọn câu cho phần ${index + 1}`, exact: true }).click();
  84  |     const picker = page.getByRole("dialog", { name: "Chọn câu từ ngân hàng" });
  85  |     await picker
  86  |       .getByRole("button", { name: /^Thêm:/ })
  87  |       .first()
  88  |       .click();
  89  |     await picker
  90  |       .getByRole("button", { name: /^Thêm:/ })
  91  |       .first()
  92  |       .click();
  93  |     await page.keyboard.press("Escape");
  94  |     const section = page.getByRole("group", { name: `Phần ${index + 1}`, exact: true });
  95  |     await section.getByLabel("Điểm câu 1", { exact: true }).fill(String([10, 15, 25][index]));
  96  |     await section.getByLabel("Điểm câu 2", { exact: true }).fill(String([10, 15, 25][index]));
  97  |   }
  98  |   await page.getByRole("button", { name: "Bỏ phần 1", exact: true }).click();
  99  |   await expect(page.getByRole("dialog")).toContainText("2 phần · 4 câu · 80 điểm");
  100 |   await capture(page, "remove-section-1440");
  101 |   await page.keyboard.press("Escape");
  102 |   await expect(page.getByRole("button", { name: "Bỏ phần 1", exact: true })).toBeFocused();
  103 |   await page.getByRole("button", { name: "Kiểm tra & phát hành", exact: true }).click();
  104 |   await expect(page.getByText("5/5 mục đạt", { exact: true })).toBeVisible();
  105 |   await capture(page, "preflight-1440");
  106 |   await page.setViewportSize({ width: 1280, height: 1000 });
  107 |   await capture(page, "preflight-1280");
  108 |   await page.setViewportSize({ width: 320, height: 844 });
  109 |   await capture(page, "preflight-320");
  110 |   await page.setViewportSize({ width: 1440, height: 1000 });
  111 |   await page.getByRole("button", { name: "Lưu và phát hành", exact: true }).click();
  112 |   await capture(page, "publish-confirm-1440");
  113 |   await page.keyboard.press("Escape");
  114 |   await page.getByRole("link", { name: "← Danh sách đề", exact: true }).click();
  115 |   await capture(page, "unsaved-exit-1440");
  116 |   await page.getByRole("button", { name: "Ở lại chỉnh sửa", exact: true }).click();
  117 |   await fault(page, "delay-ack");
  118 |   await page.getByRole("button", { name: "Lưu và phát hành", exact: true }).click();
  119 |   await page.getByRole("dialog").getByRole("button", { name: "Xác nhận", exact: true }).click();
  120 |   await expect(page.getByRole("dialog")).toContainText("Đang chờ máy chủ xác nhận");
  121 |   await expect(
  122 |     page.getByRole("dialog").getByRole("button", { name: "Đóng", exact: true }),
  123 |   ).toBeDisabled();
  124 |   await page.keyboard.press("Escape");
  125 |   await expect(page.getByRole("dialog")).toBeVisible();
  126 |   await capture(page, "publication-pending-1440");
  127 |   await expect(page).toHaveURL(/\/admin\/exams\/[^/]+\/edit$/);
> 128 |   await expect(page.getByText("✓ Đang phát hành", { exact: true })).toBeVisible();
      |                                                                     ^ Error: expect(locator).toBeVisible() failed
  129 |   await page.getByRole("button", { name: "Gỡ phát hành", exact: true }).click();
  130 |   await capture(page, "unpublish-confirm-1440");
  131 |   await page.getByRole("dialog").getByRole("button", { name: "Xác nhận", exact: true }).click();
  132 |   await page.getByRole("button", { name: "Lưu trữ", exact: true }).click();
  133 |   await capture(page, "archive-confirm-1440");
  134 |   await page.getByRole("dialog").getByRole("button", { name: "Xác nhận", exact: true }).click();
  135 |   await expect(page.getByText("Đã lưu trữ", { exact: true })).toBeVisible();
  136 |   await expect(page.getByLabel("Tiêu đề", { exact: true })).toBeDisabled();
  137 |   expect(errors).toEqual([]);
  138 | });
  139 | 
  140 | test("PORT-02 compares conflicts, guards reload and retries an unknown write", async ({ page }) => {
  141 |   await page.setViewportSize({ width: 1280, height: 1000 });
  142 |   await admin(page, "/admin/exams/00000000-0000-4000-8000-000000000101/edit");
  143 |   await expect(page.getByLabel("Tiêu đề", { exact: true })).not.toHaveValue("");
  144 |   const original = await page.getByLabel("Tiêu đề", { exact: true }).inputValue();
  145 |   await page.getByLabel("Tiêu đề", { exact: true }).fill("Bản đang sửa cục bộ");
  146 |   await page.getByLabel("Đóng", { exact: true }).fill("2026-01-01T00:00");
  147 |   await page.getByRole("button", { name: "Kiểm tra & phát hành", exact: true }).click();
  148 |   await capture(page, "preflight-validation-1280");
  149 |   await page.getByRole("button", { name: "Giờ đóng phải sau giờ mở. →", exact: true }).click();
  150 |   await expect(page.getByLabel("Đóng", { exact: true })).toBeFocused();
  151 |   await page.getByLabel("Đóng", { exact: true }).fill("2027-01-01T00:00");
  152 |   await fault(page, "conflict-save");
  153 |   await page.getByRole("button", { name: "Lưu nháp", exact: true }).click();
  154 |   const compare = page.getByRole("dialog", { name: "Bản nháp đã thay đổi ở nơi khác" });
  155 |   await expect(compare).toContainText("Bản đã lưu mới nhất");
  156 |   await capture(page, "draft-conflict-1280");
  157 |   await page.keyboard.press("Escape");
  158 |   await expect(page.getByLabel("Tiêu đề", { exact: true })).toHaveValue("Bản đang sửa cục bộ");
  159 |   await page.getByRole("button", { name: "Đối chiếu bản nháp", exact: true }).click();
  160 |   await page.getByRole("button", { name: "Bỏ sửa và dùng bản mới", exact: true }).click();
  161 |   await expect(page.getByLabel("Tiêu đề", { exact: true })).toHaveValue(original);
  162 |   await fault(page, "lose-ack");
  163 |   await page.getByRole("button", { name: "Kiểm tra & phát hành", exact: true }).click();
  164 |   await page.getByRole("button", { name: "Lưu và phát hành", exact: true }).click();
  165 |   await page.getByRole("dialog").getByRole("button", { name: "Xác nhận", exact: true }).click();
  166 |   await expect(page.getByRole("dialog")).toContainText("Chưa biết kết quả lần gửi");
  167 |   await capture(page, "unknown-write-1280");
  168 |   await page.getByRole("button", { name: "Thử lại yêu cầu", exact: true }).click();
  169 |   await expect(page.getByRole("dialog")).toHaveCount(0);
  170 |   await expect(
  171 |     page.getByRole("status").filter({ hasText: "Đã phát hành phiên bản" }),
  172 |   ).toBeVisible();
  173 |   await page.getByRole("button", { name: "Thông tin", exact: true }).click();
  174 |   await page.getByLabel("Tiêu đề", { exact: true }).fill("Chưa lưu trước tải lại");
  175 |   let warned = false;
  176 |   page.once("dialog", async (dialog) => {
  177 |     warned = dialog.type() === "beforeunload";
  178 |     await dialog.dismiss();
  179 |   });
  180 |   await page.reload({ timeout: 2000 }).catch(() => undefined);
  181 |   expect(warned).toBe(true);
  182 |   await expect(page.getByLabel("Tiêu đề", { exact: true })).toHaveValue("Chưa lưu trước tải lại");
  183 |   await page.locator("summary").filter({ hasText: "Kịch bản mẫu" }).click();
  184 |   await page.getByLabel("Quyền mẫu").selectOption("reviewer");
  185 |   await page.locator("summary").filter({ hasText: "Kịch bản mẫu" }).click();
  186 |   await expect(page.getByLabel("Tiêu đề", { exact: true })).toHaveCount(0);
  187 |   await page
  188 |     .getByRole("navigation", { name: "Quản trị", exact: true })
  189 |     .getByRole("link", { name: "Về bảng làm việc", exact: true })
  190 |     .click();
  191 |   await expect(page.getByRole("heading", { name: "Bảng làm việc", exact: true })).toBeVisible();
  192 | });
  193 | 
```