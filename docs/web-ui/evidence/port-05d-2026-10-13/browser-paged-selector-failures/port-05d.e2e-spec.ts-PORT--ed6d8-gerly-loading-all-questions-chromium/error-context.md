# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: port-05d.e2e-spec.ts >> PORT-05D a paged 120-question room permits the first answer without eagerly loading all questions
- Location: e2e/port-05d.e2e-spec.ts:195:1

# Error details

```
Test timeout of 45000ms exceeded.
```

```
Error: locator.click: Test timeout of 45000ms exceeded.
Call log:
  - waiting for locator('details').getByRole('link').filter({ hasText: /^00000000/ })

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - status [ref=e4]: Dữ liệu mẫu. Đây không phải dữ liệu vận hành và không chứng minh bản live.
    - group [ref=e5]:
      - generic "Kịch bản mẫu" [ref=e6] [cursor=pointer]
      - paragraph [ref=e7]: "Tài khoản đã xác nhận: candidate@example.test / fixture-password-ok. Tài khoản pending@example.test chưa có mật khẩu. disabled@example.test bị từ chối với cùng câu đăng nhập."
      - paragraph [ref=e8]: Phiên demo nằm trong bộ nhớ tiến trình này. Tải lại trang sẽ mất đăng nhập. Hai tab không dùng chung phiên.
      - generic [ref=e9]:
        - text: Quyền mẫu
        - combobox "Quyền mẫu" [ref=e10]:
          - option "Thí sinh" [selected]
          - option "Người xem báo cáo"
          - option "Quản trị"
      - generic [ref=e11]:
        - text: Lỗi lưu tiếp theo
        - combobox "Lỗi lưu tiếp theo" [ref=e12]:
          - option "Bình thường" [selected]
          - option "Trễ ACK 5 giây"
          - option "Mất ACK sau khi đã ghi"
          - option "Xung đột phiên bản"
          - option "Giới hạn lưu"
          - option "Máy chủ bận khi lưu"
          - option "Mất kết quả refresh"
      - generic [ref=e13]:
        - button "Đặt lại dữ liệu mẫu" [ref=e14] [cursor=pointer]
        - button "Thử refresh có khóa" [ref=e15] [cursor=pointer]
        - button "Tạo đề 120 câu" [active] [ref=e16] [cursor=pointer]
      - paragraph [ref=e17]:
        - text: "Đề tải nặng:"
        - link "01a1333d-8acc-7313-8df6-744502010d8a" [ref=e18] [cursor=pointer]:
          - /url: /exams/01a1333d-8acc-7313-8df6-744502010d8a
      - paragraph [ref=e19]:
        - text: "Lượt phiên bản cũ đang làm:"
        - link "mở phòng" [ref=e20] [cursor=pointer]:
          - /url: /attempts/00000000-0000-4000-8000-000000000402
      - paragraph [ref=e21]:
        - text: "Kết quả TOEIC 5/6, 83.33%:"
        - link "mở kết quả" [ref=e22] [cursor=pointer]:
          - /url: /attempts/00000000-0000-4000-8000-000000000401/result
      - heading "Hộp thư mẫu" [level=2] [ref=e23]
      - list [ref=e24]:
        - listitem [ref=e25]:
          - text: pending@example.test ·
          - link "Mở liên kết xác nhận" [ref=e26] [cursor=pointer]:
            - /url: /verify-email#token=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
  - generic [ref=e27]:
    - link "Đi tới nội dung" [ref=e28] [cursor=pointer]:
      - /url: "#content"
    - banner [ref=e29]:
      - generic [ref=e30]:
        - generic [ref=e31]:
          - strong [ref=e36]: ExamPlatform
          - button "Rời phòng thi" [ref=e37] [cursor=pointer]
        - status [ref=e38]:
          - generic [aria-hidden] [ref=e39]: ○
          - text: Chưa có thay đổi cần lưu
        - generic [ref=e40]:
          - generic [ref=e41]: Thời gian còn lại
          - paragraph [ref=e42]: 29:15
        - button "Nộp bài" [ref=e43] [cursor=pointer]
      - generic [ref=e44]:
        - paragraph [ref=e45]: Đã trả lời 0 trên 3 câu đã tải. Phiên bản này có 3 câu; câu chưa tải không tính là bỏ trống.
        - progressbar "Câu đã trả lời trong phần đã tải" [ref=e46]
    - main [ref=e47]:
      - generic [ref=e49]:
        - generic [ref=e50]:
          - paragraph [ref=e51]: LÀM BÀI · PHIÊN BẢN ĐÃ KHÓA
          - heading "TOEIC — Reading practice" [level=1] [ref=e52]
          - paragraph [ref=e53]: Hạn nộp 10:40 13/10/2026 · Giờ Việt Nam UTC+7
        - article [ref=e54]:
          - paragraph [ref=e55]: Câu 1 · Một lựa chọn · 2 điểm
          - heading "Choose the best word." [level=2] [ref=e56]
          - group "Chọn một đáp án bạn cho là đúng." [ref=e57]:
            - generic [ref=e59] [cursor=pointer]:
              - radio "accurate" [ref=e60]
              - generic [aria-hidden] [ref=e61]: A
              - generic [ref=e62]: accurate
            - generic [ref=e63] [cursor=pointer]:
              - radio "late" [ref=e64]
              - generic [aria-hidden] [ref=e65]: B
              - generic [ref=e66]: late
            - generic [ref=e67] [cursor=pointer]:
              - radio "empty" [ref=e68]
              - generic [aria-hidden] [ref=e69]: C
              - generic [ref=e70]: empty
          - generic [ref=e71]:
            - generic [ref=e72]:
              - checkbox "Đánh dấu để xem lại" [ref=e73]
              - generic [aria-hidden] [ref=e74]: ⚑
              - text: Đánh dấu để xem lại
            - button "Xóa đáp án" [disabled] [ref=e75]
        - generic [ref=e76]:
          - button "Câu trước" [disabled] [ref=e77]
          - button "Câu sau" [ref=e78] [cursor=pointer]
          - button "Danh sách câu hỏi" [ref=e79] [cursor=pointer]
        - paragraph [ref=e80]:
          - text: Chỉ đáp án được máy chủ xác nhận mới được ghi nhận.
          - link "Xem trạng thái xử lý" [ref=e81] [cursor=pointer]:
            - /url: /attempts/01a1333d-8769-7083-acf1-38f0f7254087/status
```

# Test source

```ts
  107 |     await previous.click();
  108 |     await previous.click();
  109 |   }
  110 |   await page.getByRole("button", { name: "Nộp bài", exact: true }).click();
  111 |   await page.getByRole("button", { name: "Nộp các đáp án đã lưu", exact: true }).click();
  112 |   await page.waitForURL("**/status");
  113 |   await page.getByRole("link", { name: "Xem kết quả", exact: true }).click();
  114 |   await expect(page.getByRole("region", { name: "Điểm bài thi", exact: true })).toContainText(
  115 |     /6\s*\/6 điểm/,
  116 |   );
  117 |   expect(errors).toEqual([]);
  118 | });
  119 | test("PORT-05D delayed ACK retains newer choice, retries wait and conflict compares actual options", async ({
  120 |   page,
  121 | }) => {
  122 |   await page.setViewportSize({ width: 1280, height: 1100 });
  123 |   await start(page);
  124 |   await fault(page, "delay-ack");
  125 |   await page.getByRole("radio", { name: "accurate", exact: true }).check();
  126 |   await expect(page.getByRole("status").filter({ hasText: "Đang lưu…" })).toBeVisible();
  127 |   await page.getByRole("radio", { name: "late", exact: true }).check();
  128 |   await capture(page, "room-saving-newer-intent-1280");
  129 |   await saved(page);
  130 |   await expect(page.getByRole("radio", { name: "late", exact: true })).toBeChecked();
  131 |   await fault(page, "save-429");
  132 |   await page.getByRole("radio", { name: "accurate", exact: true }).check();
  133 |   await expect(page.getByRole("status").filter({ hasText: "Đang thử lưu lại" })).toBeVisible();
  134 |   await capture(page, "room-retry-1280");
  135 |   await saved(page);
  136 |   await fault(page, "conflict-save");
  137 |   await page.getByRole("radio", { name: "late", exact: true }).check();
  138 |   const conflict = page.getByRole("dialog", { name: "Đáp án đã thay đổi ở nơi khác" });
  139 |   await expect(conflict).toContainText("late");
  140 |   await expect(conflict).toContainText("accurate");
  141 |   await expect(page.getByRole("button", { name: "Dùng bản máy chủ" })).toBeEnabled();
  142 |   await capture(page, "room-conflict-1280");
  143 |   await page.getByRole("button", { name: "Giữ lựa chọn của tôi" }).click();
  144 |   await saved(page);
  145 |   await expect(page.getByRole("radio", { name: "late", exact: true })).toBeChecked();
  146 | });
  147 | test("PORT-05D a lost submit ACK stays unknown until durable synthetic status is checked", async ({
  148 |   page,
  149 | }) => {
  150 |   await page.setViewportSize({ width: 1024, height: 1100 });
  151 |   await start(page);
  152 |   await page.getByRole("radio", { name: "accurate", exact: true }).check();
  153 |   await saved(page);
  154 |   await fault(page, "lose-ack");
  155 |   await page.getByRole("button", { name: "Nộp bài", exact: true }).click();
  156 |   await page.getByRole("button", { name: "Nộp các đáp án đã lưu", exact: true }).click();
  157 |   await expect(page.getByText("Chưa xác nhận đã nộp", { exact: true })).toBeVisible();
  158 |   await expect(page.getByRole("radio").first()).toBeDisabled();
  159 |   await capture(page, "room-submit-unknown-1024");
  160 |   await page.waitForURL("**/status");
  161 |   await expect(page.getByRole("heading", { name: "Trạng thái bài", exact: true })).toBeVisible();
  162 | });
  163 | test("PORT-05D same-actor reauth and offline local choices retain truthful save feedback", async ({
  164 |   page,
  165 | }) => {
  166 |   await page.setViewportSize({ width: 768, height: 1100 });
  167 |   await start(page);
  168 |   await fault(page, "save-503");
  169 |   await page.getByRole("radio", { name: "accurate", exact: true }).check();
  170 |   await expect(page.getByRole("status").filter({ hasText: "Đang thử lưu lại" })).toBeVisible();
  171 |   await page.evaluate(() => {
  172 |     const channel = new BroadcastChannel("exam-platform-session");
  173 |     channel.postMessage({ type: "reauth" });
  174 |     channel.close();
  175 |   });
  176 |   await expect(page.getByRole("heading", { name: "Đăng nhập lại" })).toBeVisible();
  177 |   await expect(page.getByRole("radio")).toHaveCount(0);
  178 |   await capture(page, "room-reauth-768");
  179 |   await page.getByLabel("Email").fill("candidate@example.test");
  180 |   await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("fixture-password-ok");
  181 |   await page.getByRole("button", { name: "Đăng nhập lại", exact: true }).click();
  182 |   await saved(page);
  183 |   await expect(page.getByRole("radio", { name: "accurate", exact: true })).toBeChecked();
  184 |   // Controlled browser event exercises the coordinator; DemoApi is in process.
  185 |   await page.evaluate(() => dispatchEvent(new Event("offline")));
  186 |   await page.getByRole("radio", { name: "late", exact: true }).check();
  187 |   await expect(page.locator('[role="status"][data-phase="offline"]')).toBeVisible();
  188 |   await capture(page, "room-offline-768");
  189 |   await page.evaluate(() => dispatchEvent(new Event("online")));
  190 |   await saved(page);
  191 |   await expect(page.getByRole("radio", { name: "late", exact: true })).toBeChecked();
  192 |   await page.emulateMedia({ reducedMotion: "reduce" });
  193 |   await capture(page, "room-reduced-motion-768");
  194 | });
  195 | test("PORT-05D a paged 120-question room permits the first answer without eagerly loading all questions", async ({
  196 |   page,
  197 | }) => {
  198 |   await page.setViewportSize({ width: 1024, height: 1100 });
  199 |   await start(page);
  200 |   const menu = page.locator("summary").filter({ hasText: "Kịch bản mẫu" });
  201 |   await menu.click();
  202 |   await page.getByRole("button", { name: "Tạo đề 120 câu", exact: true }).click();
  203 |   await page
  204 |     .locator("details")
  205 |     .getByRole("link")
  206 |     .filter({ hasText: /^00000000/ })
> 207 |     .click();
      |      ^ Error: locator.click: Test timeout of 45000ms exceeded.
  208 |   await menu.click();
  209 |   await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
  210 |   await page.getByRole("dialog").getByRole("button", { name: "Bắt đầu", exact: true }).click();
  211 |   await expect(page.getByRole("heading", { name: "Stress prompt 1", exact: true })).toBeVisible();
  212 |   await page.getByRole("radio", { name: "Một", exact: true }).check();
  213 |   await saved(page);
  214 |   await expect(page.getByText(/Đã trả lời 1 trên 20 câu đã tải/)).toBeVisible();
  215 |   await expect(page.getByRole("button", { name: "Tải thêm câu", exact: true })).toBeEnabled();
  216 |   await capture(page, "room-paged-120-1024");
  217 | });
  218 | 
```