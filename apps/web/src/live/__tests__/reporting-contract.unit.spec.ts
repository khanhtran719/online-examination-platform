import { expect, it } from "vitest";

import { createHttpApi } from "../create-http-api";

const id = "019a82d0-3000-7000-8000-000000000001";
const asOf = "2026-10-12T03:00:00.000Z";
function adapter(data: unknown, metadata?: unknown) {
  const paths: string[] = [];
  const handle = createHttpApi(async (url) => {
    paths.push(String(url));
    return new Response(
      JSON.stringify({
        data,
        errorCode: null,
        message: null,
        status: true,
        ...(metadata === undefined ? {} : { metadata }),
      }),
      { status: 200 },
    );
  });
  return { ...handle, paths };
}
const statistic = {
  questionId: id,
  completedAttempts: 80,
  answered: 74,
  correct: 50,
  incorrect: 24,
  unanswered: 6,
  options: [{ optionId: id, selectedCount: 60 }],
};
export const business = {
  asOf,
  window: { from: "2026-10-11T03:00:00.000Z", to: asOf, basis: "ATTEMPT_STARTED_AT" },
  counts: {
    startedAttempts: 240,
    activeAttempts: 24,
    submittedAttempts: 216,
    completedAttempts: 180,
    failedAttempts: 6,
    expiredSubmissions: 14,
    expiredCompletedAttempts: 12,
  },
  backlog: {
    pendingAttempts: 36,
    replayPendingAttempts: 3,
    oldestSubmittedAt: "2026-10-12T02:30:00.000Z",
    oldestAgeSeconds: 1800,
  },
};
it("reads active candidates with the actual per-page server watermark", async () => {
  const h = adapter(
    [
      {
        candidateId: id,
        attemptId: id,
        status: "IN_PROGRESS",
        startedAt: "2026-10-12T02:00:00.000Z",
        deadline: "2026-10-12T04:00:00.000Z",
      },
    ],
    { next: null, pageSize: 20, asOf },
  );
  await expect(h.api.listActiveCandidates(id, { pageSize: 20 })).resolves.toMatchObject({
    data: { asOf, items: [{ status: "IN_PROGRESS" }] },
  });
});
it("reads answered from the implemented statistics DTO without dropping it", async () => {
  const h = adapter([statistic], { next: null, pageSize: 20 });
  await expect(h.api.getQuestionStatistics(id, id, {})).resolves.toMatchObject({
    data: { items: [{ answered: 74 }] },
  });
});
it("uses the implemented business endpoint, preserving cohort and global backlog", async () => {
  const h = adapter(business);
  await expect(h.api.getBusinessMetrics()).resolves.toMatchObject({ data: business });
  expect(h.paths).toEqual(["/v1/admin/business-metrics"]);
});
it.each([
  { ...business, counts: { ...business.counts, activeAttempts: -1 } },
  { ...business, backlog: { ...business.backlog, oldestAgeSeconds: 1 } },
  { ...business, window: { ...business.window, basis: "SUBMITTED_AT" } },
  { ...business, secret: "unexpected" },
])("fails closed on malformed business metrics %j", async (data) => {
  await expect(adapter(data).api.getBusinessMetrics()).rejects.toMatchObject({ kind: "malformed" });
});
it.each([
  { ...statistic, answered: 75 },
  { ...statistic, options: [{ optionId: id, selectedCount: 75 }] },
  { ...statistic, completedAttempts: -1 },
])("rejects inconsistent statistics instead of drawing misleading ratios %j", async (row) => {
  await expect(
    adapter([row], { next: null, pageSize: 20 }).api.getQuestionStatistics(id, id, {}),
  ).rejects.toMatchObject({ kind: "malformed" });
});
it("does not widen generic page metadata or accept inactive rows as active", async () => {
  await expect(
    adapter([statistic], { next: null, pageSize: 20, asOf }).api.getQuestionStatistics(id, id, {}),
  ).rejects.toMatchObject({ kind: "malformed" });
  await expect(
    adapter(
      [{ candidateId: id, attemptId: id, status: "CREATED", startedAt: asOf, deadline: asOf }],
      { next: null, pageSize: 20, asOf },
    ).api.listActiveCandidates(id, {}),
  ).rejects.toMatchObject({ kind: "malformed" });
});
