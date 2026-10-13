# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: foundation.e2e-spec.ts >> admin mobile menu preserves capability filtering and logout
- Location: e2e/foundation.e2e-spec.ts:66:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Quản trị đề và kết quả', exact: true })
Expected: visible
Timeout: 12000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('heading', { name: 'Quản trị đề và kết quả', exact: true }) with timeout 12000ms
  - waiting for getByRole('heading', { name: 'Quản trị đề và kết quả', exact: true })

```

```yaml
- status: Dữ liệu mẫu. Đây không phải dữ liệu vận hành và không chứng minh bản live.
- group:
  - text: Kịch bản mẫu
  - paragraph: "Tài khoản đã xác nhận: candidate@example.test / fixture-password-ok. Tài khoản pending@example.test chưa có mật khẩu. disabled@example.test bị từ chối với cùng câu đăng nhập."
  - paragraph: Phiên demo nằm trong bộ nhớ tiến trình này. Tải lại trang sẽ mất đăng nhập. Hai tab không dùng chung phiên.
  - text: Quyền mẫu
  - combobox "Quyền mẫu":
    - option "Thí sinh"
    - option "Người xem báo cáo"
    - option "Quản trị" [selected]
  - text: Lỗi lưu tiếp theo
  - combobox "Lỗi lưu tiếp theo":
    - option "Bình thường" [selected]
    - option "Trễ ACK 5 giây"
    - option "Mất ACK sau khi đã ghi"
    - option "Xung đột phiên bản"
    - option "Giới hạn lưu"
    - option "Máy chủ bận khi lưu"
    - option "Mất kết quả refresh"
  - button "Đặt lại dữ liệu mẫu"
  - button "Thử refresh có khóa"
  - button "Tạo đề 120 câu"
  - paragraph:
    - text: "Lượt phiên bản cũ đang làm:"
    - link "mở phòng":
      - /url: /attempts/00000000-0000-4000-8000-000000000402
  - paragraph:
    - text: "Kết quả TOEIC 5/6, 83.33%:"
    - link "mở kết quả":
      - /url: /attempts/00000000-0000-4000-8000-000000000401/result
  - heading "Hộp thư mẫu" [level=2]
  - list:
    - listitem:
      - text: pending@example.test ·
      - link "Mở liên kết xác nhận":
        - /url: /verify-email#token=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
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
  - text: Quản trị
  - 'link "Hồ sơ: Lan Nguyễn"':
    - /url: /profile
    - text: Lan Nguyễn
  - button "Đăng xuất"
- main:
  - paragraph: QUẢN TRỊ / TỔNG QUAN
  - heading "Tổng quan quản trị" [level=1]
  - paragraph: Chọn công việc và xem trạng thái các lượt thi.
  - button "Tải lại"
  - heading "Trạng thái lượt thi" [level=2]
  - paragraph: "Mốc dữ liệu máy chủ: 22:51 12/10/2026 · Giờ Việt Nam (UTC+7)"
  - paragraph: Lượt bắt đầu từ 22:51 11/10/2026 đến trước 22:51 12/10/2026.
  - paragraph: Đếm lượt theo trạng thái hiện tại. Đã nộp bao gồm lượt đã hoàn thành hoặc xử lý thất bại; các số không cộng lại thành tổng.
  - term: Đang làm
  - definition: "1"
  - term: Đã nộp
  - definition: "2"
  - term: Hoàn thành
  - definition: "1"
  - term: Thất bại
  - definition: "1"
  - heading "Công việc quản trị" [level=2]
  - navigation "Công việc quản trị":
    - link "Soạn và phát hành đề Tổ chức các phần, chọn câu và kiểm tra bản nháp trước khi mở thi. Mở công việc →":
      - /url: /admin/exams
      - heading "Soạn và phát hành đề" [level=3]
      - paragraph: Tổ chức các phần, chọn câu và kiểm tra bản nháp trước khi mở thi.
      - strong: Mở công việc →
    - link "Theo dõi các lượt thi Chọn đề để xem lượt đang làm, bài nộp và kết quả. Mở công việc →":
      - /url: /admin/monitor
      - heading "Theo dõi các lượt thi" [level=3]
      - paragraph: Chọn đề để xem lượt đang làm, bài nộp và kết quả.
      - strong: Mở công việc →
    - link "Ngân hàng câu hỏi Biên soạn lựa chọn, điểm và đáp án trong một không gian rõ ràng. Mở công việc →":
      - /url: /admin/questions
      - heading "Ngân hàng câu hỏi" [level=3]
      - paragraph: Biên soạn lựa chọn, điểm và đáp án trong một không gian rõ ràng.
      - strong: Mở công việc →
    - link "Nhập câu từ JSON Kiểm tra tệp và đọc lỗi trước khi ghi vào ngân hàng. Mở công việc →":
      - /url: /admin/imports/new
      - heading "Nhập câu từ JSON" [level=3]
      - paragraph: Kiểm tra tệp và đọc lỗi trước khi ghi vào ngân hàng.
      - strong: Mở công việc →
- contentinfo: ExamPlatform · Vào nhịp thi
```

# Test source

```ts
  1   | import { expect, test, type Page } from "playwright/test";
  2   | 
  3   | async function login(page: Page, returnPath = "/dashboard") {
  4   |   await page.goto(`/login?return=${encodeURIComponent(returnPath)}`);
  5   |   await page.getByLabel("Email").fill("candidate@example.test");
  6   |   await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("fixture-password-ok");
  7   |   await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  8   |   await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Đăng nhập");
  9   | }
  10  | 
  11  | test("public mobile menu closes on Escape and restores trigger focus", async ({ page }) => {
  12  |   await page.setViewportSize({ width: 390, height: 844 });
  13  |   await page.goto("/login");
  14  |   const trigger = page.getByRole("button", { name: "Menu", exact: true });
  15  |   await trigger.click();
  16  |   await expect(page.getByRole("button", { name: "Đóng menu", exact: true })).toHaveAttribute(
  17  |     "aria-expanded",
  18  |     "true",
  19  |   );
  20  |   await page
  21  |     .getByRole("navigation", { name: "Chính", exact: true })
  22  |     .getByRole("link")
  23  |     .first()
  24  |     .focus();
  25  |   await page.keyboard.press("Escape");
  26  |   await expect(trigger).toHaveAttribute("aria-expanded", "false");
  27  |   await expect(trigger).toBeFocused();
  28  |   await expect(page.getByRole("navigation", { name: "Chính", exact: true })).toBeHidden();
  29  | });
  30  | 
  31  | test("candidate mobile navigation closes after choosing a route and shows its active link", async ({
  32  |   page,
  33  | }) => {
  34  |   await page.setViewportSize({ width: 320, height: 720 });
  35  |   await login(page);
  36  |   await page.getByRole("button", { name: "Menu", exact: true }).click();
  37  |   await page
  38  |     .getByRole("navigation", { name: "Chính", exact: true })
  39  |     .getByRole("link", { name: "Đề thi", exact: true })
  40  |     .click();
  41  |   await expect(page.getByRole("heading", { name: "Đề thi", exact: true })).toBeVisible();
  42  |   await expect(page.getByRole("button", { name: "Menu", exact: true })).toHaveAttribute(
  43  |     "aria-expanded",
  44  |     "false",
  45  |   );
  46  |   await page.getByRole("button", { name: "Menu", exact: true }).click();
  47  |   await expect(
  48  |     page
  49  |       .getByRole("navigation", { name: "Chính", exact: true })
  50  |       .getByRole("link", { name: "Đề thi", exact: true }),
  51  |   ).toHaveAttribute("aria-current", "page");
  52  |   await expect(page.getByRole("link", { name: "Quản trị", exact: true })).toHaveCount(0);
  53  |   await page
  54  |     .locator("main")
  55  |     .getByRole("link", { name: /Networking Fundamentals/ })
  56  |     .click();
  57  |   await expect(page.getByRole("heading", { level: 1 })).toContainText("Networking Fundamentals");
  58  |   await page.goBack();
  59  |   await expect(page.getByRole("heading", { name: "Đề thi", exact: true })).toBeVisible();
  60  |   await expect(page.getByRole("button", { name: "Menu", exact: true })).toHaveAttribute(
  61  |     "aria-expanded",
  62  |     "false",
  63  |   );
  64  | });
  65  | 
  66  | test("admin mobile menu preserves capability filtering and logout", async ({ page }) => {
  67  |   await page.setViewportSize({ width: 390, height: 844 });
  68  |   await login(page, "/admin");
  69  |   await page.locator("summary").filter({ hasText: "Kịch bản mẫu" }).click();
  70  |   await page.getByLabel("Quyền mẫu").selectOption("admin");
  71  |   await expect(
  72  |     page.getByRole("heading", { name: "Quản trị đề và kết quả", exact: true }),
> 73  |   ).toBeVisible();
      |     ^ Error: expect(locator).toBeVisible() failed
  74  |   await page.getByRole("button", { name: "Menu", exact: true }).click();
  75  |   await page
  76  |     .getByRole("navigation", { name: "Quản trị", exact: true })
  77  |     .getByRole("link", { name: "Đề thi", exact: true })
  78  |     .click();
  79  |   await expect(page.getByRole("heading", { name: "Đề thi", exact: true })).toBeVisible();
  80  |   await expect(page.getByRole("button", { name: "Menu", exact: true })).toHaveAttribute(
  81  |     "aria-expanded",
  82  |     "false",
  83  |   );
  84  |   await page.getByLabel("Quyền mẫu").selectOption("reviewer");
  85  |   await page.getByRole("button", { name: "Menu", exact: true }).click();
  86  |   const nav = page.getByRole("navigation", { name: "Quản trị", exact: true });
  87  |   await expect(nav.getByRole("link", { name: "Ngân hàng câu", exact: true })).toHaveCount(0);
  88  |   await expect(nav.getByRole("link", { name: "Giám sát", exact: true })).toBeVisible();
  89  |   await page.keyboard.press("Escape");
  90  |   await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  91  |   await expect(page.getByRole("heading", { name: "Đăng nhập", exact: true })).toBeVisible();
  92  | });
  93  | 
  94  | test("shared controls support keyboard entry, table scrolling and dialog focus", async ({
  95  |   page,
  96  | }) => {
  97  |   await page.setViewportSize({ width: 320, height: 720 });
  98  |   await page.goto("/dev/ui");
  99  |   await expect(
  100 |     page.getByRole("heading", { name: "Thư viện giao diện", exact: true }),
  101 |   ).toBeVisible();
  102 |   const password = page.getByLabel("Mật khẩu mẫu", { exact: true });
  103 |   await password.focus();
  104 |   await page.keyboard.press("Tab");
  105 |   await expect(page.getByRole("button", { name: "Hiện mật khẩu" })).toBeFocused();
  106 |   await page.keyboard.press("Space");
  107 |   await expect(password).toHaveAttribute("type", "text");
  108 |   await expect(page.getByRole("button", { name: "Ẩn mật khẩu" })).toHaveAttribute(
  109 |     "aria-pressed",
  110 |     "true",
  111 |   );
  112 |   await page.keyboard.press("Tab");
  113 |   const select = page.getByLabel("Danh mục mẫu");
  114 |   await expect(select).toBeFocused();
  115 |   // Native popup arrows are not dispatched by headless macOS Chromium.
  116 |   // Typeahead exercises the select with a real keyboard event.
  117 |   await page.keyboard.press("t");
  118 |   await expect(select).toHaveValue("TOEIC");
  119 |   await page.keyboard.press("Tab");
  120 |   await expect(page.getByLabel("Nội dung mẫu")).toBeFocused();
  121 |   await page.keyboard.press("End");
  122 |   await page.keyboard.type(" Nội dung nhập bằng bàn phím.");
  123 |   await expect(page.getByLabel("Nội dung mẫu")).toHaveValue(/Nội dung nhập bằng bàn phím/);
  124 |   await expect(page.getByLabel("Ô nhập bị khóa")).toBeDisabled();
  125 |   const table = page.getByRole("region", { name: "Bảng đề thi minh họa" });
  126 |   await table.focus();
  127 |   await page.keyboard.press("ArrowRight");
  128 |   await expect.poll(() => table.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  129 |   const trigger = page.getByRole("button", { name: "Mở hộp thoại" });
  130 |   await trigger.focus();
  131 |   await page.keyboard.press("Enter");
  132 |   const close = page
  133 |     .getByRole("dialog", { name: "Hộp thoại" })
  134 |     .getByRole("button", { name: "Đóng", exact: true });
  135 |   await expect(close).toBeFocused();
  136 |   await page.keyboard.press("Tab");
  137 |   await expect(page.getByRole("button", { name: "Đóng hộp thoại", exact: true })).toBeFocused();
  138 |   await page.keyboard.press("Tab");
  139 |   await expect(close).toBeFocused();
  140 |   await page.keyboard.press("Escape");
  141 |   await expect(page.getByRole("dialog")).toHaveCount(0);
  142 |   await expect(trigger).toBeFocused();
  143 | });
  144 | 
```