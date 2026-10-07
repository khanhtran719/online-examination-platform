import { test, expect } from "../../../../apps/web/node_modules/playwright/test.mjs";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const aid = id(402);
const fixed = Date.parse("2026-10-07T12:00:00.000Z");
const iso = (ms = fixed) => new Date(ms).toISOString();
const ok = (data: unknown, metadata?: unknown) => ({
  data,
  errorCode: null,
  message: null,
  status: true,
  ...(metadata ? { metadata } : {}),
});
const error = (text: string) => ({ data: null, errorCode: text, message: text, status: false });
const profile = {
  id: id(1),
  email: "candidate@example.test",
  emailVerifiedAt: iso(),
  displayName: "Review candidate",
  leaderboardOptIn: false,
  revision: 1,
};
const question = {
  id: id(10),
  sectionId: id(20),
  position: 1,
  type: "SINGLE_CHOICE",
  prompt: "Review question",
  points: 1,
  options: [
    { id: id(11), position: 1, text: "Option A" },
    { id: id(12), position: 2, text: "Option B" },
  ],
};
const attempt = (deadline = fixed + 600000) => ({
  id: aid,
  examId: id(30),
  publishedVersionId: id(31),
  revision: 1,
  status: "IN_PROGRESS",
  startedAt: iso(),
  deadline: iso(deadline),
  submittedAt: null,
  expired: false,
  serverNow: iso(),
  canSave: true,
  resultAvailable: false,
  pollAfterSeconds: 2,
  replayPending: false,
});

async function setup(page, overrides: Record<string, Function> = {}, deadline?: number) {
  await page.clock.install({ time: fixed });
  await page.route("**/v1/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const key = `${req.method()} ${url.pathname}`;
    if (overrides[key]) return overrides[key](route, url);
    let data: unknown;
    let metadata: unknown;
    if (key === "GET /v1/me") data = profile;
    else if (key === "GET /v1/auth/csrf")
      data = { csrfToken: "synthetic-review-csrf", expiresAt: iso(fixed + 600000) };
    else if (key === `GET /v1/attempts/${aid}` || key === `GET /v1/attempts/${aid}/status`)
      data = attempt(deadline);
    else if (key === `GET /v1/attempts/${aid}/questions`) {
      data = [question];
      metadata = { next: null, pageSize: 20 };
    } else if (key === `GET /v1/attempts/${aid}/answers`) {
      data = [];
      metadata = { next: null, pageSize: 20 };
    } else if (key === "POST /v1/auth/login")
      data = {
        userId: id(1),
        accessExpiresAt: iso(fixed + 600000),
        refreshExpiresAt: iso(fixed + 3600000),
        absoluteExpiresAt: iso(fixed + 86400000),
      };
    else return route.fulfill({ status: 401, json: error("Unauthenticated") });
    await route.fulfill({ status: 200, json: ok(data, metadata) });
  });
  await page.goto(`http://127.0.0.1:4174/attempts/${aid}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Đề");
}

test("W-14: do not treat an answer in an unloaded page as version zero", async ({ page }) => {
  const frozenQuestions = Array.from({ length: 40 }, (_, index) =>
    index === 0 ? question : {
      ...question, id: id(100 + index), position: index + 1,
      options: [{id: id(200 + index * 2), position: 1, text: "Option A"}, {id: id(201 + index * 2), position: 2, text: "Option B"}],
    },
  );
  const reversedAnswers = [...frozenQuestions].reverse().map(item => ({
    questionId: item.id, selectedOptionIds: item.id === question.id ? [id(11)] : [],
    marked: false, version: 5, updatedAt: iso(),
  }));
  await setup(page, {
    [`GET /v1/attempts/${aid}/questions`]: (route, url) => route.fulfill({status: 200, json: ok(url.searchParams.has("cursor") ? frozenQuestions.slice(20) : frozenQuestions.slice(0,20), {next: url.searchParams.has("cursor") ? null : "question-page-2", pageSize: 20})}),
    [`GET /v1/attempts/${aid}/answers`]: (route, url) => route.fulfill({status: 200, json: ok(url.searchParams.has("cursor") ? reversedAnswers.slice(20) : reversedAnswers.slice(0,20), {next: url.searchParams.has("cursor") ? null : "answer-page-2", pageSize: 20})}),
  });
  await expect(page.getByRole("radio")).toHaveCount(0, { timeout: 2000 });
});

test("W-06/W-14: reauthentication keeps the unsaved selection", async ({ page }) => {
  let saves = 0;
  let recovering = false;
  let loggedInAgain = false;
  let profileRoute: any = null;
  await setup(page, {
    [`PUT /v1/attempts/${aid}/answers`]: (route) => {
      saves++;
      recovering = true;
      return route.fulfill({ status: 401, json: error("Unauthenticated") });
    },
    "GET /v1/me": (route) => {
      if (loggedInAgain) {
        profileRoute = route;
        return;
      }
      return route.fulfill({
        status: recovering ? 401 : 200,
        json: recovering ? error("Unauthenticated") : ok(profile),
      });
    },
    "POST /v1/auth/refresh": (route) =>
      route.fulfill({ status: 401, json: error("Unauthenticated") }),
    "POST /v1/auth/login": (route) => {
      loggedInAgain = true;
      return route.fulfill({
        status: 200,
        json: ok({
          userId: id(1),
          accessExpiresAt: iso(fixed + 600000),
          refreshExpiresAt: iso(fixed + 3600000),
          absoluteExpiresAt: iso(fixed + 86400000),
        }),
      });
    },
  });
  await page.getByRole("radio").first().check();
  await page.clock.runFor(750);
  await expect(page.getByRole("heading", { name: "Đăng nhập lại" })).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill("candidate@example.test");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("fixture-password-ok");
  await page.getByRole("button", { name: "Đăng nhập lại", exact: true }).click();
  await expect.poll(() => profileRoute !== null).toBe(true);
  await expect(page.getByRole("radio")).toHaveCount(0);
  await profileRoute.fulfill({ status: 200, json: ok(profile) });
  await expect(page.getByRole("radio").first()).toBeChecked({ timeout: 2000 });
});

test("W-16: deadline submission does not wait forever for a held save", async ({ page }) => {
  let held: any = null;
  let submits = 0;
  await setup(
    page,
    {
      [`PUT /v1/attempts/${aid}/answers`]: (route) => {
        held = route;
      },
      [`POST /v1/attempts/${aid}/submit`]: (route) => {
        submits++;
        return route.fulfill({
          status: 202,
          json: ok({
            attemptId: aid,
            submissionId: id(50),
            acceptedAt: iso(fixed + 1000),
            acceptanceState: "EXPIRED",
            expired: true,
          }),
        });
      },
    },
    fixed + 60000,
  );
  await page.getByRole("radio").first().check();
  await page.clock.runFor(750);
  await expect.poll(() => held !== null).toBe(true);
  await page.clock.runFor(61000);
  await expect.poll(() => submits, { timeout: 2000 }).toBe(1);
});

test("FE-23: a second question save uses the accepted revision", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/login");
  await page.getByLabel("Email").fill("candidate@example.test");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("fixture-password-ok");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Bảng làm việc" })).toBeVisible();
  await page.locator("summary").filter({ hasText: "Kịch bản mẫu" }).click();
  await page.getByLabel("Quyền mẫu").selectOption("admin");
  await page.getByRole("link", { name: "Quản trị", exact: true }).click();
  await page.getByRole("link", { name: "Ngân hàng câu", exact: true }).click();
  await page.locator('a[href^="/admin/questions/000"]').first().click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("revision");
  await page.getByLabel("Đề bài").fill("First review edit");
  await page.getByRole("button", { name: "Lưu câu", exact: true }).click();
  await expect(page.getByRole("button", { name: "Lưu câu", exact: true })).toBeEnabled();
  await page.getByLabel("Đề bài").fill("Second review edit");
  await page.getByRole("button", { name: "Lưu câu", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveCount(0, { timeout: 2000 });
});

test("W-18: permission loss removes previously loaded review text", async ({ page }) => {
  const result = {
    attemptId: aid,
    publishedVersionId: id(31),
    submissionId: id(50),
    completedAt: iso(),
    earned: 1,
    possible: 1,
    correct: 1,
    total: 1,
    percentageBasisPoints: 10000,
    expired: false,
    scoringPolicy: "EXACT_MATCH_V1",
    sections: [],
    review: { href: `/v1/attempts/${aid}/review` },
  };
  let allowed = true;
  await setup(page, {
    [`GET /v1/attempts/${aid}/result`]: (route) => route.fulfill({ status: 200, json: ok(result) }),
    [`GET /v1/attempts/${aid}/review`]: (route) =>
      route.fulfill({
        status: allowed ? 200 : 403,
        json: allowed
          ? ok(
              [
                {
                  question,
                  selectedOptionIds: [id(11)],
                  correctOptionIds: [id(11)],
                  correct: true,
                  explanation: "RELEASED_REVIEW_TEXT",
                },
              ],
              { next: null, pageSize: 20 },
            )
          : error("Forbidden"),
      }),
  });
  await page.goto(`http://127.0.0.1:4174/attempts/${aid}/review`);
  await expect(page.getByText("RELEASED_REVIEW_TEXT")).toBeVisible();
  allowed = false;
  await page.getByRole("link", { name: "Lịch sử", exact: true }).click();
  await page.clock.runFor(20000);
  await page.goBack();
  await expect(page.getByRole("alert")).toContainText("Bạn không có quyền");
  await expect(page.getByText("RELEASED_REVIEW_TEXT")).toHaveCount(0, { timeout: 2000 });
});
