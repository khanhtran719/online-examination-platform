# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: browser.spec.ts >> demo >> exam save, conflict, frozen attempt and result
- Location: e2e/browser.spec.ts:87:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/Bài làm không kèm tiêu đề đã khóa/)
Expected: visible
Timeout: 12000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText(/Bài làm không kèm tiêu đề đã khóa/) with timeout 12000ms
  - waiting for getByText(/Bài làm không kèm tiêu đề đã khóa/)

```

```yaml
- status: Dữ liệu mẫu. Đây không phải dữ liệu vận hành và không chứng minh bản live.
- group:
  - text: Kịch bản mẫu
  - paragraph: "Tài khoản đã xác nhận: candidate@example.test / fixture-password-ok. Tài khoản pending@example.test chưa có mật khẩu. disabled@example.test bị từ chối với cùng câu đăng nhập."
  - paragraph: Phiên demo nằm trong bộ nhớ tiến trình này. Tải lại trang sẽ mất đăng nhập. Hai tab không dùng chung phiên.
  - text: Quyền mẫu
  - combobox "Quyền mẫu":
    - option "Thí sinh" [selected]
    - option "Người xem báo cáo"
    - option "Quản trị"
  - text: Lỗi lưu tiếp theo
  - combobox "Lỗi lưu tiếp theo":
    - option "Bình thường"
    - option "Trễ ACK 5 giây"
    - option "Mất ACK sau khi đã ghi"
    - option "Xung đột phiên bản" [selected]
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
- banner:
  - strong: ExamPlatform
  - button "Rời phòng thi"
  - status: Chưa có thay đổi cần lưu
  - text: Thời gian còn lại
  - paragraph: 34:46
  - button "Nộp bài"
  - paragraph: Đã trả lời 0 trên 1 câu đã tải. Chưa có tổng số câu của đúng phiên bản.
  - progressbar "Câu đã trả lời trong phần đã tải"
- main:
  - paragraph: LÀM BÀI · PHIÊN BẢN ĐÃ KHÓA
  - heading "Đề 00000000" [level=1]
  - paragraph: Chưa có tên của phiên bản này. Mã đề 00000000.
  - paragraph: Hạn nộp 10:29 13/10/2026 · Giờ Việt Nam UTC+7
  - article "Version 1 prompt":
    - paragraph: Câu 1 · Một lựa chọn · 1 điểm
    - heading "Version 1 prompt" [level=2]
    - group "Chọn một đáp án bạn cho là đúng.":
      - text: Chọn một đáp án bạn cho là đúng.
      - radio "Old A"
      - text: Old A
      - radio "Old B"
      - text: Old B
    - checkbox "Đánh dấu để xem lại"
    - text: Đánh dấu để xem lại
    - button "Xóa đáp án" [disabled]
  - button "Câu trước" [disabled]
  - button "Câu sau" [disabled]
  - button "Danh sách câu hỏi"
  - paragraph:
    - text: Chỉ đáp án được máy chủ xác nhận mới được ghi nhận.
    - link "Xem trạng thái xử lý":
      - /url: /attempts/00000000-0000-4000-8000-000000000402/status
```

# Test source

```ts
  27  | 
  28  | async function login(page: Page, returnPath = "/dashboard"): Promise<void> {
  29  |   await page.goto(`/login?return=${encodeURIComponent(returnPath)}`);
  30  |   await page.getByLabel("Email").fill("candidate@example.test");
  31  |   await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("fixture-password-ok");
  32  |   await page.getByRole("button", { name: "Đăng nhập" }).click();
  33  |   await expect(
  34  |     page.getByRole("heading", {
  35  |       name: returnPath === "/admin" ? "Quản trị" : "Bảng làm việc",
  36  |       exact: true,
  37  |     }),
  38  |   ).toBeVisible();
  39  | }
  40  | 
  41  | test.describe("demo", () => {
  42  |   test.beforeEach(async ({ page }) => {
  43  |     const errors: string[] = [];
  44  |     page.on("pageerror", (error) => errors.push(error.message));
  45  |     await page.addInitScript(() => {
  46  |       (window as Window & { __pageErrors?: string[] }).__pageErrors = [];
  47  |     });
  48  |     page.on("pageerror", (error) => {
  49  |       void page
  50  |         .evaluate((message) => {
  51  |           const target = window as Window & { __pageErrors?: string[] };
  52  |           target.__pageErrors?.push(message);
  53  |         }, error.message)
  54  |         .catch(() => undefined);
  55  |     });
  56  |   });
  57  | 
  58  |   test("public pages at five widths", async ({ page }) => {
  59  |     for (const width of widths) {
  60  |       await page.setViewportSize({ width, height: width < 768 ? 720 : 900 });
  61  |       await page.goto("/");
  62  |       await expect(page.getByRole("status").filter({ hasText: "Dữ liệu mẫu" })).toBeVisible();
  63  |       await expect(page.getByRole("heading", { name: /Vào nhịp thi/ })).toBeVisible();
  64  |       await shot(page, `home-${width}`);
  65  |       if (width === 1440 || width === 320) await axe(page, `home-${width}`);
  66  |     }
  67  |     await page.setViewportSize({ width: 390, height: 800 });
  68  |     await page.goto("/login");
  69  |     await page.getByLabel("Email").fill("disabled@example.test");
  70  |     await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("fixture-password-ok");
  71  |     await page.getByRole("button", { name: "Đăng nhập" }).click();
  72  |     await expect(page.getByRole("alert")).toContainText("Email hoặc mật khẩu không đúng.");
  73  |     await shot(page, "login-401-390");
  74  |     await page.goto("/register");
  75  |     await page.getByLabel("Email").fill("person@example.test");
  76  |     await page.getByLabel("Tên hiển thị").fill("Lan Nguyễn");
  77  |     await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("short");
  78  |     await page.getByLabel("Nhập lại mật khẩu").fill("short");
  79  |     await page.getByRole("button", { name: "Tạo tài khoản" }).click();
  80  |     await expect(page.getByText(/15/)).toBeVisible();
  81  |     await shot(page, "register-short-password-390");
  82  |     await page.goto("/missing-page");
  83  |     await expect(page.getByRole("heading", { name: "Không có trang này" })).toBeVisible();
  84  |     await shot(page, "not-found-390");
  85  |   });
  86  | 
  87  |   test("exam save, conflict, frozen attempt and result", async ({ page }) => {
  88  |     await page.setViewportSize({ width: 1440, height: 900 });
  89  |     await login(page);
  90  |     await shot(page, "dashboard-1440");
  91  |     const stored = await page.evaluate(() => ({
  92  |       local: window.localStorage.length,
  93  |       session: window.sessionStorage.length,
  94  |     }));
  95  |     expect(stored).toEqual({ local: 0, session: 0 });
  96  |     await page.getByRole("link", { name: "Đề thi", exact: true }).click();
  97  |     await page.getByRole("link", { name: /Đại học/ }).click();
  98  |     await expect(page.getByRole("heading", { level: 1 })).toContainText("Đại học");
  99  |     await shot(page, "exam-detail-long-title-1440");
  100 |     await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
  101 |     await page.getByRole("dialog").getByRole("button", { name: "Bắt đầu", exact: true }).click();
  102 |     await expect(page.getByRole("heading", { level: 1 })).toContainText("Đại học");
  103 |     await expect(page.getByLabel("Thời gian còn lại")).not.toHaveText("—:—");
  104 |     const first = page.getByRole("radio").first();
  105 |     await first.check();
  106 |     await expect(page.getByRole("status").filter({ hasText: "Đã lưu lúc" })).toBeVisible();
  107 |     await shot(page, "exam-room-saved-1440");
  108 |     await axe(page, "exam-room-1440");
  109 |     await scenarios(page).click();
  110 |     await page.getByLabel("Lỗi lưu tiếp theo").selectOption("conflict-save");
  111 |     await page.getByRole("radio").nth(1).check();
  112 |     await expect(page.getByRole("dialog", { name: "Đáp án đã thay đổi ở nơi khác" })).toBeVisible();
  113 |     await shot(page, "exam-conflict-1440");
  114 |     await page.setViewportSize({ width: 320, height: 720 });
  115 |     await page.getByRole("button", { name: "Dùng bản máy chủ" }).click();
  116 |     await expect(page.getByRole("dialog", { name: "Đáp án đã thay đổi ở nơi khác" })).toHaveCount(
  117 |       0,
  118 |     );
  119 |     await expect(page.getByRole("button", { name: "Phiếu câu hỏi" })).toBeVisible();
  120 |     await page.getByRole("button", { name: "Phiếu câu hỏi" }).click();
  121 |     await expect(page.getByRole("dialog", { name: "Phiếu câu hỏi" })).toBeVisible();
  122 |     await shot(page, "exam-sheet-320");
  123 |     await page.keyboard.press("Escape");
  124 |     await expect(page.getByRole("dialog", { name: "Phiếu câu hỏi" })).toHaveCount(0);
  125 |     await page.setViewportSize({ width: 1024, height: 800 });
  126 |     await page.getByRole("link", { name: "mở phòng" }).click();
> 127 |     await expect(page.getByText(/Bài làm không kèm tiêu đề đã khóa/)).toBeVisible();
      |                                                                       ^ Error: expect(locator).toBeVisible() failed
  128 |     await expect(page.getByText("Version 1 prompt")).toBeVisible();
  129 |     await expect(page.getByRole("heading", { level: 1 })).not.toContainText(
  130 |       "Networking Fundamentals",
  131 |     );
  132 |     await shot(page, "frozen-attempt-gap-1024");
  133 |     await page.setViewportSize({ width: 768, height: 900 });
  134 |     await page.getByRole("link", { name: "mở kết quả" }).click();
  135 |     await expect(page.getByText("83.33%")).toBeVisible();
  136 |     await expect(page.getByText("5/6 điểm")).toBeVisible();
  137 |     await shot(page, "result-8333-768");
  138 |   });
  139 | 
  140 |   test("admin permission boundary and honest metrics", async ({ page }) => {
  141 |     await page.setViewportSize({ width: 1024, height: 900 });
  142 |     await login(page, "/admin");
  143 |     await expect(page.getByRole("link", { name: "Quản trị", exact: true })).toHaveCount(0);
  144 |     await expect(page.getByText("Preset này không có quyền quản trị")).toBeVisible();
  145 |     await shot(page, "admin-denied-candidate-1024");
  146 |     await scenarios(page).click();
  147 |     await page.getByLabel("Quyền mẫu").selectOption("admin");
  148 |     await page.getByRole("link", { name: "Đề thi", exact: true }).click();
  149 |     await expect(page.getByRole("heading", { name: "Đề thi" })).toBeVisible();
  150 |     await shot(page, "admin-exams-1024");
  151 |     await page.getByRole("link", { name: "Số liệu", exact: true }).click();
  152 |     await expect(page.getByText("Chưa có nguồn đo HTTP.")).toBeVisible();
  153 |     await expect(page.getByText("Chưa có nguồn đo Hàng đợi.")).toBeVisible();
  154 |     await expect(page.getByText("Chưa có dữ liệu", { exact: true })).toHaveCount(4);
  155 |     await shot(page, "admin-metrics-missing-1024");
  156 |     await page.getByRole("link", { name: "Nhật ký", exact: true }).click();
  157 |     await expect(page.getByRole("heading", { name: "Nhật ký" })).toBeVisible();
  158 |     await shot(page, "admin-audit-1024");
  159 |     await page.getByRole("link", { name: "Ngân hàng câu", exact: true }).click();
  160 |     await expect(page.getByRole("heading", { name: "Ngân hàng câu" })).toBeVisible();
  161 |     await page.getByLabel("Quyền mẫu").selectOption("reviewer");
  162 |     await expect(page.getByRole("link", { name: "Ngân hàng câu", exact: true })).toHaveCount(0);
  163 |     await expect(page.getByText("catalog.manage")).toBeVisible();
  164 |     await shot(page, "admin-reviewer-denied-questions-1024");
  165 |   });
  166 | });
  167 | 
  168 | test.describe("live", () => {
  169 |   test.use({ baseURL: "http://127.0.0.1:4174" });
  170 | 
  171 |   test("does not fall back to demo data", async ({ page }) => {
  172 |     await page.setViewportSize({ width: 1440, height: 900 });
  173 |     await page.goto("/");
  174 |     await expect(page.getByText("Dữ liệu mẫu")).toHaveCount(0);
  175 |     await expect(page.getByText("candidate@example.test")).toHaveCount(0);
  176 |     await shot(page, "live-home-1440");
  177 |     await page.goto("/admin");
  178 |     await expect(page.getByRole("heading", { name: "Không kết nối được phiên" })).toBeVisible();
  179 |     await expect(page.getByText("Dữ liệu mẫu")).toHaveCount(0);
  180 |     await expect(page.getByRole("link", { name: "Về trang chủ" })).toBeVisible();
  181 |     await shot(page, "live-session-unavailable-1440");
  182 |     await page.goto("/login");
  183 |     await page.getByLabel("Email").fill("candidate@example.test");
  184 |     await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("fixture-password-ok");
  185 |     await page.getByRole("button", { name: "Đăng nhập" }).click();
  186 |     await expect(page.getByRole("alert")).toBeVisible();
  187 |     await expect(page.getByRole("heading", { name: "Bảng làm việc" })).toHaveCount(0);
  188 |     await shot(page, "live-login-unavailable-1440");
  189 |   });
  190 | });
  191 | 
```