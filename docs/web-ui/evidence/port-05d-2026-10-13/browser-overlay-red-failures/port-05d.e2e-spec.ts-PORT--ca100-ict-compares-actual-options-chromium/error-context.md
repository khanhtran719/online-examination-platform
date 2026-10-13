# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: port-05d.e2e-spec.ts >> PORT-05D delayed ACK retains newer choice, retries wait and conflict compares actual options
- Location: e2e/port-05d.e2e-spec.ts:140:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 1280
Received: 840
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
      - option "Bình thường"
      - option "Trễ ACK 5 giây"
      - option "Mất ACK sau khi đã ghi"
      - option "Xung đột phiên bản" [selected]
      - option "Giới hạn lưu"
      - option "Máy chủ bận khi lưu"
      - option "Mất kết quả refresh"
  - generic [ref=e7]:
    - link "Đi tới nội dung" [ref=e8] [cursor=pointer]:
      - /url: "#content"
    - banner [ref=e9]:
      - generic [ref=e10]:
        - generic [ref=e11]:
          - strong [ref=e16]: ExamPlatform
          - button "Rời phòng thi" [ref=e17] [cursor=pointer]
        - status [ref=e18]:
          - generic [aria-hidden] [ref=e19]: "!"
          - text: Đáp án đã thay đổi ở tab khác
        - generic [ref=e20]:
          - generic [ref=e21]: Thời gian còn lại
          - paragraph [ref=e22]: 29:48
        - button "Nộp bài" [ref=e23] [cursor=pointer]
      - generic [ref=e24]:
        - paragraph [ref=e25]: Đã trả lời 1 trên 3 câu đã tải. Phiên bản này có 3 câu; câu chưa tải không tính là bỏ trống.
        - progressbar "Câu đã trả lời trong phần đã tải" [ref=e26]
    - main [ref=e27]:
      - generic [ref=e28]:
        - generic [ref=e29]:
          - generic [ref=e30]:
            - paragraph [ref=e31]: LÀM BÀI · PHIÊN BẢN ĐÃ KHÓA
            - heading "TOEIC — Reading practice" [level=1] [ref=e32]
            - paragraph [ref=e33]: Hạn nộp 10:48 13/10/2026 · Giờ Việt Nam UTC+7
          - article [ref=e34]:
            - paragraph [ref=e35]: Câu 1 · Một lựa chọn · 2 điểm
            - heading "Choose the best word." [level=2] [ref=e36]
            - group "Chọn một đáp án bạn cho là đúng." [ref=e37]:
              - generic [ref=e39]:
                - radio "accurate" [disabled] [ref=e40]
                - generic [aria-hidden] [ref=e41]: A
                - generic [ref=e42]: accurate
              - generic [ref=e43]:
                - radio "late" [checked] [disabled] [ref=e44]
                - generic [aria-hidden] [ref=e45]: B
                - generic [ref=e46]: late
                - generic [aria-hidden] [ref=e47]: ✓ Đã chọn
              - generic [ref=e48]:
                - radio "empty" [disabled] [ref=e49]
                - generic [aria-hidden] [ref=e50]: C
                - generic [ref=e51]: empty
            - generic [ref=e52]:
              - generic [ref=e53]:
                - checkbox "Đánh dấu để xem lại" [disabled] [ref=e54]
                - generic [aria-hidden] [ref=e55]: ⚑
                - text: Đánh dấu để xem lại
              - button "Xóa đáp án" [disabled] [ref=e56]
          - generic [ref=e57]:
            - button "Câu trước" [disabled] [ref=e58]
            - button "Câu sau" [ref=e59] [cursor=pointer]
          - paragraph [ref=e60]:
            - text: Chỉ đáp án được máy chủ xác nhận mới được ghi nhận.
            - link "Xem trạng thái xử lý" [ref=e61] [cursor=pointer]:
              - /url: /attempts/01a13344-a7f6-7007-9357-0a6ac6443cef/status
        - complementary "Phiếu câu hỏi" [ref=e62]:
          - generic [ref=e63]:
            - heading "Phiếu câu hỏi" [level=2] [ref=e64]
            - generic [ref=e65]: 3 đã tải
          - generic [ref=e66]:
            - list "Chú giải phiếu" [ref=e67]:
              - listitem [ref=e68]: ○ Chưa trả lời
              - listitem [ref=e69]: ✓ Đã trả lời
              - listitem [ref=e70]: ⚑ Đánh dấu
              - listitem [ref=e71]: ⋯ Chưa lưu
              - listitem [ref=e72]: ▣ Đang chọn
              - listitem [ref=e73]: "? Chưa tải đáp án"
            - generic [ref=e74]:
              - checkbox "Chỉ xem câu đánh dấu" [ref=e75]
              - text: Chỉ xem câu đánh dấu
            - generic [ref=e76]:
              - button "Reading" [ref=e77] [cursor=pointer]
              - button "Vocabulary" [ref=e78] [cursor=pointer]
            - generic [ref=e79]:
              - heading "Reading" [level=3] [ref=e80]
              - generic [ref=e81]:
                - button "Câu 1, Đang chọn, Chưa lưu, Đã trả lời" [ref=e82] [cursor=pointer]:
                  - text: "1"
                  - generic [aria-hidden] [ref=e83]: ⋯
                - button "Câu 2, Chưa trả lời" [ref=e84] [cursor=pointer]: "2"
            - generic [ref=e85]:
              - heading "Vocabulary" [level=3] [ref=e86]
              - button "Câu 3, Chưa trả lời" [ref=e88] [cursor=pointer]: "3"
          - paragraph [ref=e89]: Đánh dấu câu bạn muốn xem lại. Lựa chọn chưa được lưu sẽ có ký hiệu ⋯.
    - dialog [ref=e91]:
      - heading "Đáp án đã thay đổi ở nơi khác" [level=2] [ref=e92]
      - paragraph [ref=e93]: Lựa chọn của bạn được giữ trên trang. So sánh với bản mới nhất trước khi quyết định.
      - list [ref=e94]:
        - listitem [ref=e95]:
          - heading "Câu 1" [level=3] [ref=e96]
          - generic [ref=e97]:
            - generic [ref=e98]:
              - term [ref=e99]: Lựa chọn của bạn
              - definition [ref=e100]: late · Không đánh dấu
            - generic [ref=e101]:
              - term [ref=e102]: Bản máy chủ
              - definition [ref=e103]: accurate · Không đánh dấu · Bản 4
      - generic [ref=e104]:
        - button "Dùng bản máy chủ" [active] [ref=e105] [cursor=pointer]
        - button "Giữ lựa chọn của tôi" [ref=e106] [cursor=pointer]
        - button "Tải lại bản mới nhất" [ref=e107] [cursor=pointer]
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
  8   |   process.env.WEB_EVIDENCE_DIR ?? "../../docs/web-ui/evidence/port-05d-2026-10-13",
  9   |   "exam-room",
  10  | );
  11  | const exam = "00000000-0000-4000-8000-000000000102";
  12  | async function start(page: Page) {
  13  |   await page.goto(`/login?return=${encodeURIComponent(`/exams/${exam}`)}`);
  14  |   await page.getByLabel("Email").fill("candidate@example.test");
  15  |   await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("fixture-password-ok");
  16  |   await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  17  |   await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
  18  |   await page.getByRole("dialog").getByRole("button", { name: "Bắt đầu", exact: true }).click();
  19  |   await expect(page.getByRole("heading", { name: "Choose the best word." })).toBeVisible();
  20  |   await page.evaluate(() => document.fonts.ready);
  21  | }
  22  | async function fault(page: Page, value: string) {
  23  |   const menu = page.locator("summary").filter({ hasText: "Kịch bản mẫu" });
  24  |   await menu.click();
  25  |   await page.getByLabel("Lỗi lưu tiếp theo").selectOption(value);
  26  |   await menu.click();
  27  | }
  28  | async function saved(page: Page) {
  29  |   await expect(page.getByRole("status").filter({ hasText: "Đã lưu lúc" })).toBeVisible();
  30  | }
  31  | async function capture(page: Page, name: string) {
  32  |   await mkdir(evidence, { recursive: true });
  33  |   const scan = await new AxeBuilder({ page })
  34  |     .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
  35  |     .analyze();
  36  |   const state = await page.evaluate(() => {
  37  |     const content = document.querySelector("main > div")!.getBoundingClientRect();
  38  |     const dialog = document.querySelector('[role="dialog"]');
  39  |     const dialogBounds = dialog?.getBoundingClientRect();
  40  |     const backdropBounds = dialog?.parentElement?.getBoundingClientRect();
  41  |     return {
  42  |       width: document.documentElement.scrollWidth,
  43  |       left: content.left,
  44  |       right: content.right,
  45  |       fontLoaded: document.fonts.check('400 16px "Be Vietnam Pro"', "Phòng thi tiếng Việt"),
  46  |       dialog:
  47  |         dialogBounds && backdropBounds
  48  |           ? {
  49  |               left: dialogBounds.left,
  50  |               width: dialogBounds.width,
  51  |               backdropLeft: backdropBounds.left,
  52  |               backdropWidth: backdropBounds.width,
  53  |               backdropHeight: backdropBounds.height,
  54  |             }
  55  |           : null,
  56  |     };
  57  |   });
  58  |   await writeFile(
  59  |     path.join(evidence, `${name}.json`),
  60  |     JSON.stringify(
  61  |       { ...state, viewport: page.viewportSize(), url: page.url(), violations: scan.violations },
  62  |       null,
  63  |       2,
  64  |     ),
  65  |   );
  66  |   await page.screenshot({
  67  |     path: path.join(evidence, `${name}.png`),
  68  |     fullPage: (await page.getByRole("dialog").count()) === 0,
  69  |   });
  70  |   expect(scan.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }))).toEqual(
  71  |     [],
  72  |   );
  73  |   expect(state.fontLoaded).toBe(true);
  74  |   expect(state.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  75  |   expect(state.left).toBeGreaterThanOrEqual(16);
  76  |   expect(state.right).toBeLessThanOrEqual(page.viewportSize()!.width - 16);
  77  |   if (state.dialog) {
  78  |     expect(state.dialog.backdropLeft).toBe(0);
> 79  |     expect(state.dialog.backdropWidth).toBe(page.viewportSize()!.width);
      |                                        ^ Error: expect(received).toBe(expected) // Object.is equality
  80  |     expect(state.dialog.backdropHeight).toBe(page.viewportSize()!.height);
  81  |     expect(
  82  |       Math.abs(state.dialog.left + state.dialog.width / 2 - page.viewportSize()!.width / 2),
  83  |     ).toBeLessThanOrEqual(1);
  84  |   }
  85  | }
  86  | test("PORT-05D three native question types, save receipts, tablet sheet and submit confirmation", async ({
  87  |   page,
  88  | }) => {
  89  |   const errors: string[] = [];
  90  |   page.on("pageerror", (error) => errors.push(error.message));
  91  |   await page.setViewportSize({ width: 1440, height: 1100 });
  92  |   await start(page);
  93  |   for (const width of [768, 1024, 1280, 1440]) {
  94  |     await page.setViewportSize({ width, height: 1100 });
  95  |     await page.getByRole("radio", { name: "accurate", exact: true }).check();
  96  |     await saved(page);
  97  |     await capture(page, `room-single-${width}`);
  98  |     const next = page.getByRole("button", { name: "Câu sau", exact: true });
  99  |     await next.focus();
  100 |     await page.keyboard.press("Enter");
  101 |     await expect(page.getByRole("heading", { name: "The invoice was paid." })).toBeFocused();
  102 |     await page.getByRole("radio", { name: "Sai", exact: true }).check();
  103 |     await saved(page);
  104 |     await capture(page, `room-true-false-${width}`);
  105 |     await next.click();
  106 |     await page.getByRole("checkbox", { name: "meeting", exact: true }).check();
  107 |     await page.getByRole("checkbox", { name: "report", exact: true }).check();
  108 |     await page.getByRole("checkbox", { name: "Đánh dấu để xem lại" }).check();
  109 |     await saved(page);
  110 |     await capture(page, `room-multiple-${width}`);
  111 |     if (width <= 1024) {
  112 |       const sheet = page.getByRole("button", { name: "Danh sách câu hỏi", exact: true });
  113 |       await sheet.click();
  114 |       await page
  115 |         .getByRole("dialog")
  116 |         .getByRole("checkbox", { name: "Chỉ xem câu đánh dấu" })
  117 |         .check();
  118 |       await expect(page.getByRole("dialog").getByRole("button", { name: /Câu 3,/ })).toBeVisible();
  119 |       await capture(page, `room-sheet-${width}`);
  120 |       await page.keyboard.press("Escape");
  121 |       await expect(sheet).toBeFocused();
  122 |     }
  123 |     await page.getByRole("button", { name: "Nộp bài", exact: true }).click();
  124 |     await expect(page.getByRole("dialog")).toContainText("Sau khi nộp, bạn không thể sửa đáp án");
  125 |     await capture(page, `room-confirm-${width}`);
  126 |     await page.getByRole("button", { name: "Chưa nộp", exact: true }).click();
  127 |     const previous = page.getByRole("button", { name: "Câu trước", exact: true });
  128 |     await previous.click();
  129 |     await previous.click();
  130 |   }
  131 |   await page.getByRole("button", { name: "Nộp bài", exact: true }).click();
  132 |   await page.getByRole("button", { name: "Nộp các đáp án đã lưu", exact: true }).click();
  133 |   await page.waitForURL("**/status");
  134 |   await page.getByRole("link", { name: "Xem kết quả", exact: true }).click();
  135 |   await expect(page.getByRole("region", { name: "Điểm bài thi", exact: true })).toContainText(
  136 |     /6\s*\/6 điểm/,
  137 |   );
  138 |   expect(errors).toEqual([]);
  139 | });
  140 | test("PORT-05D delayed ACK retains newer choice, retries wait and conflict compares actual options", async ({
  141 |   page,
  142 | }) => {
  143 |   await page.setViewportSize({ width: 1280, height: 1100 });
  144 |   await start(page);
  145 |   await fault(page, "delay-ack");
  146 |   await page.getByRole("radio", { name: "accurate", exact: true }).check();
  147 |   await expect(page.getByRole("status").filter({ hasText: "Đang lưu…" })).toBeVisible();
  148 |   await page.getByRole("radio", { name: "late", exact: true }).check();
  149 |   await capture(page, "room-saving-newer-intent-1280");
  150 |   await saved(page);
  151 |   await expect(page.getByRole("radio", { name: "late", exact: true })).toBeChecked();
  152 |   await fault(page, "save-429");
  153 |   await page.getByRole("radio", { name: "accurate", exact: true }).check();
  154 |   await expect(page.getByRole("status").filter({ hasText: "Đang thử lưu lại" })).toBeVisible();
  155 |   await capture(page, "room-retry-1280");
  156 |   await saved(page);
  157 |   await fault(page, "conflict-save");
  158 |   await page.getByRole("radio", { name: "late", exact: true }).check();
  159 |   const conflict = page.getByRole("dialog", { name: "Đáp án đã thay đổi ở nơi khác" });
  160 |   await expect(conflict).toContainText("late");
  161 |   await expect(conflict).toContainText("accurate");
  162 |   await expect(page.getByRole("button", { name: "Dùng bản máy chủ" })).toBeEnabled();
  163 |   await capture(page, "room-conflict-1280");
  164 |   await page.getByRole("button", { name: "Giữ lựa chọn của tôi" }).click();
  165 |   await saved(page);
  166 |   await expect(page.getByRole("radio", { name: "late", exact: true })).toBeChecked();
  167 | });
  168 | test("PORT-05D a lost submit ACK stays unknown until durable synthetic status is checked", async ({
  169 |   page,
  170 | }) => {
  171 |   await page.setViewportSize({ width: 1024, height: 1100 });
  172 |   await start(page);
  173 |   await page.getByRole("radio", { name: "accurate", exact: true }).check();
  174 |   await saved(page);
  175 |   await fault(page, "lose-ack");
  176 |   await page.getByRole("button", { name: "Nộp bài", exact: true }).click();
  177 |   await page.getByRole("button", { name: "Nộp các đáp án đã lưu", exact: true }).click();
  178 |   await expect(page.getByText("Chưa xác nhận đã nộp", { exact: true })).toBeVisible();
  179 |   await expect(page.getByRole("radio").first()).toBeDisabled();
```