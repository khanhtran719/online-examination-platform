# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: port-05d.e2e-spec.ts >> PORT-05D three native question types, save receipts, tablet sheet and submit confirmation
- Location: e2e/port-05d.e2e-spec.ts:65:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('dialog').getByRole('button', { name: /Câu 3,/ })
Expected: visible
Timeout: 12000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('dialog').getByRole('button', { name: /Câu 3,/ }) with timeout 12000ms
  - waiting for getByRole('dialog').getByRole('button', { name: /Câu 3,/ })

```

```yaml
- status: Dữ liệu mẫu. Đây không phải dữ liệu vận hành và không chứng minh bản live.
- group: Kịch bản mẫu
- link "Đi tới nội dung":
  - /url: "#content"
- banner:
  - strong: ExamPlatform
  - button "Rời phòng thi"
  - status: Đã lưu lúc 09:56:56
  - text: Thời gian còn lại
  - paragraph: 29:43
  - button "Nộp bài"
  - paragraph: Đã trả lời 3 trên 3 câu đã tải. Phiên bản này có 3 câu; câu chưa tải không tính là bỏ trống.
  - progressbar "Câu đã trả lời trong phần đã tải"
- main:
  - paragraph: LÀM BÀI · PHIÊN BẢN ĐÃ KHÓA
  - heading "TOEIC — Reading practice" [level=1]
  - paragraph: Hạn nộp 10:26 13/10/2026 · Giờ Việt Nam UTC+7
  - article "Select the nouns.":
    - paragraph: Câu 1 · Nhiều lựa chọn · 2 điểm
    - heading "Select the nouns." [level=2]
    - group "Chọn các đáp án bạn cho là đúng.":
      - text: Chọn các đáp án bạn cho là đúng.
      - checkbox "meeting" [checked]
      - text: meeting
      - checkbox "quickly"
      - text: quickly
      - checkbox "report" [checked]
      - text: report
    - checkbox "Đánh dấu để xem lại" [checked]
    - text: Đánh dấu để xem lại
    - button "Xóa đáp án"
  - button "Câu trước"
  - button "Câu sau" [disabled]
  - button "Danh sách câu hỏi"
  - paragraph:
    - text: Chỉ đáp án được máy chủ xác nhận mới được ghi nhận.
    - link "Xem trạng thái xử lý":
      - /url: /attempts/01a13331-03e1-73e0-b16d-c3d1d76bc9f3/status
- dialog "Phiếu câu hỏi":
  - heading "Phiếu câu hỏi" [level=2]
  - list "Chú giải phiếu":
    - listitem: Chưa trả lời
    - listitem: Đã trả lời
    - listitem: Đánh dấu
    - listitem: Chưa lưu
    - listitem: Đang chọn
    - listitem: Chưa tải đáp án
  - checkbox "Chỉ xem câu đánh dấu" [checked]
  - text: Chỉ xem câu đánh dấu
  - button "Reading"
  - button "Vocabulary"
  - heading "Vocabulary" [level=3]
  - button "Câu 1, Đang chọn, Đánh dấu, Đã trả lời": "1"
  - button "Đóng hộp thoại": ×
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
  38  |     return {
  39  |       width: document.documentElement.scrollWidth,
  40  |       left: content.left,
  41  |       right: content.right,
  42  |       fontLoaded: document.fonts.check('400 16px "Be Vietnam Pro"', "Phòng thi tiếng Việt"),
  43  |     };
  44  |   });
  45  |   await writeFile(
  46  |     path.join(evidence, `${name}.json`),
  47  |     JSON.stringify(
  48  |       { ...state, viewport: page.viewportSize(), url: page.url(), violations: scan.violations },
  49  |       null,
  50  |       2,
  51  |     ),
  52  |   );
  53  |   await page.screenshot({
  54  |     path: path.join(evidence, `${name}.png`),
  55  |     fullPage: (await page.getByRole("dialog").count()) === 0,
  56  |   });
  57  |   expect(scan.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }))).toEqual(
  58  |     [],
  59  |   );
  60  |   expect(state.fontLoaded).toBe(true);
  61  |   expect(state.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  62  |   expect(state.left).toBeGreaterThanOrEqual(16);
  63  |   expect(state.right).toBeLessThanOrEqual(page.viewportSize()!.width - 16);
  64  | }
  65  | test("PORT-05D three native question types, save receipts, tablet sheet and submit confirmation", async ({
  66  |   page,
  67  | }) => {
  68  |   const errors: string[] = [];
  69  |   page.on("pageerror", (error) => errors.push(error.message));
  70  |   await page.setViewportSize({ width: 1440, height: 1100 });
  71  |   await start(page);
  72  |   for (const width of [768, 1024, 1280, 1440]) {
  73  |     await page.setViewportSize({ width, height: 1100 });
  74  |     await page.getByRole("radio", { name: "accurate", exact: true }).check();
  75  |     await saved(page);
  76  |     await capture(page, `room-single-${width}`);
  77  |     const next = page.getByRole("button", { name: "Câu sau", exact: true });
  78  |     await next.focus();
  79  |     await page.keyboard.press("Enter");
  80  |     await expect(page.getByRole("heading", { name: "The invoice was paid." })).toBeFocused();
  81  |     await page.getByRole("radio", { name: "Sai", exact: true }).check();
  82  |     await saved(page);
  83  |     await capture(page, `room-true-false-${width}`);
  84  |     await next.click();
  85  |     await page.getByRole("checkbox", { name: "meeting", exact: true }).check();
  86  |     await page.getByRole("checkbox", { name: "report", exact: true }).check();
  87  |     await page.getByRole("checkbox", { name: "Đánh dấu để xem lại" }).check();
  88  |     await saved(page);
  89  |     await capture(page, `room-multiple-${width}`);
  90  |     if (width <= 1024) {
  91  |       const sheet = page.getByRole("button", { name: "Danh sách câu hỏi", exact: true });
  92  |       await sheet.click();
  93  |       await page
  94  |         .getByRole("dialog")
  95  |         .getByRole("checkbox", { name: "Chỉ xem câu đánh dấu" })
  96  |         .check();
> 97  |       await expect(page.getByRole("dialog").getByRole("button", { name: /Câu 3,/ })).toBeVisible();
      |                                                                                      ^ Error: expect(locator).toBeVisible() failed
  98  |       await capture(page, `room-sheet-${width}`);
  99  |       await page.keyboard.press("Escape");
  100 |       await expect(sheet).toBeFocused();
  101 |     }
  102 |     await page.getByRole("button", { name: "Nộp bài", exact: true }).click();
  103 |     await expect(page.getByRole("dialog")).toContainText("Sau khi nộp, bạn không thể sửa đáp án");
  104 |     await capture(page, `room-confirm-${width}`);
  105 |     await page.getByRole("button", { name: "Chưa nộp", exact: true }).click();
  106 |     const previous = page.getByRole("button", { name: "Câu trước", exact: true });
  107 |     await previous.click();
  108 |     await previous.click();
  109 |   }
  110 |   await page.getByRole("button", { name: "Nộp bài", exact: true }).click();
  111 |   await page.getByRole("button", { name: "Nộp các đáp án đã lưu", exact: true }).click();
  112 |   await page.waitForURL("**/status");
  113 |   await page.getByRole("link", { name: "Xem kết quả", exact: true }).click();
  114 |   await expect(page.getByText("6/6", { exact: true })).toBeVisible();
  115 |   expect(errors).toEqual([]);
  116 | });
  117 | test("PORT-05D delayed ACK retains newer choice, retries wait and conflict compares actual options", async ({
  118 |   page,
  119 | }) => {
  120 |   await page.setViewportSize({ width: 1280, height: 1100 });
  121 |   await start(page);
  122 |   await fault(page, "delay-ack");
  123 |   await page.getByRole("radio", { name: "accurate", exact: true }).check();
  124 |   await expect(page.getByRole("status").filter({ hasText: "Đang lưu…" })).toBeVisible();
  125 |   await page.getByRole("radio", { name: "late", exact: true }).check();
  126 |   await capture(page, "room-saving-newer-intent-1280");
  127 |   await saved(page);
  128 |   await expect(page.getByRole("radio", { name: "late", exact: true })).toBeChecked();
  129 |   await fault(page, "save-429");
  130 |   await page.getByRole("radio", { name: "accurate", exact: true }).check();
  131 |   await expect(page.getByRole("status").filter({ hasText: "Đang thử lưu lại" })).toBeVisible();
  132 |   await capture(page, "room-retry-1280");
  133 |   await saved(page);
  134 |   await fault(page, "conflict-save");
  135 |   await page.getByRole("radio", { name: "late", exact: true }).check();
  136 |   const conflict = page.getByRole("dialog", { name: "Đáp án đã thay đổi ở nơi khác" });
  137 |   await expect(conflict).toContainText("late");
  138 |   await expect(conflict).toContainText("accurate");
  139 |   await expect(page.getByRole("button", { name: "Dùng bản máy chủ" })).toBeEnabled();
  140 |   await capture(page, "room-conflict-1280");
  141 |   await page.getByRole("button", { name: "Giữ lựa chọn của tôi" }).click();
  142 |   await saved(page);
  143 |   await expect(page.getByRole("radio", { name: "late", exact: true })).toBeChecked();
  144 | });
  145 | test("PORT-05D a lost submit ACK stays unknown until durable synthetic status is checked", async ({
  146 |   page,
  147 | }) => {
  148 |   await page.setViewportSize({ width: 1024, height: 1100 });
  149 |   await start(page);
  150 |   await page.getByRole("radio", { name: "accurate", exact: true }).check();
  151 |   await saved(page);
  152 |   await fault(page, "lose-ack");
  153 |   await page.getByRole("button", { name: "Nộp bài", exact: true }).click();
  154 |   await page.getByRole("button", { name: "Nộp các đáp án đã lưu", exact: true }).click();
  155 |   await expect(page.getByRole("heading", { name: "Chưa xác nhận đã nộp" })).toBeVisible();
  156 |   await expect(page.getByRole("radio").first()).toBeDisabled();
  157 |   await capture(page, "room-submit-unknown-1024");
  158 |   await page.waitForURL("**/status");
  159 |   await expect(page.getByRole("heading", { name: "Trạng thái bài", exact: true })).toBeVisible();
  160 | });
  161 | test("PORT-05D same-actor reauth and offline local choices retain truthful save feedback", async ({
  162 |   page,
  163 | }) => {
  164 |   await page.setViewportSize({ width: 768, height: 1100 });
  165 |   await start(page);
  166 |   await fault(page, "save-503");
  167 |   await page.getByRole("radio", { name: "accurate", exact: true }).check();
  168 |   await expect(page.getByRole("status").filter({ hasText: "Đang thử lưu lại" })).toBeVisible();
  169 |   await page.evaluate(() => {
  170 |     const channel = new BroadcastChannel("exam-platform-session");
  171 |     channel.postMessage({ type: "reauth" });
  172 |     channel.close();
  173 |   });
  174 |   await expect(page.getByRole("heading", { name: "Đăng nhập lại" })).toBeVisible();
  175 |   await expect(page.getByRole("radio")).toHaveCount(0);
  176 |   await capture(page, "room-reauth-768");
  177 |   await page.getByLabel("Email").fill("candidate@example.test");
  178 |   await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("fixture-password-ok");
  179 |   await page.getByRole("button", { name: "Đăng nhập lại", exact: true }).click();
  180 |   await saved(page);
  181 |   await expect(page.getByRole("radio", { name: "accurate", exact: true })).toBeChecked();
  182 |   // Controlled browser event exercises the coordinator; DemoApi is in process.
  183 |   await page.evaluate(() => dispatchEvent(new Event("offline")));
  184 |   await page.getByRole("radio", { name: "late", exact: true }).check();
  185 |   await expect(page.getByRole("status").filter({ hasText: "Chưa kết nối" })).toBeVisible();
  186 |   await capture(page, "room-offline-768");
  187 |   await page.evaluate(() => dispatchEvent(new Event("online")));
  188 |   await saved(page);
  189 |   await expect(page.getByRole("radio", { name: "late", exact: true })).toBeChecked();
  190 |   await page.emulateMedia({ reducedMotion: "reduce" });
  191 |   await capture(page, "room-reduced-motion-768");
  192 | });
  193 | 
```