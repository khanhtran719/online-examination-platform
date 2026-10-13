# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: port-05a.e2e-spec.ts >> PORT-05A loaded-only search, empty filter and URL Back retain truthful counts
- Location: e2e/port-05a.e2e-spec.ts:89:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Không có đề trong bộ lọc này' })
Expected: visible
Timeout: 12000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('heading', { name: 'Không có đề trong bộ lọc này' }) with timeout 12000ms
  - waiting for getByRole('heading', { name: 'Không có đề trong bộ lọc này' })

```

```yaml
- status: Dữ liệu mẫu. Đây không phải dữ liệu vận hành và không chứng minh bản live.
- group: Kịch bản mẫu
- link "Đi tới nội dung":
  - /url: "#content"
- complementary "Không gian làm việc":
  - link "ExamPlatform — trang chủ":
    - /url: /
  - button "Menu"
- banner:
  - link "ExamPlatform — trang chủ":
    - /url: /
    - text: ExamPlatform
  - text: Thí sinh
  - 'link "Hồ sơ: Lan Nguyễn"':
    - /url: /profile
    - text: Lan Nguyễn
  - button "Đăng xuất"
- main:
  - paragraph: KHÁM PHÁ / ĐỀ THI
  - heading "Đề thi" [level=1]
  - paragraph: Chọn đề, xem cấu trúc và lịch mở trước khi bắt đầu.
  - button "Tải lại"
  - region "Lọc đề thi":
    - text: Tìm trong các đề đã tải
    - searchbox "Tìm trong các đề đã tải"
    - text: Số dòng mỗi trang
    - combobox "Số dòng mỗi trang":
      - option "20" [selected]
      - option "100"
    - button "Xóa bộ lọc"
    - status: Hiển thị 1 trong 1 đề đã tải; tìm kiếm chỉ trong phần này.
    - button "Tất cả"
    - button "TOEIC" [pressed]
    - button "IELTS"
    - button "IT Certification"
    - button "Đại học"
    - button "Tuyển dụng"
    - button "Nội bộ"
  - list:
    - listitem:
      - text: TOEIC Phiên bản 1
      - heading "TOEIC — Reading practice" [level=2]
      - paragraph: 30 phút · 3 câu
      - term: Mở
      - definition: 22:45 12/10/2026
      - term: Đóng
      - definition: 23:45 13/10/2026
      - paragraph: Múi giờ Asia/Ho_Chi_Minh
      - paragraph: Mở sau khi có kết quả
      - link "Xem đề TOEIC — Reading practice":
        - /url: /exams/00000000-0000-4000-8000-000000000102
        - text: Xem đề
  - paragraph: Đã hết danh sách trong bộ lọc này.
- contentinfo: ExamPlatform · Vào nhịp thi
```

# Test source

```ts
  3   | 
  4   | import AxeBuilder from "@axe-core/playwright";
  5   | import { expect, test, type Page } from "playwright/test";
  6   | 
  7   | const evidence = path.resolve(
  8   |   process.env.WEB_EVIDENCE_DIR ?? "../../docs/web-ui/evidence/port-05a-2026-10-12",
  9   |   "catalog-start",
  10  | );
  11  | const exam = "00000000-0000-4000-8000-000000000102";
  12  | async function candidate(page: Page, route = "/exams") {
  13  |   await page.goto(`/login?return=${encodeURIComponent(route)}`);
  14  |   await page.getByLabel("Email").fill("candidate@example.test");
  15  |   await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("fixture-password-ok");
  16  |   await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  17  |   await page.waitForURL(`**${route}`);
  18  |   await page.evaluate(() => document.fonts.ready);
  19  | }
  20  | async function navigate(page: Page, route: string) {
  21  |   await page.evaluate((to) => {
  22  |     history.pushState(null, "", to);
  23  |     dispatchEvent(new PopStateEvent("popstate"));
  24  |   }, route);
  25  | }
  26  | async function fault(page: Page, value: string) {
  27  |   const menu = page.locator("summary").filter({ hasText: "Kịch bản mẫu" });
  28  |   await menu.click();
  29  |   await page.getByLabel("Lỗi lưu tiếp theo").selectOption(value);
  30  |   await menu.click();
  31  | }
  32  | async function capture(page: Page, name: string) {
  33  |   await mkdir(evidence, { recursive: true });
  34  |   const dialog = await page.getByRole("dialog").count();
  35  |   if (!dialog) await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  36  |   const scan = await new AxeBuilder({ page })
  37  |     .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
  38  |     .analyze();
  39  |   const state = await page.evaluate(() => ({
  40  |     width: document.documentElement.scrollWidth,
  41  |     fontLoaded: document.fonts.check('400 16px "Be Vietnam Pro"', "Câu hỏi tiếng Việt"),
  42  |   }));
  43  |   await writeFile(
  44  |     path.join(evidence, `${name}.json`),
  45  |     JSON.stringify(
  46  |       { ...state, viewport: page.viewportSize(), url: page.url(), violations: scan.violations },
  47  |       null,
  48  |       2,
  49  |     ),
  50  |   );
  51  |   await page.screenshot({ path: path.join(evidence, `${name}.png`), fullPage: !dialog });
  52  |   expect(
  53  |     scan.violations.map((violation) => ({
  54  |       id: violation.id,
  55  |       targets: violation.nodes.map((node) => node.target),
  56  |     })),
  57  |   ).toEqual([]);
  58  |   expect(state.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  59  |   expect(state.fontLoaded).toBe(true);
  60  | }
  61  | test("PORT-05A catalog, detail and start confirmation fit four Web/tablet widths", async ({
  62  |   page,
  63  | }) => {
  64  |   const errors: string[] = [];
  65  |   page.on("pageerror", (error) => errors.push(error.message));
  66  |   await candidate(page);
  67  |   for (const width of [1440, 1280, 1024, 768]) {
  68  |     await page.setViewportSize({ width, height: 1000 });
  69  |     await navigate(page, "/exams");
  70  |     await expect(page.getByRole("link", { name: /Xem đề Networking/ })).toBeVisible();
  71  |     await capture(page, `browse-${width}`);
  72  |     await navigate(page, `/exams/${exam}`);
  73  |     await page.waitForURL(`**/exams/${exam}`);
  74  |     await expect(page.getByRole("heading", { level: 1 })).toContainText("Networking");
  75  |     await expect(page.getByRole("heading", { name: "Cấu trúc từng phần thi" })).toBeVisible();
  76  |     await capture(page, `detail-${width}`);
  77  |     const trigger = page.getByRole("button", { name: "Bắt đầu", exact: true });
  78  |     await trigger.click();
  79  |     await expect(page.getByRole("dialog", { name: "Xác nhận bắt đầu" })).toContainText(
  80  |       "Phiên bản đang xem",
  81  |     );
  82  |     await capture(page, `confirmation-${width}`);
  83  |     await page.keyboard.press("Escape");
  84  |     await expect(trigger).toBeFocused();
  85  |     await expect(page.getByRole("dialog")).toHaveCount(0);
  86  |   }
  87  |   expect(errors).toEqual([]);
  88  | });
  89  | test("PORT-05A loaded-only search, empty filter and URL Back retain truthful counts", async ({
  90  |   page,
  91  | }) => {
  92  |   await page.setViewportSize({ width: 768, height: 1000 });
  93  |   await candidate(page);
  94  |   await page.getByLabel("Tìm trong các đề đã tải").fill("no-match-fixture");
  95  |   await expect(page.getByRole("heading", { name: "Không khớp trong các đề đã tải" })).toBeVisible();
  96  |   await capture(page, "loaded-search-empty-768");
  97  |   await page.getByRole("button", { name: "Xóa từ khóa", exact: true }).click();
  98  |   const toeic = page.getByRole("button", { name: "TOEIC", exact: true });
  99  |   await toeic.focus();
  100 |   await page.keyboard.press("Enter");
  101 |   await expect(toeic).toHaveAttribute("aria-pressed", "true");
  102 |   await expect(page).toHaveURL(/category=TOEIC/);
> 103 |   await expect(page.getByRole("heading", { name: "Không có đề trong bộ lọc này" })).toBeVisible();
      |                                                                                     ^ Error: expect(locator).toBeVisible() failed
  104 |   await capture(page, "category-empty-768");
  105 |   await page.goBack();
  106 |   await expect(page.getByRole("button", { name: "Tất cả", exact: true })).toHaveAttribute(
  107 |     "aria-pressed",
  108 |     "true",
  109 |   );
  110 |   await navigate(page, "/exams?category=invalid&keep=1");
  111 |   await expect(page.getByText("Bộ lọc không hợp lệ", { exact: true })).toBeVisible();
  112 |   await capture(page, "category-invalid-768");
  113 |   await page.getByRole("button", { name: "Xóa bộ lọc", exact: true }).click();
  114 |   await expect(page).toHaveURL(/keep=1/);
  115 |   await expect(page).not.toHaveURL(/category=/);
  116 | });
  117 | test("PORT-05A lost start ACK retries the same attempt; delayed start cannot be cancelled", async ({
  118 |   page,
  119 | }) => {
  120 |   await page.setViewportSize({ width: 768, height: 1000 });
  121 |   await candidate(page, `/exams/${exam}`);
  122 |   await fault(page, "lose-ack");
  123 |   await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
  124 |   await page.getByRole("dialog").getByRole("button", { name: "Bắt đầu", exact: true }).click();
  125 |   await expect(page.getByText("Chưa nhận được xác nhận", { exact: true })).toBeVisible();
  126 |   await expect(
  127 |     page.getByRole("dialog").getByRole("button", { name: "Chưa bắt đầu" }),
  128 |   ).toBeDisabled();
  129 |   await page.keyboard.press("Escape");
  130 |   await expect(page.getByRole("dialog")).toBeVisible();
  131 |   await capture(page, "start-unknown-768");
  132 |   await page.getByRole("button", { name: "Thử lại cùng yêu cầu" }).click();
  133 |   await expect(page.getByRole("button", { name: "Câu sau", exact: true })).toBeEnabled();
  134 |   const acceptedUrl = page.url();
  135 |   await navigate(page, `/exams/${exam}`);
  136 |   await expect(page.getByRole("heading", { name: "Cấu trúc từng phần thi" })).toBeVisible();
  137 |   await fault(page, "delay-ack");
  138 |   await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
  139 |   await page.getByRole("dialog").getByRole("button", { name: "Bắt đầu", exact: true }).click();
  140 |   await expect(page.getByRole("button", { name: "Đang bắt đầu…" })).toBeDisabled();
  141 |   await page.keyboard.press("Escape");
  142 |   await expect(page.getByRole("dialog")).toBeVisible();
  143 |   await capture(page, "start-pending-768");
  144 |   await expect(page).toHaveURL(acceptedUrl);
  145 |   await expect(page.getByRole("button", { name: "Câu sau", exact: true })).toBeEnabled();
  146 | });
  147 | 
```