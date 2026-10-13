# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: port-05b.e2e-spec.ts >> PORT-05B fallback and closed boards do not invent titles or unlock on refresh
- Location: e2e/port-05b.e2e-spec.ts:107:1

# Error details

```
Error: expect(locator).not.toBeChecked() failed

Locator: getByRole('checkbox', { name: /Tham gia bảng xếp hạng/ })
Expected: not checked
Timeout: 12000ms
Error: element(s) not found

Call log:
  - Expect "not toBeChecked" getByRole('checkbox', { name: /Tham gia bảng xếp hạng/ }) with timeout 12000ms
  - waiting for getByRole('checkbox', { name: /Tham gia bảng xếp hạng/ })

```

```yaml
- status: Dữ liệu mẫu. Đây không phải dữ liệu vận hành và không chứng minh bản live.
- group: Kịch bản mẫu
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
  - text: Thí sinh
  - 'link "Hồ sơ: Lan Nguyễn"':
    - /url: /profile
    - text: Lan Nguyễn
  - button "Đăng xuất"
- main:
  - heading "Hồ sơ" [level=1]
  - paragraph: candidate@example.test
  - paragraph: Revision 1
  - paragraph: "Quyền demo hiện tại: catalog.read, assessment.take, assessment.result.read. Công tắc quyền nằm ở thanh dữ liệu mẫu, không phải hồ sơ thật."
  - text: Tên hiển thị
  - textbox "Tên hiển thị": Lan Nguyễn
  - checkbox "Hiện bí danh trên bảng xếp hạng. Tên hiển thị không được đưa vào bảng."
  - text: Hiện bí danh trên bảng xếp hạng. Tên hiển thị không được đưa vào bảng.
  - button "Lưu hồ sơ" [disabled]
- contentinfo: ExamPlatform · Vào nhịp thi
```

# Test source

```ts
  20  | }
  21  | async function navigate(page: Page, route: string) {
  22  |   await page.evaluate((to) => {
  23  |     history.pushState(null, "", to);
  24  |     dispatchEvent(new PopStateEvent("popstate"));
  25  |   }, route);
  26  |   await page.waitForURL(`**${route}`);
  27  | }
  28  | async function capture(page: Page, name: string) {
  29  |   await mkdir(evidence, { recursive: true });
  30  |   await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  31  |   const scan = await new AxeBuilder({ page })
  32  |     .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
  33  |     .analyze();
  34  |   const state = await page.evaluate(() => ({
  35  |     width: document.documentElement.scrollWidth,
  36  |     contentLeft: document.querySelector("main > div")!.getBoundingClientRect().left,
  37  |     contentRight: document.querySelector("main > div")!.getBoundingClientRect().right,
  38  |     fontLoaded: document.fonts.check('400 16px "Be Vietnam Pro"', "Câu hỏi tiếng Việt"),
  39  |   }));
  40  |   await writeFile(
  41  |     path.join(evidence, `${name}.json`),
  42  |     JSON.stringify(
  43  |       { ...state, viewport: page.viewportSize(), url: page.url(), violations: scan.violations },
  44  |       null,
  45  |       2,
  46  |     ),
  47  |   );
  48  |   await page.screenshot({ path: path.join(evidence, `${name}.png`), fullPage: true });
  49  |   expect(scan.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) }))).toEqual(
  50  |     [],
  51  |   );
  52  |   expect(state.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  53  |   expect(state.fontLoaded).toBe(true);
  54  |   expect(state.contentLeft).toBeGreaterThanOrEqual(16);
  55  |   expect(state.contentRight).toBeLessThanOrEqual(page.viewportSize()!.width - 16);
  56  | }
  57  | test("PORT-05B History and version board fit Web/tablet with truthful metadata and scores", async ({
  58  |   page,
  59  | }) => {
  60  |   const errors: string[] = [];
  61  |   page.on("pageerror", (error) => errors.push(error.message));
  62  |   await candidate(page);
  63  |   await expect(page.getByRole("heading", { level: 1 })).toHaveText("TOEIC — Reading practice");
  64  |   await navigate(page, "/exams/00000000-0000-4000-8000-000000000101");
  65  |   await expect(page.getByRole("heading", { level: 1 })).toHaveText(
  66  |     "IT Certification — Networking Fundamentals",
  67  |   );
  68  |   for (const width of [1440, 1280, 1024, 768]) {
  69  |     await page.setViewportSize({ width, height: 1000 });
  70  |     await navigate(page, "/history");
  71  |     await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lịch sử thi");
  72  |     const history = page.getByRole("region", { name: "Lịch sử các lượt thi" });
  73  |     await expect(history).toContainText("TOEIC — Reading practice");
  74  |     await expect(history).toContainText("Phiên bản …000211");
  75  |     await expect(history.getByText("Chưa có điểm", { exact: true })).toHaveCount(2);
  76  |     await expect(history.getByRole("link", { name: "Tiếp tục", exact: true })).toHaveAttribute(
  77  |       "href",
  78  |       "/attempts/00000000-0000-4000-8000-000000000402",
  79  |     );
  80  |     await expect(
  81  |       history.getByRole("link", { name: "Xem trạng thái", exact: true }),
  82  |     ).toHaveAttribute("href", "/attempts/00000000-0000-4000-8000-000000000403/status");
  83  |     await expect(
  84  |       page.getByText("Đã tải 3 lượt thi · Đã hết danh sách", { exact: true }),
  85  |     ).toBeVisible();
  86  |     await capture(page, `history-${width}`);
  87  |     if (width === 768) {
  88  |       await history.focus();
  89  |       await page.keyboard.press("ArrowRight");
  90  |       await expect.poll(() => history.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  91  |       const refresh = page.getByRole("button", { name: "Làm mới", exact: true });
  92  |       await refresh.focus();
  93  |       await page.keyboard.press("Enter");
  94  |       await expect(refresh).toBeFocused();
  95  |     }
  96  |     await navigate(page, `/exams/${exam}/versions/${version}/leaderboard`);
  97  |     await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bảng xếp hạng");
  98  |     const board = page.getByRole("region", { name: "Xếp hạng bằng bí danh" });
  99  |     await expect(board).toContainText("candidate-8b473ec4");
  100 |     await expect(board).not.toContainText("Lan Nguyễn");
  101 |     await expect(board).not.toContainText("candidate@example.test");
  102 |     await expect(page.getByText(/Xem trang không đồng nghĩa/)).toBeVisible();
  103 |     await capture(page, `leaderboard-${width}`);
  104 |   }
  105 |   expect(errors).toEqual([]);
  106 | });
  107 | test("PORT-05B fallback and closed boards do not invent titles or unlock on refresh", async ({
  108 |   page,
  109 | }) => {
  110 |   await page.setViewportSize({ width: 768, height: 1000 });
  111 |   await candidate(page, "/history");
  112 |   await expect(page.getByRole("region", { name: "Lịch sử các lượt thi" })).not.toContainText(
  113 |     "TOEIC — Reading practice",
  114 |   );
  115 |   await capture(page, "history-fallback-768");
  116 |   await navigate(page, `/exams/${exam}/versions/${version}/leaderboard`);
  117 |   await expect(page.getByRole("region", { name: "Xếp hạng bằng bí danh" })).toBeVisible();
  118 |   await capture(page, "leaderboard-fallback-768");
  119 |   await page.getByRole("link", { name: "Quản lý tham gia →", exact: true }).click();
> 120 |   await expect(page.getByRole("checkbox", { name: /Tham gia bảng xếp hạng/ })).not.toBeChecked();
      |                                                                                    ^ Error: expect(locator).not.toBeChecked() failed
  121 |   await navigate(page, `/exams/${exam}/versions/00000000-0000-4000-8000-000000000999/leaderboard`);
  122 |   await expect(page.getByRole("heading", { name: "Bảng xếp hạng không mở" })).toBeVisible();
  123 |   await expect(page.getByRole("button", { name: "Làm mới", exact: true })).toBeDisabled();
  124 |   await expect(page.getByRole("region", { name: "Xếp hạng bằng bí danh" })).toHaveCount(0);
  125 |   await capture(page, "leaderboard-closed-768");
  126 | });
  127 | 
```