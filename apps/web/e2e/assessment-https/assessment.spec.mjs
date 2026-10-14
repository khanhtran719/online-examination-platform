import { mkdir, writeFile } from "node:fs/promises";

import AxeBuilder from "@axe-core/playwright";

import { verifiedAccount } from "../catalog-https/fixtures.mjs";

import { expect, requestKey, test } from "./fixtures.mjs";

const observations = [];
const prompt = (number) => `Câu HTTPS ${number}: chọn đáp án.`;
const responseFor = (page, path, method = "GET") =>
  page.waitForResponse(
    (r) => new URL(r.url()).pathname === path && r.request().method() === method,
  );
const button = (page, name) => page.getByRole("button", { name, exact: true });

async function safeRead(response) {
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["x-correlation-id"]).toBeTruthy();
  const value = await response.json();
  expect(value.status).toBe(true);
  expect(JSON.stringify(value)).not.toMatch(
    /PRIVATE_ASSESSMENT|correctOption|earnedPoints|percentageBasisPoints/,
  );
  return value;
}

async function start(page, exam) {
  await page.goto(`/exams/${exam.id}`);
  await expect(page.getByRole("heading", { name: exam.body.title, exact: true })).toBeVisible();
  await button(page, "Bắt đầu").click();
  const receipt = responseFor(page, `/v1/exams/${exam.id}/attempts`, "POST");
  await page.getByRole("dialog").getByRole("button", { name: "Bắt đầu", exact: true }).click();
  const response = await receipt;
  expect(response.status()).toBe(201);
  const attempt = (await response.json()).data;
  await expect(page).toHaveURL(new RegExp(`/attempts/${attempt.id}$`));
  await expect(page.getByRole("heading", { name: prompt(1), exact: true })).toBeVisible();
  return attempt;
}

async function save(page, attempt, action) {
  const receipt = responseFor(page, `/v1/attempts/${attempt.id}/answers`, "PUT");
  await action();
  const response = await receipt;
  expect(response.status()).toBe(200);
  const ack = (await response.json()).data;
  expect(ack.attemptId).toBe(attempt.id);
  expect(ack.answers.length).toBeGreaterThan(0);
  await expect(page.locator('[role="status"][data-phase="saved"]')).toBeVisible();
  return ack;
}

async function stored(harness, attempt, question) {
  const result = await harness.fixture.query(
    `
    SELECT
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
      AND a.question_id = $2
    GROUP BY
      a.version,
      a.marked
    `,
    [attempt.id, question.id],
  );
  expect(result.rowCount).toBe(1);
  return result.rows[0];
}

async function navigator(page, width) {
  if (width > 1024) return page.getByRole("complementary", { name: "Phiếu câu hỏi" });
  await button(page, "Danh sách câu hỏi").click();
  return page.getByRole("dialog", { name: "Phiếu câu hỏi" });
}

test.afterAll(async () => {
  await mkdir("../../.local/web-evidence/web-04", { recursive: true });
  await writeFile(
    "../../.local/web-evidence/web-04/observations.json",
    JSON.stringify(observations, null, 2),
  );
});

for (const width of [768, 1024, 1280, 1440]) {
  test(`A3 actual native answers, marks, clear and durable reload at${width}`, async ({
    page,
    harness,
    exams,
    candidate: _candidate,
  }) => {
    await page.setViewportSize({ width, height: 1100 });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const attempt = await start(page, exams.small);
    await expect(
      page.getByRole("heading", { name: exams.small.body.title, exact: true }),
    ).toBeVisible();
    const questionResponse = await harness.request(
      page.context(),
      "GET",
      `/v1/attempts/${attempt.id}/questions`,
    );
    expect(questionResponse.status).toBe(200);
    const questions = JSON.parse(questionResponse.text).data;
    expect(questions).toHaveLength(3);
    expect(JSON.stringify(questions)).not.toMatch(/PRIVATE_ASSESSMENT|correctOption/);
    await expect(page.getByRole("radio").first()).not.toBeChecked();
    await expect(button(page, "Xóa đáp án")).toBeDisabled();
    const empty = await harness.request(
      page.context(),
      "GET",
      `/v1/attempts/${attempt.id}/answers`,
    );
    expect(JSON.parse(empty.text).data).toEqual([]);
    await save(page, attempt, () =>
      page.getByRole("radio", { name: "Lựa chọn B", exact: true }).check(),
    );
    expect((await stored(harness, attempt, questions[0])).selected).toEqual([
      questions[0].options[1].id,
    ]);
    await button(page, "Câu sau").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: prompt(2), exact: true })).toBeFocused();
    // Batch local edits; the receipt and PostgreSQL state must agree on both selections and mark.
    await save(page, attempt, async () => {
      await page.getByRole("checkbox", { name: "Lựa chọn A", exact: true }).check();
      await page.getByRole("checkbox", { name: "Lựa chọn B", exact: true }).check();
      await page.getByRole("checkbox", { name: "Đánh dấu để xem lại", exact: true }).check();
    });
    await expect
      .poll(async () => (await stored(harness, attempt, questions[1])).selected.length)
      .toBe(2);
    const multiple = await stored(harness, attempt, questions[1]);
    expect(multiple.marked).toBe(true);
    expect([...multiple.selected].sort()).toEqual(questions[1].options.map((o) => o.id).sort());
    await save(page, attempt, () => button(page, "Xóa đáp án").click());
    const cleared = await stored(harness, attempt, questions[1]);
    expect(cleared.selected).toEqual([]);
    expect(cleared.marked).toBe(true);
    expect(cleared.version).toBeGreaterThan(multiple.version);
    await expect(
      page.getByRole("checkbox", { name: "Đánh dấu để xem lại", exact: true }),
    ).toBeChecked();
    await expect(button(page, "Xóa đáp án")).toBeDisabled();
    let sheet = await navigator(page, width);
    await sheet.getByRole("checkbox", { name: "Chỉ xem câu đánh dấu" }).check();
    await expect(sheet.getByRole("button", { name: /^Câu \d+,/ })).toHaveCount(1);
    await expect(sheet.getByRole("button", { name: /^Câu 2,/ })).toBeVisible();
    await sheet.getByRole("checkbox", { name: "Chỉ xem câu đánh dấu" }).uncheck();
    await sheet.getByRole("button", { name: "Phần HTTPS 2", exact: true }).click();
    await expect(page.getByRole("heading", { name: prompt(3), exact: true })).toBeFocused();
    await save(page, attempt, () => page.getByRole("radio", { name: "Sai", exact: true }).check());
    expect((await stored(harness, attempt, questions[2])).selected).toEqual([
      questions[2].options[1].id,
    ]);
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(axe.violations.map((v) => v.id)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    const resume = responseFor(page, `/v1/attempts/${attempt.id}`);
    await page.reload();
    const restored = (await safeRead(await resume)).data;
    expect(restored.deadline).toBe(attempt.deadline);
    expect(restored.publishedVersionId).toBe(attempt.publishedVersionId);
    await expect(page.getByRole("radio", { name: "Lựa chọn B", exact: true })).toBeChecked();
    await expect(page.getByText("Chưa có tên của phiên bản này.", { exact: false })).toBeVisible();
    sheet = await navigator(page, width);
    await sheet.getByRole("button", { name: /^Câu 2,/ }).click();
    await expect(
      page.getByRole("checkbox", { name: "Đánh dấu để xem lại", exact: true }),
    ).toBeChecked();
    await expect(page.getByRole("checkbox", { name: "Lựa chọn A", exact: true })).not.toBeChecked();
    await expect(page.getByRole("checkbox", { name: "Lựa chọn B", exact: true })).not.toBeChecked();
    expect(errors).toEqual([]);
    observations.push({
      scope: "native",
      width,
      durable: true,
      clearedMarkPreserved: true,
      frozenDeadline: true,
      fallbackMetadata: true,
      axeViolations: 0,
      pageErrors: 0,
    });
  });
}

test("A3 explicit question and answer pages retain global ordinals and scoped cursors", async ({
  page,
  harness,
  exams,
  candidate: _candidate,
}) => {
  const attempt = await start(page, exams.paged);
  const allResponse = await harness.request(
    page.context(),
    "GET",
    `/v1/attempts/${attempt.id}/questions?pageSize=100`,
  );
  expect(allResponse.status).toBe(200);
  const all = JSON.parse(allResponse.text).data;
  expect(all).toHaveLength(23);
  const commands = all.slice(0, 21).map((q) => ({
    questionId: q.id,
    selectedOptionIds: [q.options[0].id],
    marked: false,
    expectedVersion: 0,
  }));
  for (const answers of [commands.slice(0, 20), commands.slice(20)]) {
    await new Promise((done) => setTimeout(done, 425));
    const saved = await harness.request(
      page.context(),
      "PUT",
      `/v1/attempts/${attempt.id}/answers`,
      { answers },
      { "idempotency-key": requestKey() },
    );
    expect(saved.status).toBe(200);
  }
  const questionReads = [];
  const answerReads = [];
  page.on("response", (r) => {
    if (r.request().method() !== "GET") return;
    if (new URL(r.url()).pathname === `/v1/attempts/${attempt.id}/questions`) questionReads.push(r);
    if (new URL(r.url()).pathname === `/v1/attempts/${attempt.id}/answers`) answerReads.push(r);
  });
  await page.reload();
  await expect(page.getByRole("radio", { name: "Lựa chọn A", exact: true })).toBeChecked();
  const sheet = page.getByRole("complementary", { name: "Phiếu câu hỏi" });
  await expect(sheet.getByRole("button", { name: /^Câu \d+,/ })).toHaveCount(20);
  expect(questionReads).toHaveLength(1);
  expect(answerReads).toHaveLength(1);
  const firstQuestions = await safeRead(questionReads[0]);
  const firstAnswers = await safeRead(answerReads[0]);
  expect(firstQuestions.data).toHaveLength(20);
  expect(firstAnswers.data).toHaveLength(20);
  const invalid = await harness.request(
    page.context(),
    "GET",
    `/v1/attempts/${attempt.id}/questions?pageSize=19&cursor=${encodeURIComponent(firstQuestions.metadata.nextCursor)}`,
  );
  expect(invalid.status).toBe(400);
  const wrongKind = await harness.request(
    page.context(),
    "GET",
    `/v1/attempts/${attempt.id}/answers?pageSize=20&cursor=${encodeURIComponent(firstQuestions.metadata.nextCursor)}`,
  );
  expect(wrongKind.status).toBe(400);
  await button(page, "Tải thêm câu").click();
  await expect(sheet.getByRole("button", { name: /^Câu \d+,/ })).toHaveCount(23);
  await expect(button(page, "Tải thêm câu")).toHaveCount(0);
  expect(questionReads).toHaveLength(2);
  expect(answerReads).toHaveLength(2);
  expect((await safeRead(questionReads[1])).data).toHaveLength(3);
  expect((await safeRead(answerReads[1])).data).toHaveLength(1);
  await sheet.getByRole("button", { name: /^Câu 23,/ }).click();
  await expect(page.getByRole("heading", { name: prompt(23), exact: true })).toBeFocused();
  await expect(page.getByText("Câu 23 · Một lựa chọn · 2 điểm", { exact: true })).toBeVisible();
  await expect(page.getByRole("radio").first()).not.toBeChecked();
  await expect(button(page, "Xóa đáp án")).toBeDisabled();
  observations.push({
    scope: "pagination",
    firstQuestions: 20,
    firstAnswers: 20,
    finalQuestions: 23,
    questionReads: 2,
    answerReads: 2,
    emptyKnown: true,
    cursorBound: true,
  });
});

test("A4 active start replay and API restart keep one durable attempt and original deadline", async ({
  page,
  harness,
  exams,
  candidate,
}) => {
  const attempt = await start(page, exams.small);
  const continued = await start(page, exams.small);
  expect(continued.id).toBe(attempt.id);
  expect(continued.deadline).toBe(attempt.deadline);
  const key = requestKey();
  const call = () =>
    harness.request(page.context(), "POST", `/v1/exams/${exams.small.id}/attempts`, undefined, {
      "idempotency-key": key,
    });
  await new Promise((done) => setTimeout(done, 425));
  const active = await call();
  expect(active.status).toBe(201);
  expect(JSON.parse(active.text).data.id).toBe(attempt.id);
  await new Promise((done) => setTimeout(done, 425));
  const replay = await call();
  expect(replay.status).toBe(201);
  expect(replay.headers["idempotency-replayed"]).toBe("true");
  expect(JSON.parse(replay.text).data).toEqual(JSON.parse(active.text).data);
  await save(page, attempt, () =>
    page.getByRole("radio", { name: "Lựa chọn A", exact: true }).check(),
  );
  await harness.restart();
  const resume = responseFor(page, `/v1/attempts/${attempt.id}`);
  await page.reload();
  const restored = (await safeRead(await resume)).data;
  expect(restored.deadline).toBe(attempt.deadline);
  expect(restored.id).toBe(attempt.id);
  await expect(page.getByRole("radio", { name: "Lựa chọn A", exact: true })).toBeChecked();
  const count = await harness.fixture.query(
    `
    SELECT
      count(*)::integer AS n
    FROM
      assessment.attempts
    WHERE
      user_id = $1
      AND exam_id = $2
    `,
    [candidate.id, exams.small.id],
  );
  expect(count.rows[0].n).toBe(1);
  observations.push({
    scope: "resume",
    activeSameId: true,
    replay201: true,
    attempts: 1,
    restartDurableAnswer: true,
    deadlineUnchanged: true,
  });
});

test("A4 republish changes new attempts while existing attempt keeps frozen question and deadline", async ({
  page,
  harness,
  exams,
  candidate: _candidate,
}) => {
  const old = await start(page, exams.frozen);
  const bank = exams.questions[0];
  await exams.write("PUT", `/v1/admin/questions/${bank.resourceId}`, {
    ...bank.body,
    expectedRevision: bank.revision,
    prompt: "Câu phiên bản mới HTTPS.",
    options: [
      { position: 1, text: "Mới A" },
      { position: 2, text: "Mới B" },
    ],
  });
  const draft = await exams.write("PUT", `/v1/admin/exams/${exams.frozen.id}`, {
    ...exams.frozen.body,
    title: "Đề HTTPS phiên bản mới",
    expectedRevision: exams.frozen.revision,
  });
  await exams.write("POST", `/v1/admin/exams/${exams.frozen.id}/publish`, {
    expectedRevision: draft.revision,
  });
  const resume = responseFor(page, `/v1/attempts/${old.id}`);
  await page.reload();
  const restored = (await safeRead(await resume)).data;
  expect(restored.publishedVersionId).toBe(old.publishedVersionId);
  expect(restored.deadline).toBe(old.deadline);
  await expect(page.getByRole("heading", { name: prompt(1), exact: true })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Lựa chọn A", exact: true })).toBeVisible();
  await expect(page.getByText("Câu phiên bản mới HTTPS.", { exact: true })).toHaveCount(0);
  // An independently verified candidate proves that the new publication is usable.
  const other = await page.context().browser().newContext();
  try {
    for (const suffix of ["", "/questions", "/answers"]) {
      const denied = await harness.request(other, "GET", `/v1/attempts/${old.id}${suffix}`);
      expect(denied.status).toBe(401);
      expect(denied.text).not.toContain(prompt(1));
    }
    const account = await verifiedAccount(harness, other);
    expect((await harness.request(other, "POST", "/v1/auth/login", account)).status).toBe(200);
    const created = await harness.request(
      other,
      "POST",
      `/v1/exams/${exams.frozen.id}/attempts`,
      undefined,
      { "idempotency-key": requestKey() },
    );
    expect(created.status).toBe(201);
    const fresh = JSON.parse(created.text).data;
    expect(fresh.publishedVersionId).not.toBe(old.publishedVersionId);
    const questions = await harness.request(other, "GET", `/v1/attempts/${fresh.id}/questions`);
    expect(questions.status).toBe(200);
    expect(JSON.parse(questions.text).data[0].prompt).toBe("Câu phiên bản mới HTTPS.");
    for (const suffix of ["", "/questions", "/answers"]) {
      const denied = await harness.request(other, "GET", `/v1/attempts/${old.id}${suffix}`);
      expect(denied.status).toBe(404);
      expect(denied.text).not.toContain(prompt(1));
    }
    const otherPage = await other.newPage();
    const deniedRoom = responseFor(otherPage, `/v1/attempts/${old.id}`);
    await otherPage.goto(`${harness.origin}/attempts/${old.id}`);
    expect((await deniedRoom).status()).toBe(404);
    await expect(otherPage.getByRole("heading", { name: "Phòng thi", exact: true })).toBeVisible();
    await expect(otherPage.getByRole("radio")).toHaveCount(0);
    await expect(otherPage.getByText(prompt(1), { exact: true })).toHaveCount(0);
  } finally {
    await other.close();
  }
  observations.push({
    scope: "publication",
    oldFrozen: true,
    newVersionDifferent: true,
    oldDeadlineUnchanged: true,
    nonowner404: 3,
    anonymous401: 3,
    nonownerBrowserHidden: true,
  });
});

test("A4 real permission revocation hides the loaded room and blocks private reads", async ({
  page,
  harness,
  exams,
  candidate,
}) => {
  const attempt = await start(page, exams.small);
  await harness.fixture.query(
    `
    DELETE FROM
      identity.user_roles
    WHERE
      user_id = $1
    `,
    [candidate.id],
  );
  const denied = responseFor(page, `/v1/attempts/${attempt.id}/answers`, "PUT");
  await page.getByRole("radio", { name: "Lựa chọn A", exact: true }).check();
  expect((await denied).status()).toBe(403);
  await expect(page.getByRole("heading", { name: "Phòng thi", exact: true })).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(0);
  await expect(page.getByText(prompt(1), { exact: true })).toHaveCount(0);
  for (const suffix of ["", "/questions", "/answers"]) {
    const response = await harness.request(
      page.context(),
      "GET",
      `/v1/attempts/${attempt.id}${suffix}`,
    );
    expect(response.status).toBe(403);
  }
  observations.push({
    scope: "permission",
    resume403: true,
    questions403: true,
    answers403: true,
    hidden: true,
  });
});
