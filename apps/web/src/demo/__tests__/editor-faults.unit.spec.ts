import { expect, it } from "vitest";

import { createDemoServer } from "../server";

async function setup() {
  const server = createDemoServer({
    now: () => Date.parse("2026-10-12T00:00:00Z"),
    sleep: async () => undefined,
  });
  await server.api.login({ email: "candidate@example.test", password: "fixture-password-ok" });
  server.extras.setPermissions("admin");
  const exam = (await server.api.listAdminExams({ pageSize: 1 })).data.items[0]!;
  return { ...server, exam };
}
it("keeps one publication receipt after a synthetic lost acknowledgement and exact retry", async () => {
  const { api, extras, exam } = await setup();
  extras.setFault("lose-ack");
  const body = { expectedRevision: exam.revision };
  await expect(api.publishExam(exam.id, "publish-test", body)).rejects.toMatchObject({
    kind: "network",
  });
  const replay = await api.publishExam(exam.id, "publish-test", body);
  expect(replay.data.revision).toBe(exam.revision + 1);
  expect((await api.getAdminExam(exam.id)).data.revision).toBe(exam.revision + 1);
});
it("exposes an actual changed synthetic projection for conflict comparison without overwriting with local edits", async () => {
  const { api, extras, exam } = await setup();
  const {
    title,
    category,
    durationSeconds,
    openAt,
    closeAt,
    displayTimezone,
    attemptLimit,
    explanationPolicy,
    leaderboardEnabled,
    sections,
  } = exam;
  extras.setFault("conflict-save");
  await expect(
    api.replaceExamDraft(exam.id, "replace-test", {
      title: "Local",
      category,
      durationSeconds,
      openAt,
      closeAt,
      displayTimezone,
      attemptLimit,
      explanationPolicy,
      leaderboardEnabled,
      sections,
      expectedRevision: exam.revision,
    }),
  ).rejects.toMatchObject({ status: 409 });
  const latest = (await api.getAdminExam(exam.id)).data;
  expect(latest.title).toBe(title);
  expect(latest.revision).toBe(exam.revision + 1);
  expect(latest.durationSeconds).not.toBe(durationSeconds);
});
