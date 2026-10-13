import { mkdir, writeFile } from "node:fs/promises";
import { release } from "node:os";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "playwright/test";

test.use({ trace: "off", screenshot: "off", video: "off" });
const evidence = path.resolve(
  process.env.WEB_EVIDENCE_DIR ?? "../../.local/web-evidence/latest",
  "dashboard",
);
const uuid = (n: number) => "019a7450-0000-7000-8000-" + String(n).padStart(12, "0");
const actor = uuid(1),
  examId = uuid(2),
  version = uuid(3),
  running = uuid(4),
  completed = uuid(5);
const date = "2026-10-13T00:00:00Z";
const longTitle =
  "Nền tảng điện toán đám mây — Bài ôn tập kiến thức về quyền truy cập, mạng và bảo vệ dữ liệu trong hệ thống doanh nghiệp";
const exam = {
  id: examId,
  title: longTitle,
  category: "IT_CERTIFICATION",
  publishedVersionId: version,
  version: 1,
  durationSeconds: 2700,
  openAt: "2026-10-01T00:00:00Z",
  closeAt: "2026-11-01T00:00:00Z",
  displayTimezone: "Asia/Ho_Chi_Minh",
  attemptLimit: 3,
  questionCount: 6,
  scoringPolicy: "EXACT_MATCH_V1",
  explanationPolicy: "NEVER",
  leaderboardEnabled: false,
  sections: [
    { id: uuid(6), title: "Kiến thức nền", position: 1, questionCount: 3, possible: 30 },
    { id: uuid(7), title: "Tình huống", position: 2, questionCount: 3, possible: 30 },
  ],
};
const history = [
  {
    attemptId: running,
    examId,
    publishedVersionId: version,
    startedAt: date,
    status: "IN_PROGRESS",
    expired: false,
    earned: null,
    possible: null,
  },
  {
    attemptId: completed,
    examId,
    publishedVersionId: version,
    startedAt: date,
    status: "COMPLETED",
    expired: false,
    earned: 0,
    possible: 60,
  },
  {
    attemptId: uuid(8),
    examId,
    publishedVersionId: version,
    startedAt: date,
    status: "PROCESSING",
    expired: true,
    earned: null,
    possible: null,
  },
];
test.beforeAll(async ({ browser }) => {
  await mkdir(evidence, { recursive: true });
  await writeFile(
    path.join(path.dirname(evidence), "runtime.json"),
    JSON.stringify(
      {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        osRelease: release(),
        playwright: "1.63.0",
        chromium: browser.version(),
      },
      null,
      2,
    ),
  );
});
async function capture(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  const state = await page.evaluate(() => {
    const frame = document.querySelector("main > div")!.getBoundingClientRect();
    return {
      documentWidth: document.documentElement.scrollWidth,
      left: frame.left,
      right: frame.right,
      fontLoaded: document.fonts.check('400 16px "Be Vietnam Pro"', "Bảng làm việc"),
    };
  });
  await mkdir(evidence, { recursive: true });
  await writeFile(
    path.join(evidence, name + ".json"),
    JSON.stringify(
      {
        ...state,
        viewport: page.viewportSize(),
        violations: scan.violations.map((v) => ({
          id: v.id,
          targets: v.nodes.map((node) => node.target),
        })),
        mode: page.url().includes(":4174")
          ? "synthetic HTTP in live adapter; not actual business/HTTPS acceptance"
          : "demo",
      },
      null,
      2,
    ),
  );
  await page.screenshot({ path: path.join(evidence, name + ".png"), fullPage: true });
  expect(scan.violations.map((v) => v.id)).toEqual([]);
  expect(state.fontLoaded).toBe(true);
  expect(state.documentWidth).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(state.left).toBeGreaterThanOrEqual(24);
  expect(state.right).toBeLessThanOrEqual(page.viewportSize()!.width - 24);
}
interface Faults {
  historyStatus?: number;
  catalogStatus?: number;
  empty?: boolean;
  holdHistory?: Promise<void>;
  wait?: number;
}
async function liveFixture(page: Page, faults: Faults = {}) {
  const requests: { path: string; pageSize: string | null; category: string | null }[] = [];
  await page.route("**/v1/**", async (route) => {
    const url = new URL(route.request().url());
    requests.push({
      path: url.pathname,
      pageSize: url.searchParams.get("pageSize"),
      category: url.searchParams.get("category"),
    });
    let status = 200,
      data: unknown,
      metadata: unknown;
    if (url.pathname === "/v1/me")
      data = {
        id: actor,
        email: "candidate@example.test",
        displayName:
          "Nguyễn Thị Phương Lan · ôn thi kiến thức nền tảng công nghệ và quản lý dữ liệu",
        emailVerifiedAt: date,
        leaderboardOptIn: false,
        revision: 1,
      };
    else if (url.pathname === "/v1/me/attempts") {
      if (faults.holdHistory) await faults.holdHistory;
      status = faults.historyStatus ?? 200;
      data = faults.empty ? [] : history;
      metadata = { next: faults.empty ? null : "history-next", pageSize: 20 };
    } else if (url.pathname === "/v1/exams") {
      status = faults.catalogStatus ?? 200;
      data = faults.empty
        ? []
        : [
            exam,
            {
              ...exam,
              id: uuid(9),
              publishedVersionId: uuid(10),
              title: "Kiến thức nền tảng mạng và hệ điều hành",
            },
            {
              ...exam,
              id: uuid(11),
              publishedVersionId: uuid(12),
              title: "Ôn tập phân tích và bảo vệ dữ liệu",
            },
          ];
      metadata = { next: faults.empty ? null : "catalog-next", pageSize: 3 };
    } else if (url.pathname === `/v1/exams/${examId}`) data = exam;
    else {
      status = 404;
      data = null;
    }
    const body =
      status >= 400
        ? {
            data: null,
            errorCode: "Không thực hiện được yêu cầu.",
            message: "Không thực hiện được yêu cầu.",
            status: false,
          }
        : { data, errorCode: null, message: null, status: true, ...(metadata ? { metadata } : {}) };
    await route.fulfill({
      status,
      contentType: "application/json",
      headers: status === 429 ? { "Retry-After": String(faults.wait ?? 90) } : {},
      body: JSON.stringify(body),
    });
  });
  return requests;
}
async function ready(page: Page) {
  await expect(page.getByRole("link", { name: "Vào phòng thi", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /0\/60 điểm/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Xem đề/ })).toHaveCount(3);
}

test("PORT-05G Dashboard demo remains usable and fits Web/tablet without a fake timer or score summary", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/login");
  await page.getByLabel("Email").fill("candidate@example.test");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("fixture-password-ok");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("link", { name: "Vào phòng thi", exact: true })).toBeVisible();
  for (const width of [768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1100 });
    await capture(page, "normal-" + width);
  }
  await page.getByRole("button", { name: "IELTS", exact: true }).focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: "IELTS", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.getByRole("heading", { name: "Chưa có đề thi trong danh mục này" }),
  ).toBeVisible();
  await capture(page, "empty-category-1440");
  await page.getByRole("button", { name: "Tất cả", exact: true }).click();
  await expect(page.getByRole("link", { name: /Networking Fundamentals/ })).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await capture(page, "reduced-motion-1440");
  expect(
    await page.getByText(/điểm trung bình|bạn có \d+ lượt|phòng thi bảo mật|LocalStorage/i).count(),
  ).toBe(0);
  expect(errors).toEqual([]);
});

test("PORT-05G long names, exact frozen metadata, zero/null scores and bounded request budget", async ({
  page,
}) => {
  const requests = await liveFixture(page);
  await page.goto("http://127.0.0.1:4174/dashboard");
  await ready(page);
  expect(requests.filter((r) => r.path === "/v1/me/attempts").map((r) => r.pageSize)).toEqual([
    "20",
  ]);
  expect(requests.filter((r) => r.path === "/v1/exams").map((r) => r.pageSize)).toEqual(["3"]);
  expect(requests.filter((r) => /^\/v1\/(?:attempts|exams\/.+)/.test(r.path))).toEqual([]);
  await expect(page.getByRole("link", { name: /0\/60 điểm/ })).toHaveAttribute(
    "href",
    `/attempts/${completed}/result`,
  );
  await expect(page.getByRole("link", { name: /Chưa có điểm/ })).toHaveAttribute(
    "href",
    `/attempts/${uuid(8)}/status`,
  );
  await page.getByRole("link", { name: new RegExp(longTitle) }).click();
  await expect(page.getByRole("heading", { name: longTitle, exact: true })).toBeVisible();
  await page
    .getByRole("navigation", { name: "Chính", exact: true })
    .getByRole("link", { name: "Bảng làm việc", exact: true })
    .click();
  await ready(page);
  await expect(
    page
      .getByRole("region", { name: "Lượt đang làm" })
      .getByRole("heading", { name: longTitle, exact: true }),
  ).toBeVisible();
  for (const width of [768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1100 });
    await capture(page, "long-frozen-" + width);
  }
  await page.getByRole("button", { name: "IELTS", exact: true }).click();
  await expect(page.getByRole("button", { name: "IELTS", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(requests.filter((r) => r.path === "/v1/exams").at(-1)?.category).toBe("IELTS");
  await expect(page.getByRole("link", { name: /Xem tất cả đề thi/ })).toHaveAttribute(
    "href",
    "/exams?category=IELTS",
  );
  await writeFile(
    path.join(evidence, "request-budget.json"),
    JSON.stringify(
      {
        interpretation: "synthetic browser requests, not performance or live business acceptance",
        requests,
      },
      null,
      2,
    ),
  );
});

test("PORT-05G complete empty snapshots have no phantom next page or global statistics", async ({
  page,
}) => {
  await liveFixture(page, { empty: true });
  await page.goto("http://127.0.0.1:4174/dashboard");
  await expect(
    page.getByText("Chưa có lượt đang làm trong dữ liệu đã tải", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Các lượt khác có thể nằm ở trang lịch sử tiếp theo/)).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Chưa có đề thi trong danh mục này" }),
  ).toBeVisible();
  for (const width of [768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1100 });
    await capture(page, "empty-" + width);
  }
});

test("PORT-05G history/catalog errors remain independent and stale snapshots are labeled", async ({
  page,
}) => {
  const faults: Faults = {};
  await liveFixture(page, faults);
  await page.goto("http://127.0.0.1:4174/dashboard");
  await ready(page);
  faults.historyStatus = 503;
  await page.getByRole("button", { name: "Tải lại lượt thi", exact: true }).click();
  await expect(page.getByText("Dữ liệu từ lần tải trước", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /0\/60 điểm/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Xem đề/ })).toHaveCount(3);
  for (const width of [768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1100 });
    await capture(page, "history-stale-" + width);
  }
  faults.historyStatus = 200;
  await page.getByRole("button", { name: "Tải lại lượt thi", exact: true }).click();
  await expect(page.getByText("Dữ liệu từ lần tải trước", { exact: true })).toHaveCount(0);
  faults.catalogStatus = 503;
  await page.getByRole("button", { name: "Tải lại danh mục", exact: true }).click();
  await expect(page.getByText("Danh mục từ lần tải trước", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Vào phòng thi", exact: true })).toBeVisible();
  await capture(page, "catalog-stale-1440");
  faults.historyStatus = 403;
  await page.getByRole("button", { name: "Tải lại lượt thi", exact: true }).click();
  await expect(page.getByRole("link", { name: "Vào phòng thi", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /0\/60 điểm/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Tải lại lượt thi", exact: true })).toBeDisabled();
  await capture(page, "history-denied-1440");
  faults.catalogStatus = 403;
  await page.getByRole("button", { name: "Tải lại danh mục", exact: true }).click();
  await expect(page.getByRole("link", { name: /Xem đề/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "IELTS", exact: true })).toBeDisabled();
  await capture(page, "both-denied-1440");
});

test("PORT-05G pending history, server wait and reauth hide private Dashboard data", async ({
  page,
}) => {
  let release!: () => void;
  const barrier = new Promise<void>((done) => {
    release = done;
  });
  const faults: Faults = { holdHistory: barrier };
  const requests = await liveFixture(page, faults);
  await page.clock.install();
  await page.setViewportSize({ width: 1024, height: 1100 });
  await page.goto("http://127.0.0.1:4174/dashboard");
  await expect(page.getByRole("link", { name: /Xem đề/ })).toHaveCount(3);
  await expect(page.getByRole("link", { name: "Vào phòng thi", exact: true })).toHaveCount(0);
  await capture(page, "history-pending-1024");
  faults.holdHistory = undefined;
  release();
  await ready(page);
  faults.historyStatus = 429;
  faults.wait = 90;
  await page.getByRole("button", { name: "Tải lại lượt thi", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tải lại sau 90 giây", exact: true }),
  ).toBeDisabled();
  await capture(page, "history-rate-limit-1024");
  const count = requests.filter((r) => r.path === "/v1/me/attempts").length;
  await page.clock.fastForward(91000);
  await expect(page.getByRole("button", { name: "Tải lại lượt thi", exact: true })).toBeEnabled();
  expect(requests.filter((r) => r.path === "/v1/me/attempts")).toHaveLength(count);
  await page.evaluate(() => {
    const channel = new BroadcastChannel("exam-platform-session");
    channel.postMessage({ type: "reauth" });
    channel.close();
  });
  await expect(page.getByRole("link", { name: "Đăng nhập lại", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Vào phòng thi", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Xem đề/ })).toHaveCount(0);
  await capture(page, "reauth-1024");
});
