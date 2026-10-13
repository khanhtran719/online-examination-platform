# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: port-05e.e2e-spec.ts >> PORT-05E profile normal/edit/save, confirmed fields and privacy fit four Web/tablet widths
- Location: e2e/port-05e.e2e-spec.ts:84:1

# Error details

```
Error: expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 16
Received:    0
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
      - button "Menu" [ref=e15] [cursor=pointer]
    - generic [ref=e18]:
      - banner [ref=e19]:
        - generic [ref=e20]:
          - link "ExamPlatform — trang chủ" [ref=e21] [cursor=pointer]:
            - /url: /
            - generic [ref=e22]: ExamPlatform
          - generic [ref=e23]: Thí sinh
        - generic [ref=e24]:
          - 'link "Hồ sơ: Lan Nguyễn" [ref=e25] [cursor=pointer]':
            - /url: /profile
            - generic [aria-hidden] [ref=e26]: LN
            - generic [ref=e27]: Lan Nguyễn
          - button "Đăng xuất" [ref=e28] [cursor=pointer]
      - main [ref=e29]:
        - generic [ref=e30]:
          - generic [ref=e31]:
            - paragraph [ref=e32]: TÀI KHOẢN CỦA BẠN
            - heading "Hồ sơ thí sinh" [level=1] [ref=e33]
            - paragraph [ref=e34]: Quản lý tên hiển thị và lựa chọn tham gia bảng xếp hạng.
          - generic [ref=e35]:
            - complementary "Thông tin đã xác nhận" [ref=e36]:
              - generic [aria-hidden] [ref=e37]: LN
              - heading "Lan Nguyễn" [level=2] [ref=e38]
              - paragraph [ref=e39]: ✓ Đã xác thực email
              - generic [ref=e40]:
                - term [ref=e41]: Email · Chỉ đọc
                - definition [ref=e42]: candidate@example.test
                - term [ref=e43]: Xác thực lúc
                - definition [ref=e44]: 10:57 12/10/2026 · Giờ Việt Nam UTC+7
              - paragraph [ref=e45]: Email này dùng để đăng nhập. Trang Hồ sơ hiện chưa hỗ trợ đổi email.
              - link "Xem lịch sử thi →" [ref=e46] [cursor=pointer]:
                - /url: /history
            - generic [ref=e47]:
              - region [ref=e48]:
                - generic [ref=e49]:
                  - heading "Cài đặt thông tin" [level=2] [ref=e50]
                  - paragraph [ref=e51]: Chỉ thay đổi được máy chủ xác nhận mới là bản đã lưu.
                - generic [ref=e52]:
                  - generic [ref=e53]:
                    - generic [ref=e54]: Tên hiển thị
                    - textbox "Tên hiển thị" [ref=e55]: Lan Nguyễn
                  - generic [ref=e56]:
                    - paragraph [ref=e57]: Từ 1 đến 80 ký tự.
                    - paragraph [ref=e58]: 10/80 ký tự
                  - generic [ref=e59] [cursor=pointer]:
                    - checkbox "Tham gia bảng xếp hạng Khi bật, kết quả tốt nhất có thể xuất hiện với bí danh trong bảng xếp hạng được mở. Email và tên hiển thị không được đưa vào bảng. Tắt · Không tham gia" [ref=e60]
                    - generic [ref=e61]:
                      - strong [ref=e62]: Tham gia bảng xếp hạng
                      - generic [ref=e63]: Khi bật, kết quả tốt nhất có thể xuất hiện với bí danh trong bảng xếp hạng được mở. Email và tên hiển thị không được đưa vào bảng.
                      - generic [ref=e64]: Tắt · Không tham gia
                  - generic [ref=e65]:
                    - button "Hủy thay đổi" [disabled] [ref=e66]
                    - button "Lưu thay đổi" [disabled] [ref=e67]
              - region [ref=e68]:
                - generic [ref=e69]:
                  - heading "Phiên làm việc" [level=2] [ref=e70]
                  - paragraph [ref=e71]: Đăng xuất khỏi phiên hiện tại. Thay đổi chưa xác nhận chỉ được giữ trong bộ nhớ trang.
                - button "Đăng xuất tài khoản" [ref=e72] [cursor=pointer]
      - contentinfo [ref=e73]: ExamPlatform · Vào nhịp thi
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
  8   |   process.env.WEB_EVIDENCE_DIR ?? "../../docs/web-ui/evidence/port-05e-2026-10-13",
  9   |   "profile",
  10  | );
  11  | async function login(page: Page) {
  12  |   await page.goto("/login?return=%2Fprofile");
  13  |   await page.getByLabel("Email").fill("candidate@example.test");
  14  |   await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("fixture-password-ok");
  15  |   await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  16  |   await expect(page.getByRole("heading", { name: "Hồ sơ thí sinh" })).toBeVisible();
  17  |   await page.evaluate(() => document.fonts.ready);
  18  | }
  19  | async function fault(page: Page, value: string) {
  20  |   const menu = page.locator("summary").filter({ hasText: "Kịch bản mẫu" });
  21  |   await menu.click();
  22  |   await page.getByLabel("Lỗi lưu tiếp theo").selectOption(value);
  23  |   await menu.click();
  24  | }
  25  | async function saved(page: Page) {
  26  |   await expect(page.getByText("Đã lưu hồ sơ", { exact: true })).toBeVisible();
  27  |   await expect(page.getByLabel("Tên hiển thị")).toBeEnabled();
  28  | }
  29  | async function capture(page: Page, name: string) {
  30  |   await mkdir(evidence, { recursive: true });
  31  |   const scan = await new AxeBuilder({ page })
  32  |     .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
  33  |     .analyze();
  34  |   const state = await page.evaluate(() => {
  35  |     const content = document.querySelector("main > div")!.getBoundingClientRect();
  36  |     const dialog = document.querySelector('[role="dialog"]');
  37  |     const bounds = dialog?.getBoundingClientRect(),
  38  |       backdrop = dialog?.parentElement?.getBoundingClientRect();
  39  |     return {
  40  |       width: document.documentElement.scrollWidth,
  41  |       left: content.left,
  42  |       right: content.right,
  43  |       fontLoaded: document.fonts.check('400 16px "Be Vietnam Pro"', "Hồ sơ thí sinh"),
  44  |       dialog:
  45  |         bounds && backdrop
  46  |           ? {
  47  |               left: bounds.left,
  48  |               width: bounds.width,
  49  |               backdropLeft: backdrop.left,
  50  |               backdropWidth: backdrop.width,
  51  |               backdropHeight: backdrop.height,
  52  |             }
  53  |           : null,
  54  |     };
  55  |   });
  56  |   await writeFile(
  57  |     path.join(evidence, name + ".json"),
  58  |     JSON.stringify(
  59  |       { ...state, viewport: page.viewportSize(), url: page.url(), violations: scan.violations },
  60  |       null,
  61  |       2,
  62  |     ),
  63  |   );
  64  |   await page.screenshot({
  65  |     path: path.join(evidence, name + ".png"),
  66  |     fullPage: (await page.getByRole("dialog").count()) === 0,
  67  |   });
  68  |   expect(scan.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }))).toEqual(
  69  |     [],
  70  |   );
  71  |   expect(state.fontLoaded).toBe(true);
  72  |   expect(state.width).toBeLessThanOrEqual(page.viewportSize()!.width);
> 73  |   expect(state.left).toBeGreaterThanOrEqual(16);
      |                      ^ Error: expect(received).toBeGreaterThanOrEqual(expected)
  74  |   expect(state.right).toBeLessThanOrEqual(page.viewportSize()!.width - 16);
  75  |   if (state.dialog) {
  76  |     expect(state.dialog.backdropLeft).toBe(0);
  77  |     expect(state.dialog.backdropWidth).toBe(page.viewportSize()!.width);
  78  |     expect(state.dialog.backdropHeight).toBe(page.viewportSize()!.height);
  79  |     expect(
  80  |       Math.abs(state.dialog.left + state.dialog.width / 2 - page.viewportSize()!.width / 2),
  81  |     ).toBeLessThanOrEqual(1);
  82  |   }
  83  | }
  84  | test("PORT-05E profile normal/edit/save, confirmed fields and privacy fit four Web/tablet widths", async ({
  85  |   page,
  86  | }) => {
  87  |   const errors: string[] = [];
  88  |   page.on("pageerror", (error) => errors.push(error.message));
  89  |   await login(page);
  90  |   for (const width of [768, 1024, 1280, 1440]) {
  91  |     await page.setViewportSize({ width, height: 1100 });
  92  |     await expect(page.getByRole("button", { name: "Lưu thay đổi", exact: true })).toBeDisabled();
  93  |     await expect(page.getByRole("complementary", { name: "Thông tin đã xác nhận" })).toContainText(
  94  |       "candidate@example.test",
  95  |     );
  96  |     await capture(page, "profile-normal-" + width);
  97  |     await page.getByLabel("Tên hiển thị").fill("Lan Nguyễn · ôn thi " + width);
  98  |     const opt = page.getByRole("checkbox", { name: /^Tham gia bảng xếp hạng/ });
  99  |     await opt.setChecked(!(await opt.isChecked()));
  100 |     await capture(page, "profile-edit-" + width);
  101 |     await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  102 |     await saved(page);
  103 |     await expect(page.getByRole("complementary", { name: "Thông tin đã xác nhận" })).toContainText(
  104 |       "Lan Nguyễn · ôn thi " + width,
  105 |     );
  106 |     await capture(page, "profile-saved-" + width);
  107 |   }
  108 |   await page.emulateMedia({ reducedMotion: "reduce" });
  109 |   await capture(page, "profile-reduced-motion-1440");
  110 |   expect(errors).toEqual([]);
  111 | });
  112 | test("PORT-05E conflict compares both snapshots and requires a choice before another save", async ({
  113 |   page,
  114 | }) => {
  115 |   await login(page);
  116 |   await page.getByLabel("Tên hiển thị").fill("Lan Nguyễn · bản đang sửa");
  117 |   await page.getByRole("checkbox", { name: /^Tham gia bảng xếp hạng/ }).check();
  118 |   await fault(page, "conflict-save");
  119 |   await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  120 |   const dialog = page.getByRole("dialog", { name: "Hồ sơ đã thay đổi ở nơi khác" });
  121 |   await expect(dialog).toContainText("Lan Nguyễn · bản máy chủ");
  122 |   await expect(dialog).toContainText("Lan Nguyễn · bản đang sửa");
  123 |   await expect(dialog.getByRole("button", { name: "Giữ bản của tôi" })).toBeEnabled();
  124 |   for (const width of [768, 1024, 1280, 1440]) {
  125 |     await page.setViewportSize({ width, height: 1100 });
  126 |     await capture(page, "profile-conflict-" + width);
  127 |   }
  128 |   await dialog.getByRole("button", { name: "Giữ bản của tôi" }).click();
  129 |   await expect(page.getByLabel("Tên hiển thị")).toHaveValue("Lan Nguyễn · bản đang sửa");
  130 |   await expect(page.getByText("Đã lưu hồ sơ", { exact: true })).toHaveCount(0);
  131 |   await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  132 |   await saved(page);
  133 |   await fault(page, "conflict-save");
  134 |   await page.getByLabel("Tên hiển thị").fill("Bỏ bản này");
  135 |   await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  136 |   await dialog.getByRole("button", { name: "Dùng bản máy chủ" }).click();
  137 |   await expect(page.getByLabel("Tên hiển thị")).toHaveValue("Lan Nguyễn · bản máy chủ");
  138 | });
  139 | test("PORT-05E lost ACK retains an immutable request, warns on leave and honors rate limit", async ({
  140 |   page,
  141 | }) => {
  142 |   await page.setViewportSize({ width: 1024, height: 1100 });
  143 |   await login(page);
  144 |   await page.getByLabel("Tên hiển thị").fill("Lan Nguyễn · sau retry");
  145 |   await fault(page, "lose-ack");
  146 |   await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  147 |   await expect(page.getByText("Chưa nhận được xác nhận", { exact: true })).toBeVisible();
  148 |   await expect(page.getByLabel("Tên hiển thị")).toBeDisabled();
  149 |   await capture(page, "profile-unknown-1024");
  150 |   await page.getByRole("link", { name: "Xem lịch sử thi →", exact: true }).click();
  151 |   await expect(page.getByRole("dialog", { name: "Rời hồ sơ khi còn thay đổi?" })).toBeVisible();
  152 |   await capture(page, "profile-leave-1024");
  153 |   await page.getByRole("button", { name: "Ở lại", exact: true }).click();
  154 |   await page.getByRole("button", { name: "Thử lại cùng yêu cầu", exact: true }).click();
  155 |   await saved(page);
  156 |   await expect(page.getByLabel("Tên hiển thị")).toHaveValue("Lan Nguyễn · sau retry");
  157 |   await fault(page, "save-429");
  158 |   await page.getByLabel("Tên hiển thị").fill("Lan Nguyễn · chờ lưu");
  159 |   await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  160 |   await expect(
  161 |     page.getByRole("button", { name: "Thử lại cùng yêu cầu", exact: true }),
  162 |   ).toBeDisabled();
  163 |   await capture(page, "profile-rate-wait-1024");
  164 |   await page.getByRole("button", { name: "Thử lại cùng yêu cầu", exact: true }).click();
  165 |   await saved(page);
  166 | });
  167 | test("PORT-05E pending/reset/logout/reauth dialogs remain accessible and truthful", async ({
  168 |   page,
  169 | }) => {
  170 |   await page.setViewportSize({ width: 1280, height: 1100 });
  171 |   await login(page);
  172 |   await page.getByLabel("Tên hiển thị").fill("Lan Nguyễn · chờ phản hồi");
  173 |   await fault(page, "delay-ack");
```