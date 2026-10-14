import { mkdir, writeFile } from "node:fs/promises";

import AxeBuilder from "@axe-core/playwright";

import { expect, requestKey, test, verifiedAccount } from "./fixtures.mjs";

const observations = [];
const responseFor = (page, path, status) =>
  page.waitForResponse(
    (r) => new URL(r.url()).pathname === path && (status === undefined || r.status() === status),
  );

async function safeRead(response) {
  expect(response.status()).toBe(200);
  const headers = response.headers();
  expect(headers["cache-control"]).toContain("no-store");
  expect(headers["content-type"]).toContain("application/json");
  expect(headers["x-correlation-id"]).toBeTruthy();
  const value = await response.json();
  expect(value.status).toBe(true);
  expect(value.errorCode).toBeNull();
  expect(value.message).toBeNull();
  expect(JSON.stringify(value)).not.toMatch(
    /PRIVATE_EXPLANATION_SENTINEL|correctOption|Private bank question/,
  );
  return value;
}

test.afterAll(async () => {
  await mkdir("../../.local/web-evidence/web-03", { recursive: true });
  await writeFile(
    "../../.local/web-evidence/web-03/observations.json",
    JSON.stringify(observations, null, 2),
  );
});

test("W3 real browse/detail, loaded-only search and category/pageSize navigation fit Web/tablet", async ({
  page,
  harness,
  catalog,
  candidate,
}) => {
  const tls = await harness.tlsProbe();
  expect(tls.authorized).toBe(true);
  expect(tls.status).toBe(200);
  const anonymous = await page.context().browser().newContext();
  try {
    const denied = await harness.request(anonymous, "GET", "/v1/exams?pageSize=20");
    expect(denied.status).toBe(401);
    expect(denied.headers["cache-control"]).toContain("no-store");
  } finally {
    await anonymous.close();
  }
  const unknown = await harness.request(page.context(), "GET", "/v1/not-a-route");
  expect(unknown.status).toBe(404);
  expect(unknown.headers["content-type"]).toContain("application/json");
  expect(JSON.parse(unknown.text).status).toBe(false);
  const from = harness.requests.length;
  for (const width of [768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    const list = responseFor(page, "/v1/exams");
    await page.getByRole("button", { name: "Tải lại", exact: true }).click();
    const payload = await safeRead(await list);
    expect(payload.data).toHaveLength(20);
    expect(payload.metadata.pageSize).toBe(20);
    expect(payload.metadata.next).toBeTruthy();
    const scan = await new AxeBuilder({ page }).analyze();
    expect(scan.violations.map((v) => v.id)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const detailPath = `/v1/exams/${catalog.all[0].id}`;
    const detail = responseFor(page, detailPath);
    await page.goto(`/exams/${catalog.all[0].id}`);
    const value = (await safeRead(await detail)).data;
    expect(value.title).toBe(catalog.all[0].title);
    expect(value.version).toBe(1);
    expect(value.questionCount).toBe(1);
    expect(value.sections[0]).toMatchObject({
      title: "Kiến thức nền",
      questionCount: 1,
      possible: 7,
    });
    expect(value.attemptLimit).toBe(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(value.title);
    expect((await new AxeBuilder({ page }).analyze()).violations.map((v) => v.id)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    observations.push({
      scope: "actual browse/detail",
      width,
      axe: 0,
      overflow: false,
      noStore: true,
      pageSize: 20,
    });
    await page.getByRole("link", { name: "Danh sách đề" }).click();
    await expect(page.locator("main li")).toHaveCount(20);
  }
  const beforeSearch = harness.requests.length;
  await page.getByLabel("Tìm trong các đề đã tải").fill("không khớp sentinel");
  await expect(page.getByText("Không khớp trong các đề đã tải", { exact: true })).toBeVisible();
  expect(harness.requests.length).toBe(beforeSearch);
  await page.getByLabel("Tìm trong các đề đã tải").fill("");
  await page.getByRole("button", { name: "Tải thêm", exact: true }).click();
  await expect(page.locator("main li")).toHaveCount(catalog.published);
  const links = await page
    .locator('main a[href^="/exams/"]')
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href")));
  expect(new Set(links).size).toBe(catalog.published);
  const category = responseFor(page, "/v1/exams");
  await page.getByRole("button", { name: "TOEIC", exact: true }).click();
  expect((await safeRead(await category)).data).toHaveLength(3);
  await expect(page.locator("main li")).toHaveCount(3);
  await expect(page).toHaveURL(/category=TOEIC/);
  await page.getByRole("button", { name: "IELTS", exact: true }).click();
  await expect(page.getByText("Không có đề trong bộ lọc này", { exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.locator("main li")).toHaveCount(3);
  await page.getByRole("button", { name: "Tất cả", exact: true }).click();
  await page.getByLabel("Số dòng mỗi trang").selectOption("100");
  await expect(page.locator("main li")).toHaveCount(catalog.published);
  await expect(page.getByRole("button", { name: "Tải thêm", exact: true })).toHaveCount(0);
  const events = harness.requests.slice(from);
  expect(events.filter((r) => r.path === "/v1/exams/:examId")).toHaveLength(4);
  expect(events.filter((r) => r.path.startsWith("/v1/admin/"))).toHaveLength(0);
  expect(
    (
      await harness.fixture.query(
        `
      SELECT
        count(*)::integer AS n
      FROM
        assessment.attempts
      WHERE
        user_id = $1
      `,
        [candidate.id],
      )
    ).rows[0].n,
  ).toBe(0);
});

test("W3 real actor-bound/tampered/expired cursor is rejected and UI restarts at page one", async ({
  page,
  harness,
  context,
  browser,
  catalog,
  candidate: _candidate,
}) => {
  const first = await harness.request(context, "GET", "/v1/exams?pageSize=20");
  expect(first.status).toBe(200);
  const cursor = JSON.parse(first.text).metadata.next;
  expect(cursor).toBeTruthy();
  const other = await browser.newContext();
  try {
    const account = await verifiedAccount(harness, other);
    expect((await harness.request(other, "POST", "/v1/auth/login", account)).status).toBe(200);
    expect(
      (
        await harness.request(
          other,
          "GET",
          `/v1/exams?pageSize=20&cursor=${encodeURIComponent(cursor)}`,
        )
      ).status,
    ).toBe(400);
  } finally {
    await other.close();
  }
  expect(
    (
      await harness.request(
        context,
        "GET",
        `/v1/exams?pageSize=100&cursor=${encodeURIComponent(cursor)}`,
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await harness.request(
        context,
        "GET",
        `/v1/exams?pageSize=20&category=TOEIC&cursor=${encodeURIComponent(cursor)}`,
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await harness.request(
        context,
        "GET",
        `/v1/exams?pageSize=20&cursor=${encodeURIComponent(cursor)}x`,
      )
    ).status,
  ).toBe(400);
  let injected = false;
  await page.route("**/v1/exams?**", async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.has("cursor") && !injected) {
      injected = true;
      url.searchParams.set("cursor", harness.expiredCatalogCursor(cursor));
      await route.continue({ url: url.toString() });
    } else await route.continue();
  });
  const expired = responseFor(page, "/v1/exams", 400);
  await page.getByRole("button", { name: "Tải thêm", exact: true }).click();
  expect((await expired).status()).toBe(400);
  await expect(page.getByText("Con trỏ không còn dùng được", { exact: true })).toBeVisible();
  await expect(page.locator("main li")).toHaveCount(20);
  await page.getByRole("button", { name: "Tải lại từ đầu", exact: true }).click();
  await expect(page.getByText("Con trỏ không còn dùng được", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Tải thêm", exact: true }).click();
  await expect(page.locator("main li")).toHaveCount(catalog.published);
  observations.push({
    scope: "cursor",
    actorBound: true,
    pageSizeBound: true,
    filterBound: true,
    tampered400: true,
    expired400: true,
    restarted: true,
  });
});

test("W3 publication disappearance is explicit and republish reads the new immutable version", async ({
  page,
  harness,
  catalog,
  candidate,
}) => {
  const exam = catalog.all[0];
  await page.goto(`/exams/${exam.id}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(exam.title);
  let receipt = await catalog.write("POST", `/v1/admin/exams/${exam.id}/unpublish`, {
    expectedRevision: exam.revision,
  });
  const missing = responseFor(page, `/v1/exams/${exam.id}`, 404);
  await page.getByRole("button", { name: "Tải lại", exact: true }).click();
  expect((await missing).status()).toBe(404);
  await expect(page.getByText("Không tìm thấy nội dung", { exact: true })).toBeVisible();
  // Current contract keeps a clearly labeled last-successful projection; server still gates start.
  await expect(
    page.getByText("Đang hiển thị thông tin lần tải thành công trước.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
  const denied = responseFor(page, `/v1/exams/${exam.id}/attempts`, 422);
  await page.getByRole("dialog").getByRole("button", { name: "Bắt đầu", exact: true }).click();
  expect((await denied).status()).toBe(422);
  await page.getByRole("button", { name: "Chưa bắt đầu", exact: true }).click();
  const nextTitle = "Đề HTTPS đã phát hành lại — phiên bản mới";
  receipt = await catalog.write("PUT", `/v1/admin/exams/${exam.id}`, {
    ...exam.body,
    title: nextTitle,
    expectedRevision: receipt.revision,
  });
  receipt = await catalog.write("POST", `/v1/admin/exams/${exam.id}/publish`, {
    expectedRevision: receipt.revision,
  });
  exam.revision = receipt.revision;
  const newer = responseFor(page, `/v1/exams/${exam.id}`);
  await page.getByRole("button", { name: "Tải lại", exact: true }).click();
  expect((await safeRead(await newer)).data.version).toBe(2);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(nextTitle);
  expect(
    (
      await harness.fixture.query(
        `
      SELECT
        count(*)::integer AS n
      FROM
        assessment.attempts
      WHERE
        user_id = $1
      `,
        [candidate.id],
      )
    ).rows[0].n,
  ).toBe(0);
  observations.push({
    scope: "publication",
    unpublished404: true,
    staleLabeled: true,
    startDenied422: true,
    republishedVersion: 2,
  });
});

test("W4 actual permission revocation clears loaded Catalog and cannot refetch until new scope", async ({
  page,
  harness,
  catalog: _catalog,
  candidate,
}) => {
  await harness.fixture.query(
    `
    DELETE FROM identity.user_roles
    WHERE
      user_id = $1
    `,
    [candidate.id],
  );
  const denied = responseFor(page, "/v1/exams", 403);
  await page.getByRole("button", { name: "Tải lại", exact: true }).click();
  expect((await denied).status()).toBe(403);
  await expect(page.locator("main li")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Tải lại", exact: true })).toBeDisabled();
  await harness.fixture.query(
    `
    INSERT INTO identity.user_roles (user_id, role_id)
    VALUES
      ($1, 'CANDIDATE')
    `,
    [candidate.id],
  );
  await page.reload();
  await expect(page.locator("main li")).toHaveCount(20);
  observations.push({ scope: "permission", real403: true, hidden: true, explicitNewScope: true });
});

test("W4 real revoked session returns401 and purges private Catalog without resetting authority", async ({
  page,
  harness,
  context,
  catalog: _catalog,
  candidate,
}) => {
  await harness.fixture.query(
    `
    UPDATE identity.session_families
    SET
      revoked_at = clock_timestamp()
    WHERE
      user_id = $1
    `,
    [candidate.id],
  );
  const denied = responseFor(page, "/v1/exams", 401);
  await page.getByRole("button", { name: "Tải lại", exact: true }).click();
  expect((await denied).status()).toBe(401);
  await expect(page.locator("main li")).toHaveCount(0);
  expect((await harness.request(context, "GET", "/v1/exams?pageSize=20")).status).toBe(401);
  observations.push({ scope: "session", real401: true, hidden: true });
});

test("W4 real429 honors Retry-After and explicit recovery; real PG denial stays503 with stale data labeled", async ({
  page,
  harness,
  candidate,
  catalog: _catalog,
}) => {
  await harness.setActorReadLimit(candidate.id, true);
  const limited = responseFor(page, "/v1/exams", 429);
  await page.getByRole("button", { name: "Tải lại", exact: true }).click();
  const response = await limited;
  const advertisedWait = response.headers()["retry-after"];
  const wait = advertisedWait === undefined ? 60 : Number(advertisedWait);
  test.setTimeout(120_000);
  expect(wait).toBeGreaterThan(0);
  await expect(page.getByText("Thao tác đang bị giới hạn", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tải lại", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Thử lại", exact: true })).toHaveCount(0);
  await harness.setActorReadLimit(candidate.id, false);
  await expect(page.getByRole("button", { name: "Tải lại", exact: true })).toBeEnabled({
    timeout: (wait + 2) * 1000,
  });
  await page.getByRole("button", { name: "Tải lại", exact: true }).click();
  await expect(page.getByText("Thao tác đang bị giới hạn", { exact: true })).toHaveCount(0);
  await harness.fixture.query("REVOKE SELECT ON catalog.exams FROM examination_runtime");
  try {
    const unavailable = responseFor(page, "/v1/exams", 503);
    await page.getByRole("button", { name: "Tải lại", exact: true }).click();
    const result = await unavailable;
    expect(await result.text()).not.toMatch(/permission denied|catalog\.exams|SELECT/);
    await expect(page.getByText("Chưa kết nối được máy chủ", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Đang giữ các đề đã tải trước; danh sách có thể đã thay đổi.", {
        exact: true,
      }),
    ).toBeVisible();
  } finally {
    await harness.fixture.query("GRANT SELECT ON catalog.exams TO examination_runtime");
  }
  await page.getByRole("button", { name: "Tải lại", exact: true }).click();
  await expect(page.getByText("Chưa kết nối được máy chủ", { exact: true })).toHaveCount(0);
  observations.push({
    scope: "backpressure/dependency",
    real429: true,
    retryAfterHonored: true,
    realPg503: true,
    staleLabeled: true,
    recovered: true,
    advertisedRetryAfter: advertisedWait === undefined ? null : wait,
    effectiveWaitSeconds: wait,
  });
});

test("W4 real server rejects unopened/closed/exhausted starts and creates no extra attempt", async ({
  page,
  harness,
  context,
  catalog,
  candidate,
}) => {
  const start = await harness.request(
    context,
    "POST",
    `/v1/exams/${catalog.quota.id}/attempts`,
    undefined,
    { "idempotency-key": requestKey() },
  );
  expect(start.status).toBe(201);
  const attempt = JSON.parse(start.text).data;
  expect(
    (
      await harness.request(
        context,
        "POST",
        `/v1/attempts/${attempt.id}/submit`,
        {},
        { "idempotency-key": requestKey() },
      )
    ).status,
  ).toBe(202);
  const closeAt = Date.now() + 2500;
  const closed = await catalog.create("Đề vừa đóng HTTPS", {
    openAt: new Date(Date.now() - 3600_000).toISOString(),
    closeAt: new Date(closeAt).toISOString(),
  });
  await expect.poll(() => Date.now() >= closeAt).toBe(true);
  for (const [exam, message] of [
    [catalog.future, "Exam is not open"],
    [closed, "Exam is closed"],
    [catalog.quota, "Attempt limit reached"],
  ]) {
    await page.goto(`/exams/${exam.id}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(exam.title);
    await page.getByRole("button", { name: "Bắt đầu", exact: true }).click();
    const rejected = responseFor(page, `/v1/exams/${exam.id}/attempts`, 422);
    await page.getByRole("dialog").getByRole("button", { name: "Bắt đầu", exact: true }).click();
    const r = await rejected;
    expect((await r.json()).message).toBe(message);
    await expect(page.getByRole("dialog").getByText(message, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Chưa bắt đầu", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Chưa bắt đầu", exact: true }).click();
  }
  expect(
    (
      await harness.fixture.query(
        `
      SELECT
        count(*)::integer AS n
      FROM
        assessment.attempts
      WHERE
        user_id = $1
      `,
        [candidate.id],
      )
    ).rows[0].n,
  ).toBe(1);
  observations.push({
    scope: "start guards",
    notOpen422: true,
    closed422: true,
    quota422: true,
    durableAttempts: 1,
    fullWorkflowAccepted: false,
  });
});
