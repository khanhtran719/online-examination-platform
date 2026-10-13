# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: port-05d.e2e-spec.ts >> PORT-05D same-actor reauth and offline local choices retain truthful save feedback
- Location: e2e/port-05d.e2e-spec.ts:161:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('status').filter({ hasText: 'Chưa kết nối' })
Expected: visible
Error: strict mode violation: getByRole('status').filter({ hasText: 'Chưa kết nối' }) resolved to 2 elements:
    1) <div role="status" data-phase="offline" class="_saveStatus_yht6k_38">…</div> aka getByText('!Chưa kết nối. Các thay đổi')
    2) <div role="status" class="_warning_r2gsm_132">…</div> aka getByText('Chưa kết nốiThay đổi chỉ được')

Call log:
  - Expect "toBeVisible" getByRole('status').filter({ hasText: 'Chưa kết nối' }) with timeout 12000ms
  - waiting for getByRole('status').filter({ hasText: 'Chưa kết nối' })

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
      - option "Xung đột phiên bản"
      - option "Giới hạn lưu"
      - option "Máy chủ bận khi lưu" [selected]
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
          - text: Chưa kết nối. Các thay đổi hiện chỉ ở trình duyệt
        - generic [ref=e20]:
          - generic [ref=e21]: Thời gian còn lại
          - paragraph [ref=e22]: 29:57
        - button "Nộp bài" [disabled] [ref=e23]
      - generic [ref=e24]:
        - paragraph [ref=e25]: Đã trả lời 1 trên 3 câu đã tải. Phiên bản này có 3 câu; câu chưa tải không tính là bỏ trống.
        - progressbar "Câu đã trả lời trong phần đã tải" [ref=e26]
    - main [ref=e27]:
      - generic [ref=e29]:
        - generic [ref=e30]:
          - paragraph [ref=e31]: LÀM BÀI · PHIÊN BẢN ĐÃ KHÓA
          - heading "TOEIC — Reading practice" [level=1] [ref=e32]
          - paragraph [ref=e33]: Hạn nộp 10:27 13/10/2026 · Giờ Việt Nam UTC+7
        - status [ref=e34]:
          - strong [ref=e35]: Chưa kết nối
          - generic [ref=e36]:
            - paragraph [ref=e37]: Thay đổi chỉ được giữ trong bộ nhớ trang này. Đừng tải lại trang khi chưa được xác nhận.
            - button "Thử lưu lại" [ref=e38] [cursor=pointer]
        - article [ref=e39]:
          - paragraph [ref=e40]: Câu 1 · Một lựa chọn · 2 điểm
          - heading "Choose the best word." [level=2] [ref=e41]
          - group "Chọn một đáp án bạn cho là đúng." [ref=e42]:
            - generic [ref=e44] [cursor=pointer]:
              - radio "accurate" [ref=e45]
              - generic [aria-hidden] [ref=e46]: A
              - generic [ref=e47]: accurate
            - generic [ref=e48] [cursor=pointer]:
              - radio "late" [checked] [active] [ref=e49]
              - generic [aria-hidden] [ref=e50]: B
              - generic [ref=e51]: late
              - generic [aria-hidden] [ref=e52]: ✓ Đã chọn
            - generic [ref=e53] [cursor=pointer]:
              - radio "empty" [ref=e54]
              - generic [aria-hidden] [ref=e55]: C
              - generic [ref=e56]: empty
          - generic [ref=e57]:
            - generic [ref=e58]:
              - checkbox "Đánh dấu để xem lại" [ref=e59]
              - generic [aria-hidden] [ref=e60]: ⚑
              - text: Đánh dấu để xem lại
            - button "Xóa đáp án" [ref=e61] [cursor=pointer]
        - generic [ref=e62]:
          - button "Câu trước" [disabled] [ref=e63]
          - button "Câu sau" [ref=e64] [cursor=pointer]
          - button "Danh sách câu hỏi" [ref=e65] [cursor=pointer]
        - paragraph [ref=e66]:
          - text: Chỉ đáp án được máy chủ xác nhận mới được ghi nhận.
          - link "Xem trạng thái xử lý" [ref=e67] [cursor=pointer]:
            - /url: /attempts/01a13331-b234-75c7-8ae7-38198dac1073/status
```

# Test source

```ts
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
  97  |       await expect(page.getByRole("dialog").getByRole("button", { name: /Câu 3,/ })).toBeVisible();
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
> 185 |   await expect(page.getByRole("status").filter({ hasText: "Chưa kết nối" })).toBeVisible();
      |                                                                              ^ Error: expect(locator).toBeVisible() failed
  186 |   await capture(page, "room-offline-768");
  187 |   await page.evaluate(() => dispatchEvent(new Event("online")));
  188 |   await saved(page);
  189 |   await expect(page.getByRole("radio", { name: "late", exact: true })).toBeChecked();
  190 |   await page.emulateMedia({ reducedMotion: "reduce" });
  191 |   await capture(page, "room-reduced-motion-768");
  192 | });
  193 | 
```