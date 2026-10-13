import { expect, it } from "vitest";

import { parseBusinessMetrics, parseQuestionStatistic } from "../../shared/api/parse";
import { createDemoServer } from "../server";

it("orders synthetic audit rows by occurredAt/id descending like the read contract", async () => {
  const server = createDemoServer();
  await server.api.login({ email: "candidate@example.test", password: "fixture-password-ok" });
  server.extras.setPermissions("admin");
  const rows = (await server.api.getAudit({})).data.items;
  expect(rows.map((r) => r.id)).toEqual(
    [...rows]
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id.localeCompare(a.id))
      .map((r) => r.id),
  );
});

it("derives valid business snapshots and statistics from the synthetic attempts", async () => {
  const server = createDemoServer();
  await server.api.login({ email: "candidate@example.test", password: "fixture-password-ok" });
  server.extras.setPermissions("admin");
  const metrics = (await server.api.getBusinessMetrics()).data;
  expect(parseBusinessMetrics(metrics)).toEqual(metrics);
  const exams = (await server.api.listAdminExams({})).data.items;
  for (const exam of exams) {
    const active = (await server.api.listActiveCandidates(exam.id, {})).data;
    expect(active.asOf).toBeTruthy();
    expect(active.items.every((a) => a.status === "IN_PROGRESS" && a.deadline > active.asOf)).toBe(
      true,
    );
    if (exam.publishedVersionId) {
      const rows = (await server.api.getQuestionStatistics(exam.id, exam.publishedVersionId, {}))
        .data.items;
      for (const row of rows) expect(parseQuestionStatistic(row)).toEqual(row);
    }
  }
});
it("does not duplicate a replay after lost ACK and still checks current permissions", async () => {
  const server = createDemoServer({ sleep: async () => undefined });
  const { api, extras } = server;
  await api.login({ email: "candidate@example.test", password: "fixture-password-ok" });
  extras.setPermissions("admin");
  const id = "00000000-0000-4000-8000-000000000403";
  const revision = extras.replayRevision(id)!;
  const body = { expectedRevision: revision, reason: "Phụ thuộc đã khôi phục." };
  extras.setFault("lose-ack");
  await expect(api.replayFailedAttempt(id, "replay-original", body)).rejects.toMatchObject({
    kind: "network",
  });
  expect((await api.replayFailedAttempt(id, "replay-original", body)).data.accepted).toBe(true);
  expect(extras.replayRevision(id)).toBe(revision + 1);
  extras.setPermissions("reviewer");
  await expect(api.replayFailedAttempt(id, "replay-original", body)).rejects.toMatchObject({
    status: 403,
  });
});
