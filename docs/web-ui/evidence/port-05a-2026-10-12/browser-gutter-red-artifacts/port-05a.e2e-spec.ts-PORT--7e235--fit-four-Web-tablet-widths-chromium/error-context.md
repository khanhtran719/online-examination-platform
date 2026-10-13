# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: port-05a.e2e-spec.ts >> PORT-05A catalog, detail and start confirmation fit four Web/tablet widths
- Location: e2e/port-05a.e2e-spec.ts:65:1

# Error details

```
Error: expect(received).toBeLessThanOrEqual(expected)

Expected: <= 1424
Received:    1440
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - status [ref=e4]: Dữ liệu mẫu. Đây không phải dữ liệu vận hành và không chứng minh bản live.
    - group [ref=e5]:
      - generic "Kịch bản mẫu" [ref=e6] [cursor=pointer]
      - option "Thí sinh" [selected]
      - option "Người xem báo cáo"
      - option "Quản trị"
      - option "Bình thường" [selected]
      - option "Trễ ACK 5 giây"
      - option "Mất ACK sau khi đã ghi"
      - option "Xung đột phiên bản"
      - option "Giới hạn lưu"
      - option "Máy chủ bận khi lưu"
      - option "Mất kết quả refresh"
  - generic [ref=e7]:
    - link "Đi tới nội dung" [ref=e8] [cursor=pointer]:
      - /url: "#content"
    - complementary "Không gian làm việc" [ref=e9]:
      - link "ExamPlatform — trang chủ" [ref=e10] [cursor=pointer]:
        - /url: /
      - navigation "Chính" [ref=e15]:
        - link "Bảng làm việc" [ref=e16] [cursor=pointer]:
          - /url: /dashboard
        - link "Đề thi" [ref=e20] [cursor=pointer]:
          - /url: /exams
        - link "Lịch sử" [ref=e24] [cursor=pointer]:
          - /url: /history
        - link "Hồ sơ" [ref=e28] [cursor=pointer]:
          - /url: /profile
      - link "Trợ giúp" [ref=e33] [cursor=pointer]:
        - /url: /help
    - generic [ref=e37]:
      - banner [ref=e38]:
        - generic [ref=e39]:
          - link "ExamPlatform — trang chủ" [ref=e40] [cursor=pointer]:
            - /url: /
            - generic [ref=e41]: ExamPlatform
          - generic [ref=e42]: Thí sinh
        - generic [ref=e43]:
          - 'link "Hồ sơ: Lan Nguyễn" [ref=e44] [cursor=pointer]':
            - /url: /profile
            - generic [aria-hidden] [ref=e45]: LN
            - generic [ref=e46]: Lan Nguyễn
          - button "Đăng xuất" [ref=e47] [cursor=pointer]
      - main [ref=e48]:
        - generic [ref=e49]:
          - generic [ref=e50]:
            - generic [ref=e51]:
              - paragraph [ref=e52]: KHÁM PHÁ / ĐỀ THI
              - heading "Đề thi" [level=1] [ref=e53]
              - paragraph [ref=e54]: Chọn đề, xem cấu trúc và lịch mở trước khi bắt đầu.
            - button "Tải lại" [ref=e55] [cursor=pointer]
          - region "Lọc đề thi" [ref=e56]:
            - generic [ref=e57]:
              - generic [ref=e58]:
                - generic [ref=e59]: Tìm trong các đề đã tải
                - searchbox "Tìm trong các đề đã tải" [ref=e60]
              - generic [ref=e61]:
                - generic [ref=e62]: Số dòng mỗi trang
                - combobox "Số dòng mỗi trang" [ref=e63]:
                  - option "20" [selected]
                  - option "100"
              - button "Xóa bộ lọc" [disabled] [ref=e64]
            - status [ref=e65]: Hiển thị 3 trong 3 đề đã tải; tìm kiếm chỉ trong phần này.
            - generic [ref=e66]:
              - button "Tất cả" [pressed] [ref=e67] [cursor=pointer]
              - button "TOEIC" [ref=e68] [cursor=pointer]
              - button "IELTS" [ref=e69] [cursor=pointer]
              - button "IT Certification" [ref=e70] [cursor=pointer]
              - button "Đại học" [ref=e71] [cursor=pointer]
              - button "Tuyển dụng" [ref=e72] [cursor=pointer]
              - button "Nội bộ" [ref=e73] [cursor=pointer]
          - list [ref=e74]:
            - listitem [ref=e75]:
              - generic [ref=e76]:
                - generic [ref=e77]: IT Certification
                - generic [ref=e78]: Phiên bản 1
              - heading "IT Certification — Networking Fundamentals" [level=2] [ref=e79]
              - paragraph [ref=e80]: 45 phút · 6 câu
              - generic [ref=e81]:
                - generic [ref=e82]:
                  - term [ref=e83]: Mở
                  - definition [ref=e84]: 22:48 12/10/2026
                - generic [ref=e85]:
                  - term [ref=e86]: Đóng
                  - definition [ref=e87]: 01:48 13/10/2026
              - paragraph [ref=e88]: Múi giờ Asia/Ho_Chi_Minh
              - paragraph [ref=e89]: Không mở đáp án
              - link "Xem đề IT Certification — Networking Fundamentals" [ref=e90] [cursor=pointer]:
                - /url: /exams/00000000-0000-4000-8000-000000000101
                - text: Xem đề
                - generic [aria-hidden] [ref=e91]: →
            - listitem [ref=e92]:
              - generic [ref=e93]:
                - generic [ref=e94]: TOEIC
                - generic [ref=e95]: Phiên bản 1
              - heading "TOEIC — Reading practice" [level=2] [ref=e96]
              - paragraph [ref=e97]: 30 phút · 3 câu
              - generic [ref=e98]:
                - generic [ref=e99]:
                  - term [ref=e100]: Mở
                  - definition [ref=e101]: 22:48 12/10/2026
                - generic [ref=e102]:
                  - term [ref=e103]: Đóng
                  - definition [ref=e104]: 23:48 13/10/2026
              - paragraph [ref=e105]: Múi giờ Asia/Ho_Chi_Minh
              - paragraph [ref=e106]: Mở sau khi có kết quả
              - link "Xem đề TOEIC — Reading practice" [ref=e107] [cursor=pointer]:
                - /url: /exams/00000000-0000-4000-8000-000000000102
                - text: Xem đề
                - generic [aria-hidden] [ref=e108]: →
            - listitem [ref=e109]:
              - generic [ref=e110]:
                - generic [ref=e111]: Đại học
                - generic [ref=e112]: Phiên bản 1
              - heading "Đại học — Toán cơ bản dành cho kỳ kiểm tra giữa kỳ với tiêu đề rất dài" [level=2] [ref=e113]
              - paragraph [ref=e114]: 45 phút · 1 câu
              - generic [ref=e115]:
                - generic [ref=e116]:
                  - term [ref=e117]: Mở
                  - definition [ref=e118]: 22:48 12/10/2026
                - generic [ref=e119]:
                  - term [ref=e120]: Đóng
                  - definition [ref=e121]: 00:03 13/10/2026
              - paragraph [ref=e122]: Múi giờ Asia/Ho_Chi_Minh
              - paragraph [ref=e123]: Mở sau khi đề đóng
              - link "Xem đề Đại học — Toán cơ bản dành cho kỳ kiểm tra giữa kỳ với tiêu đề rất dài" [ref=e124] [cursor=pointer]:
                - /url: /exams/00000000-0000-4000-8000-000000000103
                - text: Xem đề
                - generic [aria-hidden] [ref=e125]: →
          - paragraph [ref=e126]: Đã hết danh sách trong bộ lọc này.
      - contentinfo [ref=e127]: ExamPlatform · Vào nhịp thi
```

# Test source

```ts
  1   | import { mkdir, writeFile } from "node:fs/promises";
  2   | import path from "node:path";
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
  41  |     contentLeft: document.querySelector("main > div")!.getBoundingClientRect().left,
  42  |     contentRight: document.querySelector("main > div")!.getBoundingClientRect().right,
  43  |     fontLoaded: document.fonts.check('400 16px "Be Vietnam Pro"', "Câu hỏi tiếng Việt"),
  44  |   }));
  45  |   await writeFile(
  46  |     path.join(evidence, `${name}.json`),
  47  |     JSON.stringify(
  48  |       { ...state, viewport: page.viewportSize(), url: page.url(), violations: scan.violations },
  49  |       null,
  50  |       2,
  51  |     ),
  52  |   );
  53  |   await page.screenshot({ path: path.join(evidence, `${name}.png`), fullPage: !dialog });
  54  |   expect(
  55  |     scan.violations.map((violation) => ({
  56  |       id: violation.id,
  57  |       targets: violation.nodes.map((node) => node.target),
  58  |     })),
  59  |   ).toEqual([]);
  60  |   expect(state.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  61  |   expect(state.fontLoaded).toBe(true);
  62  |   expect(state.contentLeft).toBeGreaterThanOrEqual(16);
> 63  |   expect(state.contentRight).toBeLessThanOrEqual(page.viewportSize()!.width - 16);
      |                              ^ Error: expect(received).toBeLessThanOrEqual(expected)
  64  | }
  65  | test("PORT-05A catalog, detail and start confirmation fit four Web/tablet widths", async ({
  66  |   page,
  67  | }) => {
  68  |   const errors: string[] = [];
  69  |   page.on("pageerror", (error) => errors.push(error.message));
  70  |   await candidate(page);
  71  |   for (const width of [1440, 1280, 1024, 768]) {
  72  |     await page.setViewportSize({ width, height: 1000 });
  73  |     await navigate(page, "/exams");
  74  |     await expect(
  75  |       page.getByRole("link", {
  76  |         name: "Xem đề IT Certification — Networking Fundamentals",
  77  |         exact: true,
  78  |       }),
  79  |     ).toBeVisible();
  80  |     await capture(page, `browse-${width}`);
  81  |     await navigate(page, `/exams/${exam}`);
  82  |     await page.waitForURL(`**/exams/${exam}`);
  83  |     await expect(page.getByRole("heading", { level: 1 })).toHaveText("TOEIC — Reading practice");
  84  |     await expect(page.getByRole("heading", { name: "Cấu trúc từng phần thi" })).toBeVisible();
  85  |     await capture(page, `detail-${width}`);
  86  |     const trigger = page.getByRole("button", { name: "Bắt đầu", exact: true });
  87  |     await trigger.click();
  88  |     await expect(page.getByRole("dialog", { name: "Xác nhận bắt đầu" })).toContainText(
  89  |       "Phiên bản đang xem",
  90  |     );
  91  |     await capture(page, `confirmation-${width}`);
  92  |     await page.keyboard.press("Escape");
  93  |     await expect(trigger).toBeFocused();
  94  |     await expect(page.getByRole("dialog")).toHaveCount(0);
  95  |   }
  96  |   expect(errors).toEqual([]);
  97  | });
  98  | test("PORT-05A loaded-only search, empty filter and URL Back retain truthful counts", async ({
  99  |   page,
  100 | }) => {
  101 |   await page.setViewportSize({ width: 768, height: 1000 });
  102 |   await candidate(page);
  103 |   await page.getByLabel("Tìm trong các đề đã tải").fill("no-match-fixture");
  104 |   await expect(page.getByRole("heading", { name: "Không khớp trong các đề đã tải" })).toBeVisible();
  105 |   await capture(page, "loaded-search-empty-768");
  106 |   await page.getByRole("button", { name: "Xóa từ khóa", exact: true }).click();
  107 |   const emptyCategory = page.getByRole("button", { name: "IELTS", exact: true });
  108 |   await emptyCategory.focus();
  109 |   await page.keyboard.press("Enter");
  110 |   await expect(emptyCategory).toHaveAttribute("aria-pressed", "true");
  111 |   await expect(page).toHaveURL(/category=IELTS/);
  112 |   await expect(page.getByRole("heading", { name: "Không có đề trong bộ lọc này" })).toBeVisible();
  113 |   await capture(page, "category-empty-768");
  114 |   await page.goBack();
  115 |   await expect(page.getByRole("button", { name: "Tất cả", exact: true })).toHaveAttribute(
  116 |     "aria-pressed",
  117 |     "true",
  118 |   );
  119 |   await navigate(page, "/exams?category=invalid&keep=1");
  120 |   await expect(page.getByText("Bộ lọc không hợp lệ", { exact: true })).toBeVisible();
  121 |   await capture(page, "category-invalid-768");
  122 |   await page.getByRole("button", { name: "Xóa bộ lọc", exact: true }).click();
  123 |   await expect(page).toHaveURL(/keep=1/);
  124 |   await expect(page).not.toHaveURL(/category=/);
  125 | });
  126 | test("PORT-05A lost start ACK retries the same attempt; delayed start cannot be cancelled", async ({
  127 |   page,
  128 | }) => {
  129 |   await page.setViewportSize({ width: 768, height: 1000 });
  130 |   await candidate(page, `/exams/${exam}`);
  131 |   await fault(page, "lose-ack");
  132 |   await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
  133 |   await page.getByRole("dialog").getByRole("button", { name: "Bắt đầu", exact: true }).click();
  134 |   await expect(page.getByText("Chưa nhận được xác nhận", { exact: true })).toBeVisible();
  135 |   await expect(
  136 |     page.getByRole("dialog").getByRole("button", { name: "Chưa bắt đầu" }),
  137 |   ).toBeDisabled();
  138 |   await page.keyboard.press("Escape");
  139 |   await expect(page.getByRole("dialog")).toBeVisible();
  140 |   await capture(page, "start-unknown-768");
  141 |   await page.getByRole("button", { name: "Thử lại cùng yêu cầu" }).click();
  142 |   await expect(page.getByRole("button", { name: "Câu sau", exact: true })).toBeEnabled();
  143 |   const acceptedUrl = page.url();
  144 |   await navigate(page, `/exams/${exam}`);
  145 |   await expect(page.getByRole("heading", { name: "Cấu trúc từng phần thi" })).toBeVisible();
  146 |   await fault(page, "delay-ack");
  147 |   await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
  148 |   await page.getByRole("dialog").getByRole("button", { name: "Bắt đầu", exact: true }).click();
  149 |   await expect(page.getByRole("button", { name: "Đang bắt đầu…" })).toBeDisabled();
  150 |   await page.keyboard.press("Escape");
  151 |   await expect(page.getByRole("dialog")).toBeVisible();
  152 |   await capture(page, "start-pending-768");
  153 |   await expect(page).toHaveURL(acceptedUrl);
  154 |   await expect(page.getByRole("button", { name: "Câu sau", exact: true })).toBeEnabled();
  155 | });
  156 | 
```