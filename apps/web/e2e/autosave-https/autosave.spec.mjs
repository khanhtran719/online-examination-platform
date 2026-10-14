import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";

import { requestKey } from "../assessment-https/fixtures.mjs";

import { expect, test } from "./fixtures.mjs";

const observations = [];
const button = (page, name) => page.getByRole("button", { name, exact: true });
const phase = (page, value) => page.locator(`[role="status"][data-phase="${value}"]`);
const answerPath = (attempt) => `/v1/attempts/${attempt.id}/answers`;
const isSave = (request, attempt) =>
  request.method() === "PUT" && new URL(request.url()).pathname === answerPath(attempt);
const reply = (page, attempt) => page.waitForResponse((r) => isSave(r.request(), attempt));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function forwardSave(route, page, harness, attempt) {
  // Playwright's Node route.fetch does not share Chromium's leaf SPKI trust.
  // The existing fixture's Node protocol validates CA/SAN and forwards this exact intent.
  const request = route.request();
  expect(isSave(request, attempt)).toBe(true);
  const response = await harness.request(
    page.context(),
    "PUT",
    answerPath(attempt),
    request.postDataJSON(),
    {
      "idempotency-key": request.headers()["idempotency-key"],
      "x-csrf-token": request.headers()["x-csrf-token"],
    },
    false,
  );
  return {
    status: response.status,
    body: response.text,
    headers: Object.fromEntries(
      ["content-type", "cache-control", "x-correlation-id", "retry-after"]
        .filter((key) => response.headers[key] !== undefined)
        .map((key) => [key, response.headers[key]]),
    ),
  };
}

async function start(page, exam) {
  await page.goto(`/exams/${exam.id}`);
  await button(page, "Bắt đầu").click();
  const response = page.waitForResponse(
    (r) =>
      r.request().method() === "POST" &&
      new URL(r.url()).pathname === `/v1/exams/${exam.id}/attempts`,
  );
  await page.getByRole("dialog").getByRole("button", { name: "Bắt đầu", exact: true }).click();
  const result = await response;
  expect(result.status()).toBe(201);
  const attempt = (await result.json()).data;
  await expect(page.getByRole("radio").first()).toBeEnabled();
  return attempt;
}

function saves(page, attempt) {
  const records = [];
  page.on("request", (request) => {
    if (!isSave(request, attempt)) return;
    records.push({
      body: request.postDataJSON(),
      key: request.headers()["idempotency-key"],
      wallMs: performance.now(),
      bytes: Buffer.byteLength(request.postData() ?? ""),
    });
  });
  return records;
}

async function rows(harness, attempt) {
  return (
    await harness.fixture.query(
      `
    SELECT
      a.question_id,
      a.version,
      a.marked,
      COALESCE(array_agg(s.option_id) FILTER (WHERE s.option_id IS NOT NULL), '{}') AS selected
    FROM
      assessment.answers AS a
    LEFT JOIN
      assessment.answer_selections AS s
      ON s.attempt_id = a.attempt_id
      AND s.question_id = a.question_id
    WHERE
      a.attempt_id = $1
    GROUP BY
      a.question_id,
      a.version,
      a.marked
    ORDER BY
      a.question_id
  `,
      [attempt.id],
    )
  ).rows;
}

async function freeze(page) {
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 100));
}

async function privilege(harness, granted) {
  // Disposable fixture operator only. Runtime inherits this fixed local parent role.
  await harness.fixture.query(
    granted
      ? "GRANT SELECT ON assessment.answers TO examination_runtime"
      : "REVOKE SELECT ON assessment.answers FROM examination_runtime",
  );
}

test.afterAll(async () => {
  await mkdir("../../.local/web-evidence/web-05", { recursive: true });
  await writeFile(
    "../../.local/web-evidence/web-05/observations.json",
    JSON.stringify(observations, null, 2),
  );
});

test("S3 clean room sends no writes and wall-time debounce batches rapid edits", async ({
  page,
  harness,
  exams,
  candidate: _candidate,
}) => {
  const attempt = await start(page, exams.small);
  const requests = saves(page, attempt);
  await wait(2500);
  expect(requests).toHaveLength(0);
  expect(await rows(harness, attempt)).toEqual([]);
  const started = performance.now();
  await page.getByRole("radio", { name: "Lựa chọn A", exact: true }).check();
  await phase(page, "pending").waitFor();
  await page.getByRole("checkbox", { name: "Đánh dấu để xem lại", exact: true }).check();
  await page.getByRole("radio", { name: "Lựa chọn B", exact: true }).check();
  const lastEdit = performance.now();
  await wait(300);
  expect(requests).toHaveLength(0);
  await expect(phase(page, "saved")).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0].wallMs - lastEdit).toBeGreaterThanOrEqual(450);
  expect(requests[0].body.answers).toHaveLength(1);
  expect(requests[0].body.answers[0]).toMatchObject({ marked: true, expectedVersion: 0 });
  const persisted = await rows(harness, attempt);
  expect(persisted).toHaveLength(1);
  expect(persisted[0].version).toBe(1);
  expect(persisted[0].marked).toBe(true);
  expect(persisted[0].selected).toEqual(requests[0].body.answers[0].selectedOptionIds);
  await wait(1500);
  expect(requests).toHaveLength(1);
  observations.push({
    scope: "wall-debounce",
    cleanMs: 2500,
    cleanWrites: 0,
    writes: 1,
    dirtyQuestions: 1,
    postAckCleanWrites: 0,
    debounceMs: Math.round(requests[0].wallMs - lastEdit),
    totalInteractionMs: Math.round(performance.now() - started),
    payloadBytes: requests[0].bytes,
  });
});

test("S3 twenty-three dirty questions drain as20+3 with periodic flush and one flight", async ({
  page,
  harness,
  exams,
  candidate: _candidate,
}) => {
  const attempt = await start(page, exams.paged);
  await button(page, "Tải thêm câu").click();
  const sheet = page.getByRole("complementary", { name: "Phiếu câu hỏi" });
  await expect(sheet.getByRole("button", { name: /^Câu \d+,/ })).toHaveCount(23);
  const requests = saves(page, attempt);
  await freeze(page);
  for (let n = 1; n <= 23; n++) {
    await sheet.getByRole("button", { name: new RegExp(`^Câu ${n},`) }).click();
    await page.getByRole("checkbox", { name: "Đánh dấu để xem lại", exact: true }).check();
  }
  await page.clock.runFor(499);
  expect(requests).toHaveLength(0);
  const first = reply(page, attempt);
  await page.clock.runFor(251);
  expect((await first).status()).toBe(200);
  await expect(phase(page, "pending")).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0].body.answers).toHaveLength(20);
  await page.clock.runFor(6000);
  expect(requests).toHaveLength(1);
  const second = reply(page, attempt);
  await wait(425); // Real API admission clock is not the controlled browser clock.
  await page.clock.runFor(5500);
  expect((await second).status()).toBe(200);
  await expect(phase(page, "saved")).toBeVisible();
  expect(requests).toHaveLength(2);
  expect(requests[1].body.answers).toHaveLength(3);
  expect(requests[1].key).not.toBe(requests[0].key);
  expect(new Set(requests.flatMap((r) => r.body.answers.map((a) => a.questionId))).size).toBe(23);
  expect(
    (await rows(harness, attempt)).every(
      (r) => r.version === 1 && r.marked && r.selected.length === 0,
    ),
  ).toBe(true);
  expect(await rows(harness, attempt)).toHaveLength(23);
  await page.clock.runFor(20_000);
  expect(requests).toHaveLength(2);
  observations.push({
    scope: "batch",
    clock: "controlled-browser-only",
    batches: [20, 3],
    distinctDirty: 23,
    persisted: 23,
    versions: 1,
    payloadBytes: requests.map((r) => r.bytes),
    cleanWrites: 0,
  });
});

test("S3 held actual ACK never labels newer unsent draft saved or opens a second flight", async ({
  page,
  harness,
  exams,
  candidate: _candidate,
}) => {
  const attempt = await start(page, exams.small);
  const requests = saves(page, attempt);
  let release;
  let received;
  const held = new Promise((resolve) => {
    received = resolve;
  });
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  let first = true;
  await page.route(`**${answerPath(attempt)}`, async (route) => {
    if (route.request().method() !== "PUT" || !first) return route.continue();
    first = false;
    const response = await forwardSave(route, page, harness, attempt);
    expect(response.status).toBe(200);
    received();
    await gate;
    await route.fulfill(response);
  });
  try {
    await page.getByRole("radio", { name: "Lựa chọn A", exact: true }).check();
    await held;
    await expect(phase(page, "saving")).toBeVisible();
    expect((await rows(harness, attempt))[0].version).toBe(1);
    await page.getByRole("radio", { name: "Lựa chọn B", exact: true }).check();
    await wait(1000);
    expect(requests).toHaveLength(1);
    await expect(phase(page, "saved")).toHaveCount(0);
    const ack = reply(page, attempt);
    release();
    expect((await ack).status()).toBe(200);
    await expect(phase(page, "saved")).toBeVisible();
    expect(requests).toHaveLength(2);
    expect(requests[1].key).not.toBe(requests[0].key);
    expect(requests[1].body.answers[0].expectedVersion).toBe(1);
    expect((await rows(harness, attempt))[0]).toMatchObject({
      version: 2,
      selected: requests[1].body.answers[0].selectedOptionIds,
    });
    observations.push({
      scope: "held-ACK",
      actual200Held: true,
      beforeReleaseWrites: 1,
      afterReleaseWrites: 2,
      finalVersion: 2,
      newerIntentConfirmedSeparately: true,
    });
  } finally {
    release();
    await page.unroute(`**${answerPath(attempt)}`);
  }
});

test("S4 actual503 stops after six attempts and explicit recovery preserves latest wait", async ({
  page,
  harness,
  exams,
  candidate: _candidate,
}) => {
  const attempt = await start(page, exams.small);
  const requests = saves(page, attempt);
  let advised = 3;
  await page.route(`**${answerPath(attempt)}`, async (route) => {
    if (route.request().method() !== "PUT") return route.continue();
    const response = await forwardSave(route, page, harness, attempt);
    if (response.status === 503) response.headers["retry-after"] = String(advised);
    await route.fulfill(response);
  });
  await freeze(page);
  await privilege(harness, false);
  try {
    await page.getByRole("radio", { name: "Lựa chọn A", exact: true }).check();
    const failed = reply(page, attempt);
    await page.clock.runFor(750);
    expect((await failed).status()).toBe(503);
    await expect(phase(page, "retrying")).toBeVisible();
    expect(await rows(harness, attempt)).toEqual([]);
    await page.clock.runFor(2500);
    expect(requests).toHaveLength(1);
    // All further responses are actual503. Controlled time accelerates only client waits.
    for (let n = 2; n <= 6; n++) {
      const failure = reply(page, attempt);
      if (n === 6) advised = 60;
      await wait(425);
      await page.clock.runFor(25_000);
      expect((await failure).status()).toBe(503);
      await expect(phase(page, n === 6 ? "unconfirmed" : "retrying")).toBeVisible();
      expect(requests).toHaveLength(n);
    }
    await expect(button(page, "Thử lưu lại")).toBeVisible();
    const latest = requests[0];
    expect(
      requests.every(
        (r) => r.key === latest.key && JSON.stringify(r.body) === JSON.stringify(latest.body),
      ),
    ).toBe(true);
    await page.clock.runFor(1000);
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await page.clock.runFor(1000);
    expect(requests).toHaveLength(6);
    await privilege(harness, true);
    await button(page, "Thử lưu lại").click();
    await page.clock.runFor(1000);
    expect(requests).toHaveLength(6);
    const success = reply(page, attempt);
    await page.clock.runFor(60_000);
    expect((await success).status()).toBe(200);
    await expect(phase(page, "saved")).toBeVisible();
    expect(requests).toHaveLength(7);
    expect(requests[6].key).toBe(latest.key);
    expect((await rows(harness, attempt))[0].version).toBe(1);
    observations.push({
      scope: "503",
      actualDependency: true,
      hintedByTestProxy: true,
      autoAttempts: 6,
      noAutomaticRearm: true,
      latestWaitSeconds: 60,
      manualRecovery: 1,
      finalVersion: 1,
    });
  } finally {
    await privilege(harness, true);
    await page.unroute(`**${answerPath(attempt)}`);
  }
});

test("S4 real429 with controlled advice blocks early retry even across reconnect", async ({
  page,
  harness,
  exams,
  candidate,
}) => {
  const attempt = await start(page, exams.small);
  const requests = saves(page, attempt);
  await page.route(`**${answerPath(attempt)}`, async (route) => {
    if (route.request().method() !== "PUT") return route.continue();
    const response = await forwardSave(route, page, harness, attempt);
    if (response.status === 429) response.headers["retry-after"] = "3";
    await route.fulfill(response);
  });
  await freeze(page);
  await harness.setActorWriteLimit(candidate.id, true);
  try {
    await page.getByRole("radio", { name: "Lựa chọn B", exact: true }).check();
    const failed = reply(page, attempt);
    await page.clock.runFor(750);
    expect((await failed).status()).toBe(429);
    await expect(phase(page, "retrying")).toBeVisible();
    expect(await rows(harness, attempt)).toEqual([]);
    await harness.setActorWriteLimit(candidate.id, false);
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await page.clock.runFor(2000);
    expect(requests).toHaveLength(1);
    const success = reply(page, attempt);
    await page.clock.runFor(1500);
    expect((await success).status()).toBe(200);
    await expect(phase(page, "saved")).toBeVisible();
    expect(requests).toHaveLength(2);
    expect(requests[1].key).toBe(requests[0].key);
    expect(requests[1].body).toEqual(requests[0].body);
    expect((await rows(harness, attempt))[0].version).toBe(1);
    observations.push({
      scope: "429",
      actualAdmission: true,
      hintedByTestProxy: true,
      waitSeconds: 3,
      earlyWrites: 0,
      writes: 2,
      finalVersion: 1,
    });
  } finally {
    await harness.setActorWriteLimit(candidate.id, false);
    await page.unroute(`**${answerPath(attempt)}`);
  }
});

test("S4 actual offline draft stays memory-only and reconnect sends it once", async ({
  page,
  harness,
  exams,
  candidate: _candidate,
}) => {
  await page.setViewportSize({ width: 768, height: 1100 });
  const attempt = await start(page, exams.small);
  const requests = saves(page, attempt);
  await page.context().setOffline(true);
  try {
    await page.getByRole("radio", { name: "Lựa chọn B", exact: true }).check();
    await expect(phase(page, "offline")).toBeVisible();
    await expect(
      page.getByText("Thay đổi chỉ được giữ trong bộ nhớ trang này.", { exact: false }),
    ).toBeVisible();
    await wait(1000);
    expect(requests).toHaveLength(0);
    expect(await rows(harness, attempt)).toEqual([]);
    await page.context().setOffline(false);
    await expect(phase(page, "saved")).toBeVisible();
    expect(requests).toHaveLength(1);
    expect((await rows(harness, attempt))[0].version).toBe(1);
    observations.push({
      scope: "offline",
      width: 768,
      offlineWrites: 0,
      reconnectWrites: 1,
      memoryOnlyLabeled: true,
      finalVersion: 1,
    });
  } finally {
    await page.context().setOffline(false);
  }
});

test("S4 real stale version409 shows conflict and never overwrites the acknowledged answer", async ({
  page,
  harness,
  exams,
  candidate: _candidate,
}) => {
  const attempt = await start(page, exams.small);
  const requests = saves(page, attempt);
  const questionResponse = await harness.request(
    page.context(),
    "GET",
    `/v1/attempts/${attempt.id}/questions`,
  );
  expect(questionResponse.status).toBe(200);
  const question = JSON.parse(questionResponse.text).data[0];
  await wait(425);
  const prior = await harness.request(
    page.context(),
    "PUT",
    answerPath(attempt),
    {
      answers: [
        {
          questionId: question.id,
          selectedOptionIds: [question.options[0].id],
          marked: true,
          expectedVersion: 0,
        },
      ],
    },
    { "idempotency-key": requestKey() },
  );
  expect(prior.status).toBe(200);
  const denied = reply(page, attempt);
  await page.getByRole("radio", { name: "Lựa chọn B", exact: true }).check();
  expect((await denied).status()).toBe(409);
  await expect(phase(page, "conflict")).toBeVisible();
  const conflict = page.getByRole("dialog", { name: "Đáp án đã thay đổi ở nơi khác" });
  await expect(conflict).toContainText("Lựa chọn B");
  await expect(conflict).toContainText("Lựa chọn A");
  await expect(
    conflict.getByRole("button", { name: "Dùng bản máy chủ", exact: true }),
  ).toBeEnabled();
  await expect(page.getByRole("radio", { name: "Lựa chọn B", exact: true })).toBeDisabled();
  await wait(1500);
  expect(requests).toHaveLength(1);
  expect((await rows(harness, attempt))[0]).toMatchObject({
    version: 1,
    marked: true,
    selected: [question.options[0].id],
  });
  observations.push({
    scope: "409",
    actualStaleVersion: true,
    automaticOverwrites: 0,
    serverVersion: 1,
    compareReady: true,
    decisionDeferred: true,
  });
});
