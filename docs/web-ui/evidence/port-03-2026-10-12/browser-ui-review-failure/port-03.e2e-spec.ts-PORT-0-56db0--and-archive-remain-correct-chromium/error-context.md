# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: port-03.e2e-spec.ts >> PORT-03 option identity, candidate projection, type conversion and archive remain correct
- Location: e2e/port-03.e2e-spec.ts:74:1

# Error details

```
Test timeout of 45000ms exceeded.
```

```
Error: locator.selectOption: Test timeout of 45000ms exceeded.
Call log:
  - waiting for getByLabel('Loại', { exact: true })

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
                  - textbox "Đề bài" [ref=e89]: Những biện pháp nào giúp bảo vệ tài khoản quản trị?
                - paragraph [ref=e90]: 51/8000 ký tự
              - generic [ref=e91]:
                - heading "Lựa chọn và đáp án" [level=2] [ref=e92]
                - paragraph [ref=e93]: Chọn đúng một đáp án. Đáp án đi cùng nội dung khi sắp xếp lựa chọn.
                - group "Đáp án đúng" [ref=e94]:
                  - generic [ref=e96]:
                    - radio "Đáp án đúng 1" [checked] [ref=e97]
                    - generic [ref=e98]:
                      - generic [ref=e99]: Lựa chọn 1
                      - textbox "Lựa chọn 1" [ref=e100]: Bật xác thực đa yếu tố
                    - generic [ref=e101]:
                      - button "Lên lựa chọn 1" [disabled] [ref=e102]: ↑
                      - button "Xuống lựa chọn 1" [ref=e103] [cursor=pointer]: ↓
                      - button "Xóa lựa chọn 1" [ref=e104] [cursor=pointer]: ×
                  - generic [ref=e105]:
                    - radio "Đáp án đúng 2" [ref=e106]
                    - generic [ref=e107]:
                      - generic [ref=e108]: Lựa chọn 2
                      - textbox "Lựa chọn 2" [ref=e109]: Dùng chung tài khoản quản trị
                    - generic [ref=e110]:
                      - button "Lên lựa chọn 2" [ref=e111] [cursor=pointer]: ↑
                      - button "Xuống lựa chọn 2" [ref=e112] [cursor=pointer]: ↓
                      - button "Xóa lựa chọn 2" [ref=e113] [cursor=pointer]: ×
                  - generic [ref=e114]:
                    - radio "Đáp án đúng 3" [ref=e115]
                    - generic [ref=e116]:
                      - generic [ref=e117]: Lựa chọn 3
                      - textbox "Lựa chọn 3" [ref=e118]: Cấp quyền tối thiểu cần thiết
                    - generic [ref=e119]:
                      - button "Lên lựa chọn 3" [ref=e120] [cursor=pointer]: ↑
                      - button "Xuống lựa chọn 3" [disabled] [ref=e121]: ↓
                      - button "Xóa lựa chọn 3" [ref=e122] [cursor=pointer]: ×
                - generic [ref=e123]:
                  - button "Thêm lựa chọn" [ref=e124] [cursor=pointer]
                  - button "Bớt lựa chọn" [ref=e125] [cursor=pointer]
                - generic [ref=e126]:
                  - generic [ref=e127]: Giải thích
                  - textbox "Giải thích" [active] [ref=e128]: PRIVATE_EXPLANATION_SENTINEL
                - paragraph [ref=e129]: 28/8000 ký tự · Chỉ dành cho người được phép
            - complementary [ref=e130]:
              - heading "Xem trước nội dung" [level=2] [ref=e131]
              - paragraph [ref=e132]: Chỉ nội dung thí sinh được thấy; không kèm đáp án đúng hoặc giải thích.
              - generic [ref=e133]:
                - paragraph [ref=e134]: Một lựa chọn
                - paragraph [ref=e135]: Những biện pháp nào giúp bảo vệ tài khoản quản trị?
                - list [ref=e136]:
                  - listitem [ref=e137]:
                    - generic [aria-hidden] [ref=e138]: A
                    - paragraph [ref=e139]: Bật xác thực đa yếu tố
                  - listitem [ref=e140]:
                    - generic [aria-hidden] [ref=e141]: B
                    - paragraph [ref=e142]: Dùng chung tài khoản quản trị
                  - listitem [ref=e143]:
                    - generic [aria-hidden] [ref=e144]: C
                    - paragraph [ref=e145]: Cấp quyền tối thiểu cần thiết
              - button "Xem như thí sinh" [ref=e146] [cursor=pointer]
          - generic [ref=e147]:
            - paragraph [ref=e148]: Có thay đổi chưa lưu
            - button "Lưu câu" [ref=e150] [cursor=pointer]
      - contentinfo [ref=e151]: ExamPlatform · Vào nhịp thi
```

# Test source

```ts
  1   | import { readFile, mkdir, writeFile } from "node:fs/promises";
  2   | import path from "node:path";
  3   | 
  4   | import AxeBuilder from "@axe-core/playwright";
  5   | import { expect, test, type Page } from "playwright/test";
  6   | 
  7   | const evidence = path.resolve(
  8   |   process.env.WEB_EVIDENCE_DIR ?? "../../docs/web-ui/evidence/port-03-2026-10-12",
  9   |   "questions-import",
  10  | );
  11  | async function admin(page: Page, route: string) {
  12  |   await page.goto(`/login?return=${encodeURIComponent(route)}`);
  13  |   await page.getByLabel("Email").fill("candidate@example.test");
  14  |   await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("fixture-password-ok");
  15  |   await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  16  |   await page.waitForURL(`**${route}`);
  17  |   await page.locator("summary").filter({ hasText: "Kịch bản mẫu" }).click();
  18  |   await page.getByLabel("Quyền mẫu").selectOption("admin");
  19  |   await page.locator("summary").filter({ hasText: "Kịch bản mẫu" }).click();
  20  |   await page.evaluate(() => document.fonts.ready);
  21  | }
  22  | async function fault(page: Page, value: string) {
  23  |   await page.locator("summary").filter({ hasText: "Kịch bản mẫu" }).click();
  24  |   await page.getByLabel("Lỗi lưu tiếp theo").selectOption(value);
  25  |   await page.locator("summary").filter({ hasText: "Kịch bản mẫu" }).click();
  26  | }
  27  | async function capture(page: Page, name: string) {
  28  |   await mkdir(evidence, { recursive: true });
  29  |   const scan = await new AxeBuilder({ page })
  30  |     .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
  31  |     .analyze();
  32  |   const width = await page.evaluate(() => document.documentElement.scrollWidth);
  33  |   const fontLoaded = await page.evaluate(() =>
  34  |     document.fonts.check('400 16px "Be Vietnam Pro"', "Câu hỏi tiếng Việt"),
  35  |   );
  36  |   await writeFile(
  37  |     path.join(evidence, `${name}.json`),
  38  |     JSON.stringify(
  39  |       {
  40  |         viewport: page.viewportSize(),
  41  |         width,
  42  |         fontLoaded,
  43  |         violations: scan.violations,
  44  |         url: page.url(),
  45  |       },
  46  |       null,
  47  |       2,
  48  |     ),
  49  |   );
  50  |   await page.screenshot({
  51  |     path: path.join(evidence, `${name}.png`),
  52  |     fullPage: (await page.getByRole("dialog").count()) === 0,
  53  |   });
  54  |   expect(scan.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual(
  55  |     [],
  56  |   );
  57  |   expect(fontLoaded).toBe(true);
  58  |   expect(width).toBeLessThanOrEqual(page.viewportSize()!.width);
  59  | }
  60  | test("PORT-03 bank filters loaded questions without keys and fits Web/tablet", async ({ page }) => {
  61  |   await admin(page, "/admin/questions");
  62  |   const bank = page.getByRole("region", { name: "Ngân hàng câu hỏi" });
  63  |   await expect(bank.getByRole("link").first()).toBeVisible();
  64  |   await expect(bank.getByRole("columnheader", { name: "Đáp án", exact: true })).toHaveCount(0);
  65  |   for (const width of [1440, 1280, 1024, 768]) {
  66  |     await page.setViewportSize({ width, height: 1000 });
  67  |     await capture(page, `bank-${width}`);
  68  |   }
  69  |   await page.getByRole("combobox", { name: "Loại câu hỏi" }).selectOption("TRUE_FALSE");
  70  |   await expect(bank).toContainText("Đúng / Sai");
  71  |   await page.getByLabel("Tìm trong phần đã tải").fill("no-matching-loaded-question");
  72  |   await expect(page.getByRole("heading", { name: "Không khớp bộ lọc" })).toBeVisible();
  73  | });
  74  | test("PORT-03 option identity, candidate projection, type conversion and archive remain correct", async ({
  75  |   page,
  76  | }) => {
  77  |   const errors: string[] = [];
  78  |   page.on("pageerror", (error) => errors.push(error.message));
  79  |   await page.setViewportSize({ width: 1440, height: 1000 });
  80  |   await admin(page, "/admin/questions/new");
  81  |   await page
  82  |     .getByLabel("Đề bài", { exact: true })
  83  |     .fill("Những biện pháp nào giúp bảo vệ tài khoản quản trị?");
  84  |   await page.getByLabel("Lựa chọn 1", { exact: true }).fill("Bật xác thực đa yếu tố");
  85  |   await page.getByLabel("Lựa chọn 2", { exact: true }).fill("Dùng chung tài khoản quản trị");
  86  |   await page.getByRole("button", { name: "Thêm lựa chọn", exact: true }).click();
  87  |   await page.getByLabel("Lựa chọn 3", { exact: true }).fill("Cấp quyền tối thiểu cần thiết");
  88  |   await page.getByLabel("Giải thích", { exact: true }).fill("PRIVATE_EXPLANATION_SENTINEL");
  89  |   await capture(page, "create-single-1440");
> 90  |   await page.getByLabel("Loại", { exact: true }).selectOption("MULTIPLE_CHOICE");
      |                                                  ^ Error: locator.selectOption: Test timeout of 45000ms exceeded.
  91  |   await page.getByRole("checkbox", { name: "Đáp án đúng 3" }).check();
  92  |   await page.getByRole("button", { name: "Lên lựa chọn 3", exact: true }).click();
  93  |   await expect(page.getByRole("checkbox", { name: "Đáp án đúng 2" })).toBeChecked();
  94  |   await expect(page.getByLabel("Lựa chọn 2", { exact: true })).toHaveValue(
  95  |     "Cấp quyền tối thiểu cần thiết",
  96  |   );
  97  |   await capture(page, "create-multiple-1440");
  98  |   await page.setViewportSize({ width: 768, height: 1024 });
  99  |   await capture(page, "editor-768");
  100 |   await page.getByRole("button", { name: "Xem như thí sinh" }).click();
  101 |   const preview = page.getByRole("dialog", { name: "Xem câu hỏi như thí sinh" });
  102 |   await expect(preview).not.toContainText("PRIVATE_EXPLANATION_SENTINEL");
  103 |   await expect(preview.getByRole("checkbox")).toHaveCount(0);
  104 |   await capture(page, "candidate-preview-768");
  105 |   await page.keyboard.press("Escape");
  106 |   await page.getByLabel("Loại", { exact: true }).selectOption("TRUE_FALSE");
  107 |   await capture(page, "type-change-768");
  108 |   await page.getByRole("button", { name: "Đổi loại", exact: true }).click();
  109 |   await expect(page.getByRole("radio", { name: "Đáp án đúng 1" })).toBeChecked();
  110 |   await capture(page, "create-true-false-768");
  111 |   await page.getByRole("button", { name: "Lưu câu", exact: true }).click();
  112 |   await expect(page).toHaveURL(/\/admin\/questions\/[^/]+\/edit$/);
  113 |   await page.setViewportSize({ width: 1280, height: 1000 });
  114 |   await page.getByLabel("Đề bài", { exact: true }).fill("Bản đang sửa cục bộ");
  115 |   await fault(page, "conflict-save");
  116 |   await page.getByRole("button", { name: "Lưu câu", exact: true }).click();
  117 |   await expect(page.getByRole("dialog", { name: "Câu hỏi đã thay đổi ở nơi khác" })).toContainText(
  118 |     "Bản đang sửa cục bộ",
  119 |   );
  120 |   await capture(page, "question-conflict-1280");
  121 |   await page.getByRole("button", { name: "Bỏ sửa và dùng bản mới" }).click();
  122 |   await expect(page.getByLabel("Đề bài", { exact: true })).not.toHaveValue("Bản đang sửa cục bộ");
  123 |   await fault(page, "lose-ack");
  124 |   await page.getByRole("button", { name: "Lưu câu", exact: true }).click();
  125 |   await expect(page.getByText("Chưa xác nhận được kết quả", { exact: true })).toBeVisible();
  126 |   await capture(page, "question-unknown-1280");
  127 |   await page.getByRole("button", { name: "Thử lại yêu cầu", exact: true }).click();
  128 |   await expect(page.getByText("Đã lưu câu vào ngân hàng.", { exact: true })).toBeVisible();
  129 |   await fault(page, "delay-ack");
  130 |   await page.getByRole("button", { name: "Lưu trữ", exact: true }).click();
  131 |   await capture(page, "archive-confirm-1280");
  132 |   await page.getByRole("dialog").getByRole("button", { name: "Xác nhận", exact: true }).click();
  133 |   await page.keyboard.press("Escape");
  134 |   await expect(page.getByRole("dialog", { name: "Lưu trữ câu hỏi" })).toBeVisible();
  135 |   await expect(page.getByRole("button", { name: "Lưu câu", exact: true })).toBeDisabled();
  136 |   await expect(page.getByText("Đã lưu trữ", { exact: true })).toBeVisible();
  137 |   await expect(page.getByLabel("Đề bài", { exact: true })).toBeDisabled();
  138 |   expect(errors).toEqual([]);
  139 | });
  140 | test("PORT-03 validates exact import snapshot and recovers an unknown atomic commit", async ({
  141 |   page,
  142 | }) => {
  143 |   await page.setViewportSize({ width: 1440, height: 1000 });
  144 |   await admin(page, "/admin/imports/new");
  145 |   const sample = await readFile(
  146 |     path.resolve(
  147 |       "../../docs/web-ui/templates/codex-desktop-v1/groups/questions-import/sample-import.json",
  148 |     ),
  149 |     "utf8",
  150 |   );
  151 |   await page.getByLabel("Nội dung JSON", { exact: true }).fill(sample);
  152 |   await capture(page, "import-input-1440");
  153 |   await page.getByRole("button", { name: "Kiểm tra dữ liệu", exact: true }).click();
  154 |   await expect(page.getByText("Chưa ghi ngân hàng", { exact: true })).toBeVisible();
  155 |   for (const width of [1440, 1024, 768]) {
  156 |     await page.setViewportSize({ width, height: 1000 });
  157 |     await capture(page, `import-valid-${width}`);
  158 |   }
  159 |   const commit = page.getByRole("button", { name: "Nhập câu hỏi", exact: true });
  160 |   await page.getByLabel("Nội dung JSON", { exact: true }).fill("{}");
  161 |   await expect(commit).toBeDisabled();
  162 |   await page.getByLabel("Nội dung JSON", { exact: true }).fill(sample);
  163 |   await page.getByRole("button", { name: "Kiểm tra dữ liệu", exact: true }).click();
  164 |   await commit.click();
  165 |   await capture(page, "import-confirm-768");
  166 |   await page.keyboard.press("Escape");
  167 |   await expect(commit).toBeFocused();
  168 |   await fault(page, "lose-ack");
  169 |   await commit.click();
  170 |   await page
  171 |     .getByRole("dialog")
  172 |     .getByRole("button", { name: "Nhập vào ngân hàng", exact: true })
  173 |     .click();
  174 |   await expect(page.getByRole("dialog")).toContainText("Chưa biết kết quả lần gửi");
  175 |   await capture(page, "import-unknown-768");
  176 |   await page
  177 |     .getByRole("dialog")
  178 |     .getByRole("button", { name: "Thử lại yêu cầu", exact: true })
  179 |     .click();
  180 |   await expect(page.getByRole("heading", { name: "Báo cáo nhập", exact: true })).toBeVisible();
  181 |   const mappings = page.getByRole("region", { name: "Các câu đã nhập" });
  182 |   await expect(mappings.getByRole("row")).toHaveCount(4);
  183 |   for (const width of [1440, 1280, 1024, 768]) {
  184 |     await page.setViewportSize({ width, height: 1000 });
  185 |     await capture(page, `report-${width}`);
  186 |   }
  187 | });
  188 | 
```