# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: port-05e.e2e-spec.ts >> PORT-05E pending/reset/logout/reauth dialogs remain accessible and truthful
- Location: e2e/port-05e.e2e-spec.ts:167:1

# Error details

```
Error: locator.fill: Error: strict mode violation: getByLabel('Tên hiển thị') resolved to 2 elements:
    1) <input id="_r_4_" required="" value="Lan Nguyễn" autocomplete="name" aria-describedby="profile-name-help profile-name-count"/> aka getByRole('textbox', { name: 'Tên hiển thị' })
    2) <input type="checkbox"/> aka getByRole('checkbox', { name: 'Tham gia bảng xếp hạng Khi bậ' })

Call log:
  - waiting for getByLabel('Tên hiển thị')

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
            - paragraph [ref=e51]: TÀI KHOẢN CỦA BẠN
            - heading "Hồ sơ thí sinh" [level=1] [ref=e52]
            - paragraph [ref=e53]: Quản lý tên hiển thị và lựa chọn tham gia bảng xếp hạng.
          - generic [ref=e54]:
            - complementary "Thông tin đã xác nhận" [ref=e55]:
              - generic [aria-hidden] [ref=e56]: LN
              - heading "Lan Nguyễn" [level=2] [ref=e57]
              - paragraph [ref=e58]: ✓ Đã xác thực email
              - generic [ref=e59]:
                - term [ref=e60]: Email · Chỉ đọc
                - definition [ref=e61]: candidate@example.test
                - term [ref=e62]: Xác thực lúc
                - definition [ref=e63]: 10:57 12/10/2026 · Giờ Việt Nam UTC+7
              - paragraph [ref=e64]: Email này dùng để đăng nhập. Trang Hồ sơ hiện chưa hỗ trợ đổi email.
              - link "Xem lịch sử thi →" [ref=e65] [cursor=pointer]:
                - /url: /history
            - generic [ref=e66]:
              - region [ref=e67]:
                - generic [ref=e68]:
                  - heading "Cài đặt thông tin" [level=2] [ref=e69]
                  - paragraph [ref=e70]: Chỉ thay đổi được máy chủ xác nhận mới là bản đã lưu.
                - generic [ref=e71]:
                  - generic [ref=e72]:
                    - generic [ref=e73]: Tên hiển thị
                    - textbox "Tên hiển thị" [ref=e74]: Lan Nguyễn
                  - generic [ref=e75]:
                    - paragraph [ref=e76]: Từ 1 đến 80 ký tự.
                    - paragraph [ref=e77]: 10/80 ký tự
                  - generic [ref=e78] [cursor=pointer]:
                    - checkbox "Tham gia bảng xếp hạng Khi bật, kết quả tốt nhất có thể xuất hiện với bí danh trong bảng xếp hạng được mở. Email và tên hiển thị không được đưa vào bảng. Tắt · Không tham gia" [ref=e79]
                    - generic [ref=e80]:
                      - strong [ref=e81]: Tham gia bảng xếp hạng
                      - generic [ref=e82]: Khi bật, kết quả tốt nhất có thể xuất hiện với bí danh trong bảng xếp hạng được mở. Email và tên hiển thị không được đưa vào bảng.
                      - generic [ref=e83]: Tắt · Không tham gia
                  - generic [ref=e84]:
                    - button "Hủy thay đổi" [disabled] [ref=e85]
                    - button "Lưu thay đổi" [disabled] [ref=e86]
              - region [ref=e87]:
                - generic [ref=e88]:
                  - heading "Phiên làm việc" [level=2] [ref=e89]
                  - paragraph [ref=e90]: Đăng xuất khỏi phiên hiện tại. Thay đổi chưa xác nhận chỉ được giữ trong bộ nhớ trang.
                - button "Đăng xuất tài khoản" [ref=e91] [cursor=pointer]
      - contentinfo [ref=e92]: ExamPlatform · Vào nhịp thi
```

# Test source

```ts
  72  |   expect(state.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  73  |   expect(state.left).toBeGreaterThanOrEqual(16);
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
> 172 |   await page.getByLabel("Tên hiển thị").fill("Lan Nguyễn · chờ phản hồi");
      |                                         ^ Error: locator.fill: Error: strict mode violation: getByLabel('Tên hiển thị') resolved to 2 elements:
  173 |   await fault(page, "delay-ack");
  174 |   await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  175 |   await expect(page.getByText("Đang lưu hồ sơ…", { exact: true })).toBeVisible();
  176 |   await capture(page, "profile-pending-1280");
  177 |   await saved(page);
  178 |   await page.setViewportSize({ width: 1024, height: 1100 });
  179 |   await page.getByLabel("Tên hiển thị").fill("Bản sẽ bỏ");
  180 |   const reset = page.getByRole("button", { name: "Hủy thay đổi", exact: true });
  181 |   await reset.click();
  182 |   await capture(page, "profile-reset-1024");
  183 |   await page.keyboard.press("Escape");
  184 |   await expect(reset).toBeFocused();
  185 |   await reset.click();
  186 |   await page.getByRole("button", { name: "Bỏ thay đổi", exact: true }).click();
  187 |   await expect(page.getByLabel("Tên hiển thị")).toHaveValue("Lan Nguyễn · chờ phản hồi");
  188 |   await page.getByLabel("Tên hiển thị").fill("  ");
  189 |   await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  190 |   await expect(page.getByText("Tên hiển thị từ 1 đến 80 ký tự.", { exact: true })).toBeVisible();
  191 |   await capture(page, "profile-validation-1024");
  192 |   await page.setViewportSize({ width: 768, height: 1100 });
  193 |   await page.getByRole("button", { name: "Đăng xuất tài khoản", exact: true }).click();
  194 |   await capture(page, "profile-logout-768");
  195 |   await page.keyboard.press("Escape");
  196 |   await page.evaluate(() => {
  197 |     const channel = new BroadcastChannel("exam-platform-session");
  198 |     channel.postMessage({ type: "reauth" });
  199 |     channel.close();
  200 |   });
  201 |   await expect(page.getByText("Cần đăng nhập lại", { exact: true })).toBeVisible();
  202 |   await expect(page.getByLabel("Tên hiển thị")).toHaveCount(0);
  203 |   await capture(page, "profile-reauth-768");
  204 | });
  205 | 
```