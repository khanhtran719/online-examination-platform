# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-workflows.e2e-spec.ts >> question keys use the keyboard and confirm destructive type changes before saving
- Location: e2e/admin-workflows.e2e-spec.ts:57:1

# Error details

```
Error: locator.fill: Error: strict mode violation: getByLabel('Lựa chọn 1') resolved to 4 elements:
    1) <input value="" id="_r_8_"/> aka getByRole('textbox', { name: 'Lựa chọn 1' })
    2) <button disabled type="button" aria-label="Lên lựa chọn 1" class="_buttonGhost_r2gsm_4">↑</button> aka getByRole('button', { name: 'Lên lựa chọn 1' })
    3) <button type="button" class="_buttonGhost_r2gsm_4" aria-label="Xuống lựa chọn 1">↓</button> aka getByRole('button', { name: 'Xuống lựa chọn 1' })
    4) <button disabled type="button" aria-label="Xóa lựa chọn 1" class="_buttonGhost_r2gsm_4">×</button> aka getByRole('button', { name: 'Xóa lựa chọn 1' })

Call log:
  - waiting for getByLabel('Lựa chọn 1')

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - status [ref=e4]: Dữ liệu mẫu. Đây không phải dữ liệu vận hành và không chứng minh bản live.
    - group [ref=e5]:
      - generic "Kịch bản mẫu" [ref=e6] [cursor=pointer]
      - option "Thí sinh"
      - option "Người xem báo cáo"
      - option "Quản trị" [selected]
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
      - navigation "Quản trị" [ref=e15]:
        - link "Tổng quan" [ref=e16] [cursor=pointer]:
          - /url: /admin
        - link "Đề thi" [ref=e20] [cursor=pointer]:
          - /url: /admin/exams
        - link "Ngân hàng câu" [ref=e24] [cursor=pointer]:
          - /url: /admin/questions
        - link "Nhập JSON" [ref=e28] [cursor=pointer]:
          - /url: /admin/imports/new
        - link "Giám sát" [ref=e32] [cursor=pointer]:
          - /url: /admin/monitor
        - link "Số liệu" [ref=e36] [cursor=pointer]:
          - /url: /admin/metrics
        - link "Nhật ký" [ref=e40] [cursor=pointer]:
          - /url: /admin/audit
        - link "Về bảng làm việc" [ref=e44] [cursor=pointer]:
          - /url: /dashboard
      - link "Trợ giúp" [ref=e49] [cursor=pointer]:
        - /url: /help
    - generic [ref=e53]:
      - banner [ref=e54]:
        - generic [ref=e55]:
          - link "ExamPlatform — trang chủ" [ref=e56] [cursor=pointer]:
            - /url: /
            - generic [ref=e57]: ExamPlatform
          - generic [ref=e58]: Quản trị
        - generic [ref=e59]:
          - 'link "Hồ sơ: Lan Nguyễn" [ref=e60] [cursor=pointer]':
            - /url: /profile
            - generic [aria-hidden] [ref=e61]: LN
            - generic [ref=e62]: Lan Nguyễn
          - button "Đăng xuất" [ref=e63] [cursor=pointer]
      - main [ref=e64]:
        - generic [ref=e67]:
          - paragraph [ref=e68]: Quản trị / Ngân hàng câu hỏi / Tạo câu
          - generic [ref=e69]:
            - generic [ref=e70]:
              - generic [ref=e71]:
                - heading "Tạo câu" [level=1] [ref=e72]
                - generic [ref=e73]: Chưa lưu
              - paragraph [ref=e74]: Thay đổi câu trong ngân hàng không sửa các đề đã phát hành.
            - link "← Ngân hàng câu" [ref=e75] [cursor=pointer]:
              - /url: /admin/questions
          - generic [ref=e76]:
            - group [ref=e77]:
              - generic [ref=e78]:
                - heading "Nội dung câu hỏi" [level=2] [ref=e79]
                - generic [ref=e80]:
                  - generic [ref=e81]:
                    - generic [ref=e82]: Loại
                    - combobox "Loại" [ref=e83]:
                      - option "Một lựa chọn" [selected]
                      - option "Nhiều lựa chọn"
                      - option "Đúng / Sai"
                  - generic [ref=e84]:
                    - generic [ref=e85]: Điểm
                    - spinbutton "Điểm" [ref=e86]: "1"
                - generic [ref=e87]:
                  - generic [ref=e88]: Đề bài
                  - textbox "Đề bài" [active] [ref=e89]: Chọn các từ đúng.
                - paragraph [ref=e90]: 17/8000 ký tự
              - generic [ref=e91]:
                - heading "Lựa chọn và đáp án" [level=2] [ref=e92]
                - paragraph [ref=e93]: Chọn đúng một đáp án. Đáp án đi cùng nội dung khi sắp xếp lựa chọn.
                - group "Đáp án đúng" [ref=e94]:
                  - generic [ref=e96]:
                    - radio "Đáp án đúng 1" [checked] [ref=e97]
                    - generic [ref=e98]:
                      - generic [ref=e99]: Lựa chọn 1
                      - textbox "Lựa chọn 1" [ref=e100]
                    - generic [ref=e101]:
                      - button "Lên lựa chọn 1" [disabled] [ref=e102]: ↑
                      - button "Xuống lựa chọn 1" [ref=e103] [cursor=pointer]: ↓
                      - button "Xóa lựa chọn 1" [disabled] [ref=e104]: ×
                  - generic [ref=e105]:
                    - radio "Đáp án đúng 2" [ref=e106]
                    - generic [ref=e107]:
                      - generic [ref=e108]: Lựa chọn 2
                      - textbox "Lựa chọn 2" [ref=e109]
                    - generic [ref=e110]:
                      - button "Lên lựa chọn 2" [ref=e111] [cursor=pointer]: ↑
                      - button "Xuống lựa chọn 2" [disabled] [ref=e112]: ↓
                      - button "Xóa lựa chọn 2" [disabled] [ref=e113]: ×
                - generic [ref=e114]:
                  - button "Thêm lựa chọn" [ref=e115] [cursor=pointer]
                  - button "Bớt lựa chọn" [disabled] [ref=e116]
                - generic [ref=e117]:
                  - generic [ref=e118]: Giải thích
                  - textbox "Giải thích" [ref=e119]
                - paragraph [ref=e120]: 0/8000 ký tự · Chỉ dành cho người được phép
            - complementary [ref=e121]:
              - heading "Xem trước nội dung" [level=2] [ref=e122]
              - paragraph [ref=e123]: Chỉ nội dung thí sinh được thấy; không kèm đáp án đúng hoặc giải thích.
              - generic [ref=e124]:
                - paragraph [ref=e125]: Một lựa chọn
                - paragraph [ref=e126]: Chọn các từ đúng.
                - list [ref=e127]:
                  - listitem [ref=e128]:
                    - generic [aria-hidden] [ref=e129]: A
                    - paragraph [ref=e130]: Lựa chọn 1
                  - listitem [ref=e131]:
                    - generic [aria-hidden] [ref=e132]: B
                    - paragraph [ref=e133]: Lựa chọn 2
              - button "Xem như thí sinh" [ref=e134] [cursor=pointer]
          - generic [ref=e135]:
            - paragraph [ref=e136]: Có thay đổi chưa lưu
            - button "Lưu câu" [ref=e138] [cursor=pointer]
      - contentinfo [ref=e139]: ExamPlatform · Vào nhịp thi
```

# Test source

```ts
  1   | import { expect, test, type Page } from "playwright/test";
  2   | 
  3   | async function admin(page: Page, route: string) {
  4   |   await page.goto(`/login?return=${encodeURIComponent(route)}`);
  5   |   await page.getByLabel("Email").fill("candidate@example.test");
  6   |   await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("fixture-password-ok");
  7   |   await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  8   |   await page.waitForURL(`**${route}`);
  9   |   await page.locator("summary").filter({ hasText: "Kịch bản mẫu" }).click();
  10  |   await page.getByLabel("Quyền mẫu").selectOption("admin");
  11  |   await page.locator("summary").filter({ hasText: "Kịch bản mẫu" }).click();
  12  | }
  13  | 
  14  | test("exam draft keeps editor state, prevents duplicate slots and distinguishes saved publication from local edits", async ({
  15  |   page,
  16  | }) => {
  17  |   await page.setViewportSize({ width: 390, height: 844 });
  18  |   await admin(page, "/admin/exams/new");
  19  |   await page.getByLabel("Tiêu đề", { exact: true }).fill("Kỳ thi thử tháng 10");
  20  |   await page.getByRole("button", { name: "Các phần & câu hỏi", exact: true }).click();
  21  |   await page.getByRole("button", { name: "Chọn câu cho phần 1" }).click();
  22  |   const picker = page.getByRole("dialog", { name: "Chọn câu từ ngân hàng" });
  23  |   const choices = picker.getByRole("button", { name: /^Thêm:/ });
  24  |   await choices.first().click();
  25  |   await choices.first().click();
  26  |   await page.keyboard.press("Escape");
  27  |   await page.getByRole("button", { name: "Xuống", exact: true }).first().click();
  28  |   await page.getByRole("button", { name: "Thêm phần", exact: true }).click();
  29  |   await page.getByRole("button", { name: "Chọn câu cho phần 2" }).click();
  30  |   await expect(picker.getByRole("button", { name: /^Đã có:/ })).toHaveCount(2);
  31  |   await expect(picker.getByRole("button", { name: /^Đã có:/ }).first()).toBeDisabled();
  32  |   await choices.first().click();
  33  |   await page.keyboard.press("Escape");
  34  |   await page.getByRole("button", { name: "Thông tin", exact: true }).click();
  35  |   await expect(page.getByLabel("Tiêu đề", { exact: true })).toHaveValue("Kỳ thi thử tháng 10");
  36  |   await page.getByRole("button", { name: "Lưu nháp", exact: true }).click();
  37  |   await expect(page).toHaveURL(/\/admin\/exams\/[^/]+\/edit$/);
  38  |   await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kỳ thi thử tháng 10");
  39  |   await page.getByLabel("Tiêu đề", { exact: true }).fill("Chỉnh sửa chưa lưu");
  40  |   await page.getByRole("button", { name: "Phát hành", exact: true }).click();
  41  |   await expect(page.getByRole("dialog")).toContainText("bản nháp đã lưu trên máy chủ");
  42  |   await page.getByRole("dialog").getByRole("button", { name: "Xác nhận", exact: true }).click();
  43  |   await expect(page.getByText("✓ Đang phát hành", { exact: true })).toBeVisible();
  44  |   await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kỳ thi thử tháng 10");
  45  |   await expect(page.getByLabel("Tiêu đề", { exact: true })).toHaveValue("Chỉnh sửa chưa lưu");
  46  |   await page.getByRole("button", { name: "Gỡ phát hành", exact: true }).click();
  47  |   await page
  48  |     .getByRole("dialog", { name: "Gỡ phát hành đề" })
  49  |     .getByRole("button", { name: "Xác nhận", exact: true })
  50  |     .click();
  51  |   await expect(page.getByText("Bản nháp", { exact: true })).toBeVisible();
  52  |   await page.getByRole("button", { name: "Lưu trữ", exact: true }).click();
  53  |   await page.getByRole("dialog").getByRole("button", { name: "Xác nhận", exact: true }).click();
  54  |   await expect(page.getByText("Đã lưu trữ", { exact: true })).toBeVisible();
  55  | });
  56  | 
  57  | test("question keys use the keyboard and confirm destructive type changes before saving", async ({
  58  |   page,
  59  | }) => {
  60  |   await admin(page, "/admin/questions/new");
  61  |   await page.getByLabel("Đề bài", { exact: true }).fill("Chọn các từ đúng.");
> 62  |   await page.getByLabel("Lựa chọn 1").fill("Một");
      |                                       ^ Error: locator.fill: Error: strict mode violation: getByLabel('Lựa chọn 1') resolved to 4 elements:
  63  |   await page.getByLabel("Lựa chọn 2").fill("Hai");
  64  |   await page.getByRole("button", { name: "Thêm lựa chọn" }).click();
  65  |   await page.getByLabel("Lựa chọn 3").fill("Ba");
  66  |   await page.getByRole("combobox", { name: "Loại", exact: true }).selectOption("MULTIPLE_CHOICE");
  67  |   const key = page.getByRole("checkbox", { name: "Đáp án đúng 3" });
  68  |   await key.focus();
  69  |   await page.keyboard.press("Space");
  70  |   await expect(key).toBeChecked();
  71  |   await page.getByRole("combobox", { name: "Loại", exact: true }).selectOption("SINGLE_CHOICE");
  72  |   await page.getByRole("dialog").getByRole("button", { name: "Hủy", exact: true }).click();
  73  |   await expect(key).toBeChecked();
  74  |   await page.getByRole("combobox", { name: "Loại", exact: true }).selectOption("SINGLE_CHOICE");
  75  |   await page.getByRole("dialog").getByRole("button", { name: "Đổi loại", exact: true }).click();
  76  |   await expect(page.getByRole("radio", { name: "Đáp án đúng 1" })).toBeChecked();
  77  |   await page.getByRole("button", { name: "Lưu câu", exact: true }).click();
  78  |   await expect(page).toHaveURL(/\/admin\/questions\/[^/]+\/edit$/);
  79  |   await expect(page.getByRole("heading", { name: "Sửa câu", exact: true })).toBeVisible();
  80  |   await expect(page.getByLabel("Đề bài", { exact: true })).toHaveValue("Chọn các từ đúng.");
  81  |   const archive = page.getByRole("button", { name: "Lưu trữ", exact: true });
  82  |   await archive.click();
  83  |   await page.keyboard.press("Escape");
  84  |   await expect(archive).toBeFocused();
  85  |   await archive.click();
  86  |   await page
  87  |     .getByRole("dialog", { name: "Lưu trữ câu hỏi" })
  88  |     .getByRole("button", { name: "Xác nhận", exact: true })
  89  |     .click();
  90  |   await expect(page.getByText("Đã lưu trữ", { exact: true })).toBeVisible();
  91  |   await expect(archive).toBeDisabled();
  92  | });
  93  | 
  94  | test("import validates first, invalidates a changed file and asks before committing", async ({
  95  |   page,
  96  | }) => {
  97  |   await page.setViewportSize({ width: 320, height: 844 });
  98  |   await admin(page, "/admin/imports/new");
  99  |   const text = page.getByLabel("Nội dung JSON", { exact: true });
  100 |   const original = await text.inputValue();
  101 |   const commit = page.getByRole("button", { name: "Nhập câu hỏi", exact: true });
  102 |   await expect(commit).toBeDisabled();
  103 |   await page.getByRole("button", { name: "Kiểm tra dữ liệu", exact: true }).click();
  104 |   await expect(page.getByText("Chưa ghi ngân hàng", { exact: true })).toBeVisible();
  105 |   await expect(commit).toBeEnabled();
  106 |   await text.fill("{}");
  107 |   await expect(commit).toBeDisabled();
  108 |   await expect(page.getByText("JSON chưa hợp lệ", { exact: true })).toBeVisible();
  109 |   await text.fill(original);
  110 |   await page.getByRole("button", { name: "Kiểm tra dữ liệu", exact: true }).click();
  111 |   await commit.click();
  112 |   const dialog = page.getByRole("dialog", { name: "Xác nhận nhập câu hỏi" });
  113 |   await expect(dialog).toBeVisible();
  114 |   await page.keyboard.press("Escape");
  115 |   await expect(commit).toBeFocused();
  116 |   await commit.click();
  117 |   await dialog.getByRole("button", { name: "Nhập vào ngân hàng" }).click();
  118 |   await expect(page.getByRole("heading", { name: "Báo cáo nhập", exact: true })).toBeVisible();
  119 |   await expect(page.getByText("Đã ghi vào ngân hàng", { exact: true })).toBeVisible();
  120 |   await expect(page.getByRole("region", { name: "Các câu đã nhập" })).toContainText("q1");
  121 | });
  122 | 
  123 | test("audit restores focus, failed replay stays pending and reviewer capabilities filter the page", async ({
  124 |   page,
  125 | }) => {
  126 |   await page.setViewportSize({ width: 320, height: 844 });
  127 |   await admin(page, "/admin/audit");
  128 |   const table = page.getByRole("region", { name: "Nhật ký quản trị" });
  129 |   await table.focus();
  130 |   await page.keyboard.press("ArrowRight");
  131 |   await expect.poll(() => table.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  132 |   const detail = page.getByRole("button", { name: "Chi tiết", exact: true }).first();
  133 |   await detail.click();
  134 |   await expect(page.getByRole("dialog", { name: "Chi tiết nhật ký" })).toBeVisible();
  135 |   await expect(page.getByRole("dialog", { name: "Chi tiết nhật ký" })).toContainText("USER");
  136 |   await page.keyboard.press("Escape");
  137 |   await expect(detail).toBeFocused();
  138 |   const systemRow = page.getByRole("row").filter({ hasText: "platform.audit.prune" });
  139 |   await expect(systemRow).toContainText("Không có mã");
  140 |   await systemRow.getByRole("button", { name: "Chi tiết", exact: true }).click();
  141 |   await expect(page.getByRole("dialog", { name: "Chi tiết nhật ký" })).toContainText("SYSTEM");
  142 |   await page.keyboard.press("Escape");
  143 |   // Use client navigation to preserve the in-memory demo session.
  144 |   await page.evaluate(() => {
  145 |     history.pushState(null, "", "/admin/attempts/00000000-0000-4000-8000-000000000403");
  146 |     dispatchEvent(new PopStateEvent("popstate"));
  147 |   });
  148 |   await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lượt 00000000…000403");
  149 |   await page.getByLabel("Lý do", { exact: true }).fill("Kiểm tra lại lỗi chấm bài");
  150 |   await page.getByRole("button", { name: "Gửi xử lý lại", exact: true }).click();
  151 |   await expect(
  152 |     page.getByText("Đã nhận yêu cầu xử lý lại. Kết quả chưa được tính là xong.", { exact: true }),
  153 |   ).toBeVisible();
  154 |   await expect(page.getByText("Chưa có điểm", { exact: true })).toBeVisible();
  155 |   await page.locator("summary").filter({ hasText: "Kịch bản mẫu" }).click();
  156 |   await page.getByLabel("Quyền mẫu").selectOption("reviewer");
  157 |   await expect(page.getByRole("button", { name: "Gửi xử lý lại", exact: true })).toHaveCount(0);
  158 |   await expect(
  159 |     page
  160 |       .getByRole("navigation", { name: "Quản trị", exact: true })
  161 |       .getByRole("link", { name: "Ngân hàng câu", exact: true }),
  162 |   ).toHaveCount(0);
```